import mongoose from "mongoose";
import { SaleReturn } from "../models/saleReturn.model.js";
import { Sale } from "../models/sale.model.js";
import { CashbookEntry } from "../models/cashbookEntry.model.js";
import { MobileUnit } from "../models/mobileUnit.model.js";
import { returnStock } from "./inventory.service.js";
import { ApiError } from "../utils/ApiError.js";
import { assertValidObjectId } from "../utils/validateObjectId.js";
import { getPagination, buildPaginationMeta } from "../utils/pagination.js";

const createSaleReturn = async (data, user) => {
  const shopId = user?.shopId;
  if (!shopId) throw new ApiError(401, "Unauthorized shop access");

  const { saleId, items, reason, type } = data;
  assertValidObjectId(saleId, "saleId");

  const sale = await Sale.findOne({ _id: saleId, shopId });
  if (!sale) throw new ApiError(404, "Sale not found");

  const totalRefund = items.reduce((s, i) => s + (i.refundAmount || 0), 0);
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const saleReturn = await SaleReturn.create(
      [
        {
          shopId,
          saleId,
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
      await returnStock(
        {
          productId: item.productId,
          quantity: item.quantity,
          note: `Return for sale ${sale.invoiceNumber}`,
          shopId,
        },
        session,
      );

      if (item.imeiIds?.length) {
        await MobileUnit.updateMany(
          { _id: { $in: item.imeiIds }, shopId },
          { $set: { status: "returned", sellingDate: undefined } },
          { session },
        );
      }
    }

    await CashbookEntry.create(
      [
        {
          shopId,
          type: "out",
          category: "refund",
          amount: totalRefund,
          note: reason || "Sale return refund",
          referenceId: saleReturn[0]._id,
          referenceType: "SaleReturn",
          entryDate: new Date(),
          createdBy: user._id,
        },
      ],
      { session },
    );

    await session.commitTransaction();
    return saleReturn[0];
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
      .populate("saleId", "invoiceNumber")
      .populate("customerId", "name phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    SaleReturn.countDocuments({ shopId }),
  ]);

  return { returns, pagination: buildPaginationMeta(total, page, limit) };
};

export { createSaleReturn, listSaleReturns };
