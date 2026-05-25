import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createSupplier,
  updateSupplier,
  deleteSupplier,
  listSuppliers,
} from "../services/supplier.service.js";

const createSupplierHandler = asyncHandler(async (req, res) => {
  const supplier = await createSupplier(req.body);
  return res
    .status(201)
    .json(new ApiResponse(201, supplier, "Supplier created successfully"));
});

const updateSupplierHandler = asyncHandler(async (req, res) => {
  const supplier = await updateSupplier(req.params.id, req.body);
  return res
    .status(200)
    .json(new ApiResponse(200, supplier, "Supplier updated successfully"));
});

const deleteSupplierHandler = asyncHandler(async (req, res) => {
  const result = await deleteSupplier(req.params.id);
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Supplier deleted successfully"));
});

const listSuppliersHandler = asyncHandler(async (req, res) => {
  const data = await listSuppliers(req.query);
  return res
    .status(200)
    .json(new ApiResponse(200, data, "Suppliers fetched successfully"));
});

export {
  createSupplierHandler,
  updateSupplierHandler,
  deleteSupplierHandler,
  listSuppliersHandler,
};
