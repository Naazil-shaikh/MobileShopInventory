import mongoose, { Schema } from "mongoose";

const customerSchema = new Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    tags: [{ type: String, trim: true }],
    creditLimit: { type: Number, default: 0, min: 0 },
    riskLevel: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "low",
    },
    totalPurchaseValue: { type: Number, default: 0, min: 0 },
    lastPurchaseAt: { type: Date },
  },

  {
    timestamps: true,
  },
);

export const Customer = mongoose.model("Customer", customerSchema);
