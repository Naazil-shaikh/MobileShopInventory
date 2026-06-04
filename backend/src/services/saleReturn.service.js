import mongoose from "mongoose";
import { SaleReturn } from "../models/saleReturn.model.js";
import { Sale } from "../models/sale.model.js";
import { Product } from "../models/product.model.js";
import { CashbookEntry } from "../models/cashbookEntry.model.js";
import { MobileUnit } from "../models/mobileUnit.model.js";
import { returnStock, syncImeiProductStock } from "./inventory.service.js";
import { ApiError } from "../utils/ApiError.js";
import { assertValidObjectId } from "../utils/validateObjectId.js";
import { getPagination, buildPaginationMeta } from "../utils/pagination.js";

const getReturnedQtyByProduct = async (saleId, shopId, session = null) => {
  const query = SaleReturn.find({ saleId, shopId });
  const returns = session ? await query.session(session) : await query;
  const map = {};

  for (const r of returns) {
    for (const item of r.items) {
      const key = String(item.productId);
      map[key] = (map[key] || 0) + (item.quantity || 0);
    }
  }

  return map;
};

const getReturnedImeiIds = async (saleId, shopId, session = null) => {
  const query = SaleReturn.find({ saleId, shopId });
  const returns = session ? await query.session(session) : await query;
  const set = new Set();

  for (const r of returns) {
    for (const item of r.items) {
      for (const id of item.imeiIds || []) {
        set.add(String(id));
      }
    }
  }

  return set;
};

const applySaleReturnToInvoice = (sale, items, totalRefund) => {
  for (const item of items) {
    const line = sale.items.find(
      (s) => String(s.productId) === String(item.productId),
    );
    if (line) {
      line.returnedQuantity = (line.returnedQuantity || 0) + item.quantity;
    }
  }

  sale.totalRefunded = (sale.totalRefunded || 0) + totalRefund;
  sale.amountPaid = Math.max(0, (sale.amountPaid || 0) - totalRefund);
  sale.balanceDue = Math.max(
    0,
    sale.totalAmount - (sale.totalRefunded || 0) - (sale.amountPaid || 0),
  );
};

const validateReturnItems = async (sale, items, shopId, session) => {
  const alreadyReturned = await getReturnedQtyByProduct(sale._id, shopId, session);
  const returnedImeis = await getReturnedImeiIds(sale._id, shopId, session);

  for (const item of items) {
    if (!item.productId) throw new ApiError(400, "productId is required");
    assertValidObjectId(item.productId, "productId");
    const qty = Number(item.quantity);
    if (!qty || qty <= 0) {
      throw new ApiError(400, "Return quantity must be greater than 0");
    }

    const originalLine = sale.items.find(
      (s) => String(s.productId) === String(item.productId),
    );
    if (!originalLine) {
      throw new ApiError(400, "Returned product not found in original sale");
    }

    const previouslyReturned = alreadyReturned[String(item.productId)] || 0;
    if (previouslyReturned + qty > originalLine.quantity) {
      throw new ApiError(
        400,
        "Return quantity cannot exceed remaining purchased quantity on invoice",
      );
    }

    if (originalLine.imeiIds?.length) {
      if (!Array.isArray(item.imeiIds) || item.imeiIds.length !== qty) {
        throw new ApiError(
          400,
          "IMEI return must include exactly the same number of IMEIs as return quantity",
        );
      }

      const allowed = new Set(originalLine.imeiIds.map((id) => String(id)));
      for (const imeiId of item.imeiIds) {
        assertValidObjectId(imeiId, "imeiId");
        if (!allowed.has(String(imeiId))) {
          throw new ApiError(400, "Selected IMEI is not part of this invoice");
        }
        if (returnedImeis.has(String(imeiId))) {
          throw new ApiError(400, "This IMEI was already returned on the invoice");
        }
      }
    } else if (item.imeiIds?.length) {
      throw new ApiError(400, "This product does not have IMEI units on invoice");
    }
  }
};

