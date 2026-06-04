import mongoose from "mongoose";

const repairJobSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    jobNumber: { type: String, required: true, trim: true },
    deviceName: { type: String, required: true, trim: true },
    imei: { type: String, trim: true },
    issue: { type: String, required: true, trim: true },
    estimatedCost: { type: Number, default: 0, min: 0 },
    finalCost: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "cancelled"],
      default: "pending",
    },
    warrantyExpiry: { type: Date },
    completedAt: { type: Date },
    note: { type: String, trim: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

repairJobSchema.index({ shopId: 1, jobNumber: 1 }, { unique: true });

export const RepairJob = mongoose.model("RepairJob", repairJobSchema);
