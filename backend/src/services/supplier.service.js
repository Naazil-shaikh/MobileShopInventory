import { Supplier } from "../models/supplier.model.js";
import { Product } from "../models/product.model.js";
import { ApiError } from "../utils/ApiError.js";
import { assertValidObjectId } from "../utils/validateObjectId.js";
import { getPagination, buildPaginationMeta } from "../utils/pagination.js";

const validateSupplierPayload = (data, isUpdate = false) => {
  const { name, phone, address, email } = data;

  if (!isUpdate) {
    if (!name || !phone || !address || !email) {
      throw new ApiError(400, "Name, phone, address, and email are required");
    }
  }
};

const normalizeSupplierData = (data) => {
  const payload = { ...data };
  const gst = payload.gstNumber?.trim();
  if (gst) {
    payload.gstNumber = gst;
  } else {
    delete payload.gstNumber;
  }
  return payload;
};

const findDuplicateSupplier = async (data, excludeId = null) => {
  const conditions = [{ email: data.email }];
  if (data.gstNumber) {
    conditions.push({ gstNumber: data.gstNumber });
  }

  const filter = { $or: conditions };
  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  return Supplier.findOne(filter);
};

const createSupplier = async (data) => {
  validateSupplierPayload(data);
  const payload = normalizeSupplierData(data);

  const existing = await findDuplicateSupplier(payload);
  if (existing) {
    throw new ApiError(409, "Supplier with this email or GST number already exists");
  }

  return await Supplier.create(payload);
};

const updateSupplier = async (supplierId, data) => {
  assertValidObjectId(supplierId, "supplierId");
  validateSupplierPayload(data, true);
  const payload = normalizeSupplierData(data);

  const existing = await findDuplicateSupplier(payload, supplierId);
  if (existing) {
    throw new ApiError(409, "Supplier with this email or GST number already exists");
  }

  const updateOp = { $set: payload };
  if (data.gstNumber !== undefined && !data.gstNumber?.trim()) {
    updateOp.$unset = { gstNumber: 1 };
  }

  const supplier = await Supplier.findByIdAndUpdate(
    supplierId,
    updateOp,
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
