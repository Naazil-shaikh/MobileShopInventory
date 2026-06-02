import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createPurchaseOrder,
  updatePurchaseOrderStatus,
  listPurchaseOrders,
} from "../services/purchaseOrder.service.js";

const createHandler = asyncHandler(async (req, res) => {
  const order = await createPurchaseOrder(req.body, req.user);
  return res.status(201).json(new ApiResponse(201, order, "PO created"));
});

const updateStatusHandler = asyncHandler(async (req, res) => {
  const order = await updatePurchaseOrderStatus(
    req.params.id,
    req.body.status,
    req.user,
  );
  return res.status(200).json(new ApiResponse(200, order, "PO updated"));
});

const listHandler = asyncHandler(async (req, res) => {
  const data = await listPurchaseOrders(req.query, req.user);
  return res.status(200).json(new ApiResponse(200, data, "POs fetched"));
});

export { createHandler, updateStatusHandler, listHandler };
