import mongoose from "mongoose";

const cashbookEntrySchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["in", "out"],
      required: true,
    },
    category: {
      type: String,
      enum: [
        "sale",
        "customer_payment",
        "supplier_payment",
        "purchase",
        "expense",
        "refund",
        "other",
      ],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "upi", "bank"],
      default: "cash",
    },
    note: { type: String, trim: true },
    referenceId: { type: mongoose.Schema.Types.ObjectId },
    referenceType: {
      type: String,
      enum: ["Sale", "PurchaseBill", "Installment", "SaleReturn", "RepairJob"],
    },
    entryDate: { type: Date, required: true, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export const CashbookEntry = mongoose.model("CashbookEntry", cashbookEntrySchema);
