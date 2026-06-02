import mongoose from "mongoose";

const purchaseOrderSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    orderNumber: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["draft", "ordered", "partial", "received", "cancelled"],
      default: "draft",
    },
    expectedDate: { type: Date },
    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        name: String,
        quantity: Number,
        receivedQuantity: { type: Number, default: 0 },
        unitCost: Number,
      },
    ],
    totalAmount: { type: Number, default: 0 },
    note: { type: String, trim: true },
  },
  { timestamps: true },
);

purchaseOrderSchema.index({ shopId: 1, orderNumber: 1 }, { unique: true });

export const PurchaseOrder = mongoose.model("PurchaseOrder", purchaseOrderSchema);
