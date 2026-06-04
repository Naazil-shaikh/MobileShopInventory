import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createRepairJob,
  updateRepairStatus,
  deleteRepairJob,
  listRepairJobs,
} from "../services/repair.service.js";

const createHandler = asyncHandler(async (req, res) => {
  const job = await createRepairJob(req.body, req.user);
  return res.status(201).json(new ApiResponse(201, job, "Repair job created"));
});

const updateHandler = asyncHandler(async (req, res) => {
  const job = await updateRepairStatus(req.params.id, req.body, req.user);
  return res.status(200).json(new ApiResponse(200, job, "Repair job updated"));
});

const listHandler = asyncHandler(async (req, res) => {
  const data = await listRepairJobs(req.query, req.user);
  return res.status(200).json(new ApiResponse(200, data, "Repair jobs fetched"));
});

const deleteHandler = asyncHandler(async (req, res) => {
  const data = await deleteRepairJob(req.params.id, req.user);
  return res.status(200).json(new ApiResponse(200, data, "Repair job deleted"));
});

export { createHandler, updateHandler, deleteHandler, listHandler };
