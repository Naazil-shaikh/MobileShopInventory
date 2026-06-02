import { PurchaseOrder } from "../models/purchaseOrder.model.js";
import { Supplier } from "../models/supplier.model.js";
import { ApiError } from "../utils/ApiError.js";
import { assertValidObjectId } from "../utils/validateObjectId.js";
import { getPagination, buildPaginationMeta } from "../utils/pagination.js";

const generateOrderNumber = async (shopId) => {
  const count = await PurchaseOrder.countDocuments({ shopId });
  return `PO-${Date.now().toString().slice(-6)}-${count + 1}`;
};

const createPurchaseOrder = async (data, user) => {
  const shopId = user?.shopId;
  if (!shopId) throw new ApiError(401, "Unauthorized shop access");

  const { supplierId, items, expectedDate, note } = data;
  if (!supplierId || !items?.length) {
    throw new ApiError(400, "Supplier and items are required");
  }

  assertValidObjectId(supplierId, "supplierId");
  const supplier = await Supplier.findOne({ _id: supplierId, shopId });
  if (!supplier) throw new ApiError(404, "Supplier not found");

  const totalAmount = items.reduce(
    (s, i) => s + (i.quantity || 0) * (i.unitCost || 0),
    0,
  );

  return PurchaseOrder.create({
    shopId,
    supplierId,
    orderNumber: await generateOrderNumber(shopId),
    items,
    totalAmount,
    expectedDate,
    note,
    status: "draft",
  });
};

const updatePurchaseOrderStatus = async (orderId, status, user) => {
  const shopId = user?.shopId;
  assertValidObjectId(orderId, "orderId");

  const order = await PurchaseOrder.findOneAndUpdate(
    { _id: orderId, shopId },
    { status },
    { new: true },
  ).populate("supplierId", "name phone");

  if (!order) throw new ApiError(404, "Purchase order not found");
  return order;
};

const listPurchaseOrders = async (query, user) => {
  const shopId = user?.shopId;
  const { page, limit, skip } = getPagination(query);
  const filter = { shopId };
  if (query.status) filter.status = query.status;

  const [orders, total] = await Promise.all([
    PurchaseOrder.find(filter)
      .populate("supplierId", "name phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    PurchaseOrder.countDocuments(filter),
  ]);

  return { orders, pagination: buildPaginationMeta(total, page, limit) };
};

export { createPurchaseOrder, updatePurchaseOrderStatus, listPurchaseOrders };
