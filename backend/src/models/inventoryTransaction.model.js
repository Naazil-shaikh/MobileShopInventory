import mongoose from "mongoose";

const inventoryTransactionSchema = new mongoose.Schema({
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop",
    required: true,
    index: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  type: {
    type: String,
    enum: ["add", "sale", "return", "damage"],
  },
  quantity: {
    type: Number,
    required: true,
  },
  previousStock: {
    type: Number,
    required: true,
  },
  newStock: {
    type: Number,
    required: true,
  },
  note: {
    type: String,
    trim: true,
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  referenceType: {
    type: String,
    enum: ["Sale"],
  },
},
{
  timestamps: true,
});

export const InventoryTransaction = mongoose.model(
  "InventoryTransaction",
  inventoryTransactionSchema,
);
