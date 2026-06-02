import mongoose from "mongoose";

const saleReturnSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    saleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sale",
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        quantity: Number,
        refundAmount: Number,
        imeiIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "MobileUnit" }],
      },
    ],
    totalRefund: { type: Number, required: true, min: 0 },
    reason: { type: String, trim: true },
    type: {
      type: String,
      enum: ["return", "exchange"],
      default: "return",
    },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export const SaleReturn = mongoose.model("SaleReturn", saleReturnSchema);
