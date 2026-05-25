import { Supplier } from "../models/supplier.model.js";
import { Product } from "../models/product.model.js";
import { ApiError } from "../utils/ApiError.js";
import { assertValidObjectId } from "../utils/validateObjectId.js";
import { getPagination, buildPaginationMeta } from "../utils/pagination.js";

const validateSupplierPayload = (data, isUpdate = false) => {
  const { name, phone, address, email, gstNumber } = data;

  if (!isUpdate) {
    if (!name || !phone || !address || !email || !gstNumber) {
      throw new ApiError(400, "All supplier fields are required");
    }
  }
};

const createSupplier = async (data) => {
  validateSupplierPayload(data);

  const existing = await Supplier.findOne({
    $or: [{ email: data.email }, { gstNumber: data.gstNumber }],
  });

  if (existing) {
    throw new ApiError(409, "Supplier with email or GST number already exists");
  }

  return await Supplier.create(data);
};

const updateSupplier = async (supplierId, data) => {
  assertValidObjectId(supplierId, "supplierId");
  validateSupplierPayload(data, true);

  const supplier = await Supplier.findByIdAndUpdate(
    supplierId,
    { $set: data },
    { new: true, runValidators: true },
  );

  if (!supplier) {
    throw new ApiError(404, "Supplier not found");
  }

  return supplier;
};

const deleteSupplier = async (supplierId) => {
  assertValidObjectId(supplierId, "supplierId");

  const linkedProduct = await Product.exists({ supplier: supplierId });
  if (linkedProduct) {
    throw new ApiError(400, "Cannot delete supplier linked to products");
  }

  const supplier = await Supplier.findByIdAndDelete(supplierId);
  if (!supplier) {
    throw new ApiError(404, "Supplier not found");
  }

  return { deleted: true };
};

const listSuppliers = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const filter = {};

  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: "i" } },
      { email: { $regex: query.search, $options: "i" } },
      { phone: { $regex: query.search, $options: "i" } },
    ];
  }

  const [suppliers, total] = await Promise.all([
    Supplier.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Supplier.countDocuments(filter),
  ]);

  return {
    suppliers,
    pagination: buildPaginationMeta(total, page, limit),
  };
};

export { createSupplier, updateSupplier, deleteSupplier, listSuppliers };
