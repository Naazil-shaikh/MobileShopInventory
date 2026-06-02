import mongoose from "mongoose";

const purchaseBillSchema = new mongoose.Schema(
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
    billNumber: { type: String, required: true, trim: true },
    billDate: { type: Date, required: true },
    dueDate: { type: Date },
    totalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    balanceDue: { type: Number, required: true, min: 0 },
    note: { type: String, trim: true },
    items: [
      {
        description: String,
        quantity: Number,
        unitCost: Number,
        amount: Number,
      },
    ],
    status: {
      type: String,
      enum: ["unpaid", "partial", "paid"],
      default: "unpaid",
    },
  },
  { timestamps: true },
);

purchaseBillSchema.index({ shopId: 1, billNumber: 1 }, { unique: true });

export const PurchaseBill = mongoose.model("PurchaseBill", purchaseBillSchema);
