import { RepairJob } from "../models/repairJob.model.js";
import { Customer } from "../models/customer.model.js";
import { CashbookEntry } from "../models/cashbookEntry.model.js";
import { ApiError } from "../utils/ApiError.js";
import { assertValidObjectId } from "../utils/validateObjectId.js";
import { getPagination, buildPaginationMeta } from "../utils/pagination.js";

const generateJobNumber = async (shopId) => {
  const count = await RepairJob.countDocuments({ shopId });
  return `REP-${Date.now().toString().slice(-6)}-${count + 1}`;
};

const createRepairJob = async (data, user) => {
  const shopId = user?.shopId;
  if (!shopId) throw new ApiError(401, "Unauthorized shop access");

  const { customerId, deviceName, imei, issue, estimatedCost, warrantyExpiry, note } =
    data;

  if (!customerId || !deviceName || !issue) {
    throw new ApiError(400, "Customer, device, and issue are required");
  }

  assertValidObjectId(customerId, "customerId");
  const customer = await Customer.findOne({ _id: customerId, shopId });
  if (!customer) throw new ApiError(404, "Customer not found");

  return RepairJob.create({
    shopId,
    customerId,
    jobNumber: await generateJobNumber(shopId),
    deviceName,
    imei,
    issue,
    estimatedCost: estimatedCost || 0,
    warrantyExpiry,
    note,
    assignedTo: user._id,
  });
};

const updateRepairStatus = async (jobId, data, user) => {
  const shopId = user?.shopId;
  assertValidObjectId(jobId, "jobId");

  const job = await RepairJob.findOne({ _id: jobId, shopId });
  if (!job) throw new ApiError(404, "Repair job not found");

  if (data.status) job.status = data.status;
  if (data.finalCost != null) job.finalCost = data.finalCost;

  if (data.status === "delivered") {
    job.deliveredAt = new Date();
    if (job.finalCost > 0) {
      await CashbookEntry.create({
        shopId,
        type: "in",
        category: "sale",
        amount: job.finalCost,
        note: `Repair job ${job.jobNumber} payment`,
        referenceId: job._id,
        referenceType: "RepairJob",
        entryDate: new Date(),
        createdBy: user._id,
      });
    }
  }

  await job.save();
  return job.populate("customerId", "name phone");
};

const listRepairJobs = async (query, user) => {
  const shopId = user?.shopId;
  const { page, limit, skip } = getPagination(query);
  const filter = { shopId };
  if (query.status) filter.status = query.status;

  const [jobs, total] = await Promise.all([
    RepairJob.find(filter)
      .populate("customerId", "name phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    RepairJob.countDocuments(filter),
  ]);

  return { jobs, pagination: buildPaginationMeta(total, page, limit) };
};

export { createRepairJob, updateRepairStatus, listRepairJobs };
