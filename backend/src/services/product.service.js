import { Product } from "../models/product.model.js";
import { MobileUnit } from "../models/mobileUnit.model.js";
import { Sale } from "../models/sale.model.js";
import { ApiError } from "../utils/ApiError.js";
import { assertValidObjectId } from "../utils/validateObjectId.js";
import { getPagination, buildPaginationMeta } from "../utils/pagination.js";

const validateProductPayload = (data, isUpdate = false) => {
  const {
    name,
    brand,
    category,
    purchasePrice,
    sellingPrice,
    currentStock,
    lowStockThreshold,
    supplier,
    hasIMEI,
  } = data;

  if (!isUpdate) {
    if (!name || !brand || !category || !supplier) {
      throw new ApiError(400, "Required product fields are missing");
    }
    if (purchasePrice == null || sellingPrice == null) {
      throw new ApiError(400, "Purchase and selling prices are required");
    }
    if (currentStock == null || lowStockThreshold == null) {
      throw new ApiError(400, "Stock fields are required");
    }
  }

  if (purchasePrice != null && purchasePrice < 0) {
    throw new ApiError(400, "Purchase price cannot be negative");
  }

  if (sellingPrice != null && sellingPrice < 0) {
    throw new ApiError(400, "Selling price cannot be negative");
  }

  if (currentStock != null && currentStock < 0) {
    throw new ApiError(400, "Stock cannot be negative");
  }

  if (lowStockThreshold != null && lowStockThreshold < 0) {
    throw new ApiError(400, "Low stock threshold cannot be negative");
  }

  if (supplier) {
    assertValidObjectId(supplier, "supplier");
  }
};

const createProduct = async (data) => {
  validateProductPayload(data);

  const product = await Product.create({
    ...data,
    currentStock: data.hasIMEI ? 0 : data.currentStock,
  });

  return await Product.findById(product._id).populate("supplier");
};

const updateProduct = async (productId, data) => {
  assertValidObjectId(productId, "productId");
  validateProductPayload(data, true);

  if (data.currentStock !== undefined) {
    throw new ApiError(
      400,
      "Direct stock updates are not allowed. Use inventory endpoints",
    );
  }

  const product = await Product.findByIdAndUpdate(
    productId,
    { $set: data },
    { new: true, runValidators: true },
  ).populate("supplier");

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return product;
};

const deleteProduct = async (productId) => {
  assertValidObjectId(productId, "productId");

  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  if (product.currentStock > 0) {
    throw new ApiError(400, "Cannot delete product with remaining stock");
  }

  const inStockUnits = await MobileUnit.countDocuments({
    productId,
    status: "in_stock",
  });

  if (inStockUnits > 0) {
    throw new ApiError(400, "Cannot delete product with in-stock mobile units");
  }

  const usedInSales = await Sale.exists({ "items.productId": productId });
  if (usedInSales) {
    throw new ApiError(400, "Cannot delete product referenced in sales");
  }

  await Product.findByIdAndDelete(productId);
  return { deleted: true };
};

const getProductById = async (productId) => {
  assertValidObjectId(productId, "productId");

  const product = await Product.findById(productId).populate("supplier");
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return product;
};

const getAllProducts = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const filter = {};

  if (query.category) {
    filter.category = query.category;
  }

  if (query.brand) {
    filter.brand = { $regex: query.brand, $options: "i" };
  }

  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: "i" } },
      { brand: { $regex: query.search, $options: "i" } },
      { category: { $regex: query.search, $options: "i" } },
    ];
  }

  if (query.hasIMEI !== undefined) {
    filter.hasIMEI = query.hasIMEI === "true";
  }

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate("supplier", "name phone email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  return {
    products,
    pagination: buildPaginationMeta(total, page, limit),
  };
};

export {
  createProduct,
  updateProduct,
  deleteProduct,
  getProductById,
  getAllProducts,
};
