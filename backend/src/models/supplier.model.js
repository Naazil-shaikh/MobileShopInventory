import mongoose, { Schema } from "mongoose";

const supplierSchema = new Schema(
  {
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
    email: {
      type: String,
      required: true,
      trim: true,
    },
    gstNumber: {
      type: String,
      required: true,
      trim: true,
    },
  },

  {
    timestamps: true,
  },
);

export const Supplier = mongoose.model("Supplier", supplierSchema);
