import mongoose from "mongoose";

const mobileUnitSchema = new mongoose.Schema({
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
  imei: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  color: {
    type: String,
    required: true,
    trim: true,
  },
  storage: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["in_stock", "sold", "returned", "defective"],
    default: "in_stock",
  },
  purchaseDate: {
    type: Date,
    required: true,
  },
  sellingDate: {
    type: Date,
  },
},
{
  timestamps: true,
});

export const MobileUnit = mongoose.model("MobileUnit", mobileUnitSchema);
