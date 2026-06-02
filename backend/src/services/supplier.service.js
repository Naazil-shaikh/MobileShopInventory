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
  const conditions = [{ email: data.email, shopId: data.shopId }];
  if (data.gstNumber) {
    conditions.push({ gstNumber: data.gstNumber, shopId: data.shopId });
  }

  const filter = { $or: conditions };
  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  return Supplier.findOne(filter);
};

const createSupplier = async (data, user) => {
  validateSupplierPayload(data);
  const shopId = user?.shopId;
  if (!shopId) throw new ApiError(401, "Unauthorized shop access");
  const payload = normalizeSupplierData({ ...data, shopId });

  const existing = await findDuplicateSupplier(payload);
  if (existing) {
    throw new ApiError(
      409,
      "Supplier with this email or GST number already exists",
    );
  }

  return await Supplier.create(payload);
};

const updateSupplier = async (supplierId, data, user) => {
  assertValidObjectId(supplierId, "supplierId");
  validateSupplierPayload(data, true);
  const shopId = user?.shopId;
  if (!shopId) throw new ApiError(401, "Unauthorized shop access");
  const payload = normalizeSupplierData({ ...data, shopId });

  const existing = await findDuplicateSupplier(payload, supplierId);
  if (existing) {
    throw new ApiError(
      409,
      "Supplier with this email or GST number already exists",
    );
  }

  const updateOp = { $set: payload };
  if (data.gstNumber !== undefined && !data.gstNumber?.trim()) {
    updateOp.$unset = { gstNumber: 1 };
  }

  const supplier = await Supplier.findOneAndUpdate(
    { _id: supplierId, shopId },
    updateOp,
    { returnDocument: "after", runValidators: true },
  );

  if (!supplier) {
    throw new ApiError(404, "Supplier not found");
  }

  return supplier;
};

const deleteSupplier = async (supplierId, user) => {
  assertValidObjectId(supplierId, "supplierId");
  const shopId = user?.shopId;
  if (!shopId) throw new ApiError(401, "Unauthorized shop access");

  const linkedProduct = await Product.exists({ supplier: supplierId, shopId });
  if (linkedProduct) {
    throw new ApiError(400, "Cannot delete supplier linked to products");
  }

  const supplier = await Supplier.findOneAndDelete({ _id: supplierId, shopId });
  if (!supplier) {
    throw new ApiError(404, "Supplier not found");
  }

  return { deleted: true };
};

const listSuppliers = async (query, user) => {
  const { page, limit, skip } = getPagination(query);
  const shopId = user?.shopId;
  if (!shopId) throw new ApiError(401, "Unauthorized shop access");
  const filter = { shopId };

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
