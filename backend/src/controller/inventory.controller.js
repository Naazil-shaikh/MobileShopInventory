import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  addStock,
  reduceStock,
  returnStock,
  recordDamage,
  getStockHistory,
  getLowStockProducts,
} from "../services/inventory.service.js";
import mongoose from "mongoose";

const addStockHandler = asyncHandler(async (req, res) => {
  const data = await addStock(
    { ...req.body, shopId: req.user.shopId },
    req.user,
  );
  return res
    .status(200)
    .json(new ApiResponse(200, data, "Stock added successfully"));
});

const reduceStockHandler = asyncHandler(async (req, res) => {
  const { productId, quantity, note } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const data = await reduceStock(
      {
        productId,
        quantity,
        type: "damage",
        note: note || "Manual stock reduction",
        shopId: req.user.shopId,
      },
      session,
    );
    await session.commitTransaction();
    return res
      .status(200)
      .json(new ApiResponse(200, data, "Stock reduced successfully"));
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

const returnStockHandler = asyncHandler(async (req, res) => {
  const data = await returnStock({ ...req.body, shopId: req.user.shopId });
  return res
    .status(200)
    .json(new ApiResponse(200, data, "Stock returned successfully"));
});

const recordDamageHandler = asyncHandler(async (req, res) => {
  const data = await recordDamage({ ...req.body, shopId: req.user.shopId });
  return res
    .status(200)
    .json(new ApiResponse(200, data, "Damage recorded successfully"));
});

const getStockHistoryHandler = asyncHandler(async (req, res) => {
  const data = await getStockHistory(req.query, req.user);
  return res
    .status(200)
    .json(new ApiResponse(200, data, "Stock history fetched successfully"));
});

const getLowStockHandler = asyncHandler(async (req, res) => {
  const products = await getLowStockProducts(req.user);
  return res
    .status(200)
    .json(new ApiResponse(200, products, "Low stock products fetched"));
});

export {
  addStockHandler,
  reduceStockHandler,
  returnStockHandler,
  recordDamageHandler,
  getStockHistoryHandler,
  getLowStockHandler,
};
