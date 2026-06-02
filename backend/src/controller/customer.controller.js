import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createCustomer,
  getCustomerPurchaseHistory,
  listCustomers,
  updateCustomer,
} from "../services/customer.service.js";

const createCustomerHandler = asyncHandler(async (req, res) => {
  const customer = await createCustomer(req.body, req.user);
  return res
    .status(201)
    .json(new ApiResponse(201, customer, "Customer created successfully"));
});

const getPurchaseHistoryHandler = asyncHandler(async (req, res) => {
  const data = await getCustomerPurchaseHistory(req.params.id, req.query, req.user);
  return res
    .status(200)
    .json(
      new ApiResponse(200, data, "Customer purchase history fetched successfully"),
    );
});

const listCustomersHandler = asyncHandler(async (req, res) => {
  const data = await listCustomers(req.query, req.user);
  return res
    .status(200)
    .json(new ApiResponse(200, data, "Customers fetched successfully"));
});

const updateCustomerHandler = asyncHandler(async (req, res) => {
  const customer = await updateCustomer(req.params.id, req.body, req.user);
  return res
    .status(200)
    .json(new ApiResponse(200, customer, "Customer updated successfully"));
});

export {
  createCustomerHandler,
  getPurchaseHistoryHandler,
  listCustomersHandler,
  updateCustomerHandler,
};
