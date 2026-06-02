import mongoose from "mongoose";
import { Product } from "../models/product.model.js";
import { InventoryTransaction } from "../models/inventoryTransaction.model.js";
import { ApiError } from "../utils/ApiError.js";
import { assertValidObjectId } from "../utils/validateObjectId.js";
import { getPagination, buildPaginationMeta } from "../utils/pagination.js";
import { recordStockPurchaseBill } from "./finance.service.js";

const getProductForStockOp = async (productId, shopId, session) => {
  const product = await Product.findOne({ _id: productId, shopId }).session(session);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }
  return product;
};

const createInventoryTransaction = async (
  {
    shopId,
    productId,
    type,
    quantity,
    previousStock,
    newStock,
    note,
    referenceId,
    referenceType,
  },
  session,
) => {
  const [transaction] = await InventoryTransaction.create(
    [
      {
        productId,
        shopId,
        type,
        quantity,
        previousStock,
        newStock,
        note,
        referenceId,
        referenceType,
      },
    ],
    { session },
  );
  return transaction;
};

const addStock = async (
  {
    productId,
    quantity,
    note,
    shopId,
    purchasePaymentType,
    supplierBillNumber,
    paidAmount,
  },
  user = null,
  session = null,
) => {
  assertValidObjectId(productId, "productId");

  if (!quantity || quantity <= 0) {
    throw new ApiError(400, "Quantity must be greater than 0");
  }

  const run = async (activeSession) => {
    const product = await getProductForStockOp(productId, shopId, activeSession);

    if (product.hasIMEI) {
      throw new ApiError(
        400,
        "IMEI-tracked products must use mobile unit registration to add stock",
      );
    }

    const previousStock = product.currentStock;
    const newStock = previousStock + quantity;

    product.currentStock = newStock;
    await product.save({ session: activeSession });

    const transaction = await createInventoryTransaction(
      {
        productId,
        shopId,
        type: "add",
        quantity,
        previousStock,
        newStock,
        note: note || "Stock added",
      },
      activeSession,
    );

    return { product, transaction };
  };

  const finish = async (result) => {
    if (user && result?.product) {
      const { product, transaction } = result;
      await recordStockPurchaseBill(
        {
          purchasePaymentType,
          supplierBillNumber,
          paidAmount,
          supplierId: product.supplier,
          totalAmount: quantity * product.purchasePrice,
          items: [
            {
              description: `${product.name} (restock)`,
              quantity,
              unitCost: product.purchasePrice,
              amount: quantity * product.purchasePrice,
            },
          ],
          note: transaction.note,
        },
        user,
      );
    }
    return result;
  };

  if (session) {
    const result = await run(session);
    return finish(result);
  }

  const localSession = await mongoose.startSession();
  localSession.startTransaction();
  try {
    const result = await run(localSession);
    await localSession.commitTransaction();
    return finish(result);
  } catch (error) {
    await localSession.abortTransaction();
    throw error;
  } finally {
    localSession.endSession();
  }
};

const reduceStock = async (
  {
    productId,
    quantity,
    type = "sale",
    note,
    referenceId,
    referenceType,
    shopId,
  },
  session,
) => {
  assertValidObjectId(productId, "productId");

  if (!quantity || quantity <= 0) {
    throw new ApiError(400, "Quantity must be greater than 0");
  }

  if (!session) {
    throw new ApiError(500, "Session required for stock reduction");
  }

  const product = await getProductForStockOp(productId, shopId, session);

  if (product.currentStock < quantity) {
    throw new ApiError(
      400,
      `Insufficient stock for ${product.name}. Available: ${product.currentStock}`,
    );
  }

  const previousStock = product.currentStock;
  const newStock = previousStock - quantity;

  product.currentStock = newStock;
  await product.save({ session });

  const transaction = await createInventoryTransaction(
    {
      productId,
      shopId,
      type,
      quantity,
      previousStock,
      newStock,
      note,
      referenceId,
      referenceType,
    },
    session,
  );

  return { product, transaction };
};

