import mongoose from "mongoose";
import { Sale } from "../models/sale.model.js";
import { Product } from "../models/product.model.js";
import { MobileUnit } from "../models/mobileUnit.model.js";
import { Customer } from "../models/customer.model.js";
import { ApiError } from "../utils/ApiError.js";
import { assertValidObjectId } from "../utils/validateObjectId.js";
import { getPagination, buildPaginationMeta } from "../utils/pagination.js";
import { generateInvoiceNumber } from "../utils/generateInvoiceNumber.js";
import { reduceStock } from "./inventory.service.js";

const validateSaleItems = async (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, "Sale must contain at least one item");
  }

  const validatedItems = [];

  for (const item of items) {
    const { productId, quantity, price, imeiIds } = item;

    if (!productId || !quantity || price == null) {
      throw new ApiError(
        400,
        "Each item requires productId, quantity, and price",
      );
    }

    assertValidObjectId(productId, "productId");

    if (quantity <= 0) {
      throw new ApiError(400, "Item quantity must be greater than 0");
    }

    if (price < 0) {
      throw new ApiError(400, "Item price cannot be negative");
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw new ApiError(404, `Product not found: ${productId}`);
    }

    if (product.currentStock < quantity) {
      throw new ApiError(
        400,
        `Insufficient stock for ${product.name}. Available: ${product.currentStock}`,
      );
    }

    let resolvedImeiIds = [];

    if (product.hasIMEI) {
      if (!Array.isArray(imeiIds) || imeiIds.length !== quantity) {
        throw new ApiError(
          400,
          `Product ${product.name} requires exactly ${quantity} IMEI(s)`,
        );
      }

      imeiIds.forEach((id) => assertValidObjectId(id, "imeiId"));

      const units = await MobileUnit.find({
        _id: { $in: imeiIds },
        productId,
        status: "in_stock",
      });

      if (units.length !== imeiIds.length) {
        throw new ApiError(
          400,
          `One or more IMEI units are invalid or unavailable for ${product.name}`,
        );
      }

      resolvedImeiIds = imeiIds;
    } else if (imeiIds?.length) {
      throw new ApiError(
        400,
        `Product ${product.name} does not support IMEI tracking`,
      );
    }

    validatedItems.push({
      product,
      productId,
      quantity,
      price,
      imeiIds: resolvedImeiIds,
    });
  }

  return validatedItems;
};

const createSale = async ({ customerId, items, paymentMethod, soldBy }) => {
  assertValidObjectId(customerId, "customerId");

  if (!paymentMethod) {
    throw new ApiError(400, "Payment method is required");
  }

  const customer = await Customer.findById(customerId);
  if (!customer) {
    throw new ApiError(404, "Customer not found");
  }

  const validatedItems = await validateSaleItems(items);

  const totalAmount = validatedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  if (totalAmount <= 0) {
    throw new ApiError(400, "Total amount must be greater than 0");
  }

  const invoiceNumber = await generateInvoiceNumber();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const saleItems = validatedItems.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.price,
      imeiIds: item.imeiIds?.length ? item.imeiIds : undefined,
    }));

    const [sale] = await Sale.create(
      [
        {
          customerId,
          items: saleItems,
          totalAmount,
          paymentMethod,
          invoiceNumber,
          soldBy,
        },
      ],
      { session },
    );

    for (const item of validatedItems) {
      await reduceStock(
        {
          productId: item.productId,
          quantity: item.quantity,
          type: "sale",
          note: `Sale invoice ${invoiceNumber}`,
          referenceId: sale._id,
          referenceType: "Sale",
        },
        session,
      );

      if (item.imeiIds?.length) {
        await MobileUnit.updateMany(
          { _id: { $in: item.imeiIds } },
          {
            $set: {
              status: "sold",
              sellingDate: new Date(),
            },
          },
          { session },
        );
      }
    }

    await session.commitTransaction();

    return await Sale.findById(sale._id)
      .populate("customerId", "name phone address")
      .populate("items.productId", "name brand category")
      .populate("items.imeiIds", "imei color storage status")
      .populate("soldBy", "username");
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const getSaleHistory = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const filter = {};

  if (query.customerId) {
    assertValidObjectId(query.customerId, "customerId");
    filter.customerId = query.customerId;
  }

  if (query.paymentMethod) {
    filter.paymentMethod = query.paymentMethod;
  }

  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = new Date(query.from);
    if (query.to) filter.createdAt.$lte = new Date(query.to);
  }

  const [sales, total] = await Promise.all([
    Sale.find(filter)
      .populate("customerId", "name phone")
      .populate("items.productId", "name brand")
      .populate("soldBy", "username")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Sale.countDocuments(filter),
  ]);

  return {
    sales,
    pagination: buildPaginationMeta(total, page, limit),
  };
};

const getInvoiceDetails = async (identifier) => {
  let sale;

  if (mongoose.Types.ObjectId.isValid(identifier)) {
    sale = await Sale.findById(identifier)
      .populate("customerId", "name phone address")
      .populate("items.productId", "name brand category sellingPrice")
      .populate("items.imeiIds", "imei color storage status")
      .populate("soldBy", "username email");
  }

  if (!sale) {
    sale = await Sale.findOne({ invoiceNumber: identifier })
      .populate("customerId", "name phone address")
      .populate("items.productId", "name brand category sellingPrice")
      .populate("items.imeiIds", "imei color storage status")
      .populate("soldBy", "username email");
  }

  if (!sale) {
    throw new ApiError(404, "Invoice not found");
  }

  return sale;
};

export { createSale, getSaleHistory, getInvoiceDetails };
