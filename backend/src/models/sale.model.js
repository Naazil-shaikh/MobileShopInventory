import mongoose from "mongoose";

const saleSchema = new mongoose.Schema({
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
  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
      returnedQuantity: {
        type: Number,
        default: 0,
        min: 0,
      },
      price: {
        type: Number,
        required: true,
      },
      imeiIds: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "MobileUnit",
        },
      ],
    },
  ],
  soldBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  totalRefunded: {
    type: Number,
    default: 0,
    min: 0,
  },
  paymentMethod: {
    type: String,
    enum: ["cash", "card", "upi"],
    required: true,
  },
  paymentPlan: {
    type: String,
    enum: ["full", "emi", "credit"],
    default: "full",
  },
  downPayment: { type: Number, default: 0, min: 0 },
  amountPaid: { type: Number, default: 0, min: 0 },
  balanceDue: { type: Number, default: 0, min: 0 },
  emiTenure: { type: Number, min: 1 },
  warrantyNote: { type: String, trim: true },
  invoiceNumber: {
    type: String,
    required: true,
    trim: true,
  },
},
{
  timestamps: true,
});

saleSchema.index({ shopId: 1, invoiceNumber: 1 }, { unique: true });

export const Sale = mongoose.model("Sale", saleSchema);