const returnStock = async (
  { productId, quantity, note, referenceId, referenceType, shopId },
  session = null,
) => {
  assertValidObjectId(productId, "productId");

  if (!quantity || quantity <= 0) {
    throw new ApiError(400, "Quantity must be greater than 0");
  }

  const run = async (activeSession) => {
    const product = await getProductForStockOp(productId, shopId, activeSession);

    if (product.hasIMEI) {
      throw new ApiError(
        400,
        "IMEI-tracked returns must update mobile unit status separately",
      );
    }

    const previousStock = product.currentStock;
    const newStock = previousStock + quantity;

    product.currentStock = newStock;
    await product.save({ session: activeSession });

    const transaction = await createInventoryTransaction(
      {
        productId,
        shopId,
        type: "return",
        quantity,
        previousStock,
        newStock,
        note: note || "Stock returned",
        referenceId,
        referenceType,
      },
      activeSession,
    );

    return { product, transaction };
  };

  if (session) {
    return run(session);
  }

  const localSession = await mongoose.startSession();
  localSession.startTransaction();
  try {
    const result = await run(localSession);
    await localSession.commitTransaction();
    return result;
  } catch (error) {
    await localSession.abortTransaction();
    throw error;
  } finally {
    localSession.endSession();
  }
};

const recordDamage = async (
  { productId, quantity, note, shopId },
  session = null,
) => {
  assertValidObjectId(productId, "productId");

  if (!quantity || quantity <= 0) {
    throw new ApiError(400, "Quantity must be greater than 0");
  }

  const run = async (activeSession) => {
    const product = await getProductForStockOp(productId, shopId, activeSession);

    if (product.currentStock < quantity) {
      throw new ApiError(400, "Cannot record damage exceeding current stock");
    }

    const previousStock = product.currentStock;
    const newStock = previousStock - quantity;

    product.currentStock = newStock;
    await product.save({ session: activeSession });

    const transaction = await createInventoryTransaction(
      {
        productId,
        shopId,
        type: "damage",
        quantity,
        previousStock,
        newStock,
        note: note || "Damaged stock",
      },
      activeSession,
    );

    return { product, transaction };
  };

  if (session) {
    return run(session);
  }

  const localSession = await mongoose.startSession();
  localSession.startTransaction();
  try {
    const result = await run(localSession);
    await localSession.commitTransaction();
    return result;
  } catch (error) {
    await localSession.abortTransaction();
    throw error;
  } finally {
    localSession.endSession();
  }
};

const syncImeiProductStock = async (productId, shopId, session) => {
  const { MobileUnit } = await import("../models/mobileUnit.model.js");
  const inStockCount = await MobileUnit.countDocuments({
    shopId,
    productId,
    status: "in_stock",
  }).session(session);

  const product = await getProductForStockOp(productId, shopId, session);
  product.currentStock = inStockCount;
  await product.save({ session });
  return product;
};

const getStockHistory = async (query, user) => {
  const { page, limit, skip } = getPagination(query);
  const shopId = user?.shopId;
  if (!shopId) throw new ApiError(401, "Unauthorized shop access");
  const filter = { shopId };

  if (query.productId) {
    assertValidObjectId(query.productId, "productId");
    filter.productId = query.productId;
  }

  if (query.type) {
    filter.type = query.type;
  }

  const [transactions, total] = await Promise.all([
    InventoryTransaction.find(filter)
      .populate("productId", "name brand category")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    InventoryTransaction.countDocuments(filter),
  ]);

  return {
    transactions,
    pagination: buildPaginationMeta(total, page, limit),
  };
};

const getLowStockProducts = async (user) => {
  const shopId = user?.shopId;
  if (!shopId) throw new ApiError(401, "Unauthorized shop access");
  const products = await Product.find({
    shopId,
    $expr: { $lte: ["$currentStock", "$lowStockThreshold"] },
  })
    .populate("supplier", "name phone")
    .sort({ currentStock: 1 })
    .lean();

  return products;
};

export {
  addStock,
  reduceStock,
  returnStock,
  recordDamage,
  syncImeiProductStock,
  getStockHistory,
  getLowStockProducts,
  createInventoryTransaction,
};
