import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createCustomer,
  getCustomerPurchaseHistory,
} from "../services/customer.service.js";

const createCustomerHandler = asyncHandler(async (req, res) => {
  const customer = await createCustomer(req.body);
  return res
    .status(201)
    .json(new ApiResponse(201, customer, "Customer created successfully"));
});

const getPurchaseHistoryHandler = asyncHandler(async (req, res) => {
  const data = await getCustomerPurchaseHistory(req.params.id, req.query);
  return res
    .status(200)
    .json(
      new ApiResponse(200, data, "Customer purchase history fetched successfully"),
    );
});

export { createCustomerHandler, getPurchaseHistoryHandler };
