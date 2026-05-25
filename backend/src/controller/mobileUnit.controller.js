import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  addMobileUnits,
  searchByImei,
  updateMobileUnitStatus,
} from "../services/mobileUnit.service.js";

const addMobileUnitsHandler = asyncHandler(async (req, res) => {
  const data = await addMobileUnits(req.body);
  return res
    .status(201)
    .json(new ApiResponse(201, data, "Mobile units added successfully"));
});

const searchByImeiHandler = asyncHandler(async (req, res) => {
  const unit = await searchByImei(req.params.imei);
  return res
    .status(200)
    .json(new ApiResponse(200, unit, "Mobile unit fetched successfully"));
});

const updateStatusHandler = asyncHandler(async (req, res) => {
  const data = await updateMobileUnitStatus(req.params.id, req.body.status);
  return res
    .status(200)
    .json(new ApiResponse(200, data, "Mobile unit status updated successfully"));
});

export { addMobileUnitsHandler, searchByImeiHandler, updateStatusHandler };