const processReturnItems = async ({
  sale,
  items,
  totalRefund,
  reason,
  type,
  user,
  session,
}) => {
  const shopId = user.shopId;

  await validateReturnItems(sale, items, shopId, session);

  const [saleReturn] = await SaleReturn.create(
    [
      {
        shopId,
        saleId: sale._id,
        customerId: sale.customerId,
        items,
        totalRefund,
        reason,
        type: type || "return",
        processedBy: user._id,
      },
    ],
    { session },
  );

  for (const item of items) {
    const product = await Product.findOne({
      _id: item.productId,
      shopId,
    }).session(session);

    if (!product) {
      throw new ApiError(404, "Product not found for return");
    }

    if (product.hasIMEI) {
      if (item.imeiIds?.length) {
        await MobileUnit.updateMany(
          { _id: { $in: item.imeiIds }, shopId },
          { $set: { status: "returned", sellingDate: undefined } },
          { session },
        );
      }
      await syncImeiProductStock(item.productId, shopId, session);
    } else {
      await returnStock(
        {
          productId: item.productId,
          quantity: item.quantity,
          note: `Return for sale ${sale.invoiceNumber}`,
          shopId,
          referenceId: saleReturn._id,
          referenceType: "SaleReturn",
        },
        session,
      );
    }
  }

  applySaleReturnToInvoice(sale, items, totalRefund);
  await sale.save({ session });

  await CashbookEntry.create(
    [
      {
        shopId,
        type: "out",
        category: "refund",
        amount: totalRefund,
        note: reason || `Return for ${sale.invoiceNumber}`,
        referenceId: saleReturn._id,
        referenceType: "SaleReturn",
        entryDate: new Date(),
        createdBy: user._id,
      },
    ],
    { session },
  );

  return saleReturn;
};

const createSaleReturn = async (data, user) => {
  const shopId = user?.shopId;
  if (!shopId) throw new ApiError(401, "Unauthorized shop access");

  const { saleId, items, reason, type } = data;
  assertValidObjectId(saleId, "saleId");

  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, "Return must contain at least one item");
  }

  const sale = await Sale.findOne({ _id: saleId, shopId });
  if (!sale) throw new ApiError(404, "Sale not found");

  const totalRefund = items.reduce((s, i) => s + (i.refundAmount || 0), 0);
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const saleReturn = await processReturnItems({
      sale,
      items,
      totalRefund,
      reason,
      type,
      user,
      session,
    });

    await session.commitTransaction();
    return saleReturn;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const findSaleByImeiUnitId = async (unitId, shopId) => {
  return Sale.findOne({
    shopId,
    "items.imeiIds": unitId,
  });
};

const createReturnForImeiUnit = async (unitId, user, reason) => {
  const shopId = user?.shopId;
  if (!shopId) throw new ApiError(401, "Unauthorized shop access");
  assertValidObjectId(unitId, "unitId");

  const unit = await MobileUnit.findOne({ _id: unitId, shopId });
  if (!unit) throw new ApiError(404, "Mobile unit not found");
  if (unit.status !== "sold") {
    throw new ApiError(400, "Only sold devices can be returned against an invoice");
  }

  const sale = await findSaleByImeiUnitId(unitId, shopId);
  if (!sale) {
    throw new ApiError(
      404,
      "No invoice found for this IMEI. Use the Returns page if sold outside the system.",
    );
  }

  const line = sale.items.find((item) =>
    item.imeiIds?.some((id) => String(id) === String(unitId)),
  );
  if (!line) {
    throw new ApiError(404, "Invoice line for this IMEI not found");
  }

  const refundAmount = line.price;
  const items = [
    {
      productId: line.productId,
      quantity: 1,
      refundAmount,
      imeiIds: [unitId],
    },
  ];

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const saleReturn = await processReturnItems({
      sale,
      items,
      totalRefund: refundAmount,
      reason: reason || `IMEI return ${unit.imei}`,
      type: "return",
      user,
      session,
    });

    await session.commitTransaction();
    return { saleReturn, sale, unit };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const listSaleReturns = async (query, user) => {
  const shopId = user?.shopId;
  const { page, limit, skip } = getPagination(query);

  const [returns, total] = await Promise.all([
    SaleReturn.find({ shopId })
      .populate("saleId", "invoiceNumber totalAmount totalRefunded")
      .populate("customerId", "name phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    SaleReturn.countDocuments({ shopId }),
  ]);

  return { returns, pagination: buildPaginationMeta(total, page, limit) };
};

export {
  createSaleReturn,
  createReturnForImeiUnit,
  listSaleReturns,
  findSaleByImeiUnitId,
};
