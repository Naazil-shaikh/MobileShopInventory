import mongoose from "mongoose";

const saleSchema = new mongoose.Schema({
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
  paymentMethod: {
    type: String,
    enum: ["cash", "card", "upi"],
    required: true,
  },
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
},
{
  timestamps: true,
});

export const Sale = mongoose.model("Sale", saleSchema);
