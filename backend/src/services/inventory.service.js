import mongoose from "mongoose";
import { Product } from "../models/product.model.js";
import { InventoryTransaction } from "../models/inventoryTransaction.model.js";
import { ApiError } from "../utils/ApiError.js";
import { assertValidObjectId } from "../utils/validateObjectId.js";
import { getPagination, buildPaginationMeta } from "../utils/pagination.js";

const getProductForStockOp = async (productId, session) => {
  const product = await Product.findById(productId).session(session);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }
  return product;
};

const createInventoryTransaction = async (
  {
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
  { productId, quantity, note },
  session = null,
) => {
  assertValidObjectId(productId, "productId");

  if (!quantity || quantity <= 0) {
    throw new ApiError(400, "Quantity must be greater than 0");
  }

  const run = async (activeSession) => {
    const product = await getProductForStockOp(productId, activeSession);

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

const reduceStock = async (
  { productId, quantity, type = "sale", note, referenceId, referenceType },
  session,
) => {
  assertValidObjectId(productId, "productId");

  if (!quantity || quantity <= 0) {
    throw new ApiError(400, "Quantity must be greater than 0");
  }

  if (!session) {
    throw new ApiError(500, "Session required for stock reduction");
  }

  const product = await getProductForStockOp(productId, session);

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
  { productId, quantity, note, referenceId, referenceType },
  session = null,
) => {
  assertValidObjectId(productId, "productId");

  if (!quantity || quantity <= 0) {
    throw new ApiError(400, "Quantity must be greater than 0");
  }

  const run = async (activeSession) => {
    const product = await getProductForStockOp(productId, activeSession);

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

const recordDamage = async ({ productId, quantity, note }, session = null) => {
  assertValidObjectId(productId, "productId");

  if (!quantity || quantity <= 0) {
    throw new ApiError(400, "Quantity must be greater than 0");
  }

  const run = async (activeSession) => {
    const product = await getProductForStockOp(productId, activeSession);

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

const syncImeiProductStock = async (productId, session) => {
  const { MobileUnit } = await import("../models/mobileUnit.model.js");
  const inStockCount = await MobileUnit.countDocuments({
    productId,
    status: "in_stock",
  }).session(session);

  const product = await getProductForStockOp(productId, session);
  product.currentStock = inStockCount;
  await product.save({ session });
  return product;
};

const getStockHistory = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const filter = {};

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

const getLowStockProducts = async () => {
  const products = await Product.find({
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
