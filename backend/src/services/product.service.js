import { Product } from "../models/product.model.js";
import { MobileUnit } from "../models/mobileUnit.model.js";
import { Sale } from "../models/sale.model.js";
import { ApiError } from "../utils/ApiError.js";
import { assertValidObjectId } from "../utils/validateObjectId.js";
import { getPagination, buildPaginationMeta } from "../utils/pagination.js";
import { recordStockPurchaseBill } from "./finance.service.js";

const PURCHASE_FIELDS = [
  "purchasePaymentType",
  "supplierBillNumber",
  "paidAmount",
];

const stripPurchaseFields = (data) => {
  const productData = { ...data };
  for (const key of PURCHASE_FIELDS) {
    delete productData[key];
  }
  return productData;
};

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

const createProduct = async (data, user) => {
  validateProductPayload(data);
  const shopId = user?.shopId;
  if (!shopId) throw new ApiError(401, "Unauthorized shop access");

  const { purchasePaymentType, supplierBillNumber, paidAmount } = data;

  const productData = stripPurchaseFields(data);
  const stockQty = productData.hasIMEI ? 0 : productData.currentStock || 0;

  const product = await Product.create({
    ...productData,
    shopId,
    currentStock: stockQty,
  });

  if (stockQty > 0) {
    await recordStockPurchaseBill(
      {
        purchasePaymentType,
        supplierBillNumber,
        paidAmount,
        supplierId: productData.supplier,
        totalAmount: stockQty * productData.purchasePrice,
        items: [
          {
            description: `${productData.name} (initial stock)`,
            quantity: stockQty,
            unitCost: productData.purchasePrice,
            amount: stockQty * productData.purchasePrice,
          },
        ],
        note: `Initial stock for ${productData.name}`,
      },
      user,
    );
  }

  return await Product.findOne({ _id: product._id, shopId }).populate(
    "supplier",
  );
};

const updateProduct = async (productId, data, user) => {
  assertValidObjectId(productId, "productId");
  validateProductPayload(data, true);
  const shopId = user?.shopId;
  if (!shopId) throw new ApiError(401, "Unauthorized shop access");

  if (data.currentStock !== undefined) {
    throw new ApiError(
      400,
      "Direct stock updates are not allowed. Use inventory endpoints",
    );
  }

  const product = await Product.findOneAndUpdate(
    { _id: productId, shopId },
    { $set: data },
    { returnDocument: "after", runValidators: true },
  ).populate("supplier");

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return product;
};

const deleteProduct = async (productId, user) => {
  try {
    assertValidObjectId(productId, "productId");
    const shopId = user?.shopId;
    if (!shopId) throw new ApiError(401, "Unauthorized shop access");

    const product = await Product.findOne({ _id: productId, shopId });
    if (!product) {
      throw new ApiError(404, "Product not found");
    }

    if (product.currentStock > 0) {
      throw new ApiError(400, "Cannot delete product with remaining stock");
    }

    const inStockUnits = await MobileUnit.countDocuments({
      shopId,
      productId,
      status: "in_stock",
    });

    if (inStockUnits > 0) {
      throw new ApiError(
        400,
        "Cannot delete product with in-stock mobile units",
      );
    }

    const usedInSales = await Sale.exists({
      shopId,
      "items.productId": productId,
    });
    if (usedInSales) {
      throw new ApiError(400, "Cannot delete product referenced in sales");
    }

    await Product.deleteOne({ _id: productId, shopId });
    return { deleted: true };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    } else {
      throw new ApiError(500, "Internal server error");
    }
  }
};

const getProductById = async (productId, user) => {
  assertValidObjectId(productId, "productId");
  const shopId = user?.shopId;
  if (!shopId) throw new ApiError(401, "Unauthorized shop access");

  const product = await Product.findOne({ _id: productId, shopId }).populate(
    "supplier",
  );
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return product;
};

const getAllProducts = async (query, user) => {
  const { page, limit, skip } = getPagination(query);
  const shopId = user?.shopId;
  if (!shopId) throw new ApiError(401, "Unauthorized shop access");
  const filter = { shopId };

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
