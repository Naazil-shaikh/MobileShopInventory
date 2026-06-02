import mongoose from "mongoose";
import { MobileUnit } from "../models/mobileUnit.model.js";
import { Product } from "../models/product.model.js";
import { InventoryTransaction } from "../models/inventoryTransaction.model.js";
import { ApiError } from "../utils/ApiError.js";
import { assertValidObjectId } from "../utils/validateObjectId.js";
import { syncImeiProductStock } from "./inventory.service.js";
import { recordStockPurchaseBill } from "./finance.service.js";

const validateUnitPayload = (unit) => {
  const { imei, color, storage, purchaseDate } = unit;

  if (!imei || !color || storage == null || !purchaseDate) {
    throw new ApiError(
      400,
      "Each mobile unit requires imei, color, storage, and purchaseDate",
    );
  }

  if (storage <= 0) {
    throw new ApiError(400, "Storage must be greater than 0");
  }
};

const addMobileUnits = async (
  {
    productId,
    units,
    purchasePaymentType,
    supplierBillNumber,
    paidAmount,
  },
  user,
) => {
  assertValidObjectId(productId, "productId");
  const shopId = user?.shopId;
  if (!shopId) throw new ApiError(401, "Unauthorized shop access");

  if (!Array.isArray(units) || units.length === 0) {
    throw new ApiError(400, "At least one mobile unit is required");
  }

  const product = await Product.findOne({ _id: productId, shopId });
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  if (!product.hasIMEI) {
    throw new ApiError(400, "Product is not configured for IMEI tracking");
  }

  units.forEach(validateUnitPayload);

  const imeis = units.map((u) => u.imei.trim());
  const duplicateInPayload = imeis.length !== new Set(imeis).size;
  if (duplicateInPayload) {
    throw new ApiError(400, "Duplicate IMEI in request payload");
  }

  const existingImei = await MobileUnit.findOne({ shopId, imei: { $in: imeis } });
  if (existingImei) {
    throw new ApiError(409, `IMEI already exists: ${existingImei.imei}`);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const previousStock = product.currentStock;
    const quantity = units.length;

    const createdUnits = await MobileUnit.insertMany(
      units.map((unit) => ({
        productId,
        shopId,
        imei: unit.imei.trim(),
        color: unit.color,
        storage: unit.storage,
        purchaseDate: unit.purchaseDate,
        status: "in_stock",
      })),
      { session },
    );

    const updatedProduct = await syncImeiProductStock(productId, shopId, session);

    await InventoryTransaction.create(
      [
        {
          productId,
          shopId,
          type: "add",
          quantity,
          previousStock,
          newStock: updatedProduct.currentStock,
          note: `Added ${quantity} IMEI unit(s)`,
        },
      ],
      { session },
    );

    await session.commitTransaction();

    await recordStockPurchaseBill(
      {
        purchasePaymentType,
        supplierBillNumber,
        paidAmount,
        supplierId: product.supplier,
        totalAmount: quantity * product.purchasePrice,
        items: [
          {
            description: `${product.name} — ${quantity} device(s)`,
            quantity,
            unitCost: product.purchasePrice,
            amount: quantity * product.purchasePrice,
          },
        ],
        note: `IMEI stock: ${quantity} unit(s)`,
      },
      user,
    );

    return { units: createdUnits, product: updatedProduct };
  } catch (error) {
    await session.abortTransaction();
    if (error.code === 11000) {
      throw new ApiError(409, "Duplicate IMEI not allowed");
    }
    throw error;
  } finally {
    session.endSession();
  }
};

const searchByImei = async (imei, user) => {
  if (!imei?.trim()) {
    throw new ApiError(400, "IMEI is required");
  }
  const shopId = user?.shopId;
  if (!shopId) throw new ApiError(401, "Unauthorized shop access");

  const unit = await MobileUnit.findOne({ shopId, imei: imei.trim() }).populate(
    "productId",
    "name brand category sellingPrice",
  );

  if (!unit) {
    throw new ApiError(404, "Mobile unit not found");
  }

  return unit;
};

const updateMobileUnitStatus = async (unitId, status, user) => {
  assertValidObjectId(unitId, "unitId");
  const shopId = user?.shopId;
  if (!shopId) throw new ApiError(401, "Unauthorized shop access");

  const allowed = ["in_stock", "sold", "returned", "defective"];
  if (!allowed.includes(status)) {
    throw new ApiError(400, `Status must be one of: ${allowed.join(", ")}`);
  }

  const unit = await MobileUnit.findOne({ _id: unitId, shopId });
  if (!unit) {
    throw new ApiError(404, "Mobile unit not found");
  }

  if (unit.status === "sold" && status !== "returned") {
    throw new ApiError(
      400,
      "Sold units can only be moved to returned status manually",
    );
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const previousStatus = unit.status;
    unit.status = status;

    if (status === "sold") {
      unit.sellingDate = new Date();
    }

    if (status === "returned" && previousStatus === "sold") {
      unit.sellingDate = undefined;
    }

    await unit.save({ session });
    const product = await syncImeiProductStock(unit.productId, shopId, session);

    await session.commitTransaction();
    return { unit, product };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export { addMobileUnits, searchByImei, updateMobileUnitStatus };
