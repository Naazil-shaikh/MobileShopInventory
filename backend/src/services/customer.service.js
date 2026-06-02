import { Customer } from "../models/customer.model.js";
import { Sale } from "../models/sale.model.js";
import { ApiError } from "../utils/ApiError.js";
import { assertValidObjectId } from "../utils/validateObjectId.js";
import { getPagination, buildPaginationMeta } from "../utils/pagination.js";

const createCustomer = async (data, user) => {
  const { name, phone, address } = data;
  const shopId = user?.shopId;
  if (!shopId) throw new ApiError(401, "Unauthorized shop access");

  if (!name || !phone || !address) {
    throw new ApiError(400, "Name, phone, and address are required");
  }

  const existing = await Customer.findOne({ phone, shopId });
  if (existing) {
    throw new ApiError(409, "Customer with this phone number already exists");
  }

  return await Customer.create({ ...data, shopId });
};

const getCustomerPurchaseHistory = async (customerId, query, user) => {
  assertValidObjectId(customerId, "customerId");
  const shopId = user?.shopId;
  if (!shopId) throw new ApiError(401, "Unauthorized shop access");

  const customer = await Customer.findOne({ _id: customerId, shopId });
  if (!customer) {
    throw new ApiError(404, "Customer not found");
  }

  const { page, limit, skip } = getPagination(query);

  const [sales, total] = await Promise.all([
    Sale.find({ customerId, shopId })
      .populate("items.productId", "name brand category")
      .populate("soldBy", "username")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Sale.countDocuments({ customerId, shopId }),
  ]);

  return {
    customer,
    sales,
    pagination: buildPaginationMeta(total, page, limit),
  };
};

const listCustomers = async (query, user) => {
  const shopId = user?.shopId;
  if (!shopId) throw new ApiError(401, "Unauthorized shop access");

  const { page, limit, skip } = getPagination(query);
  const filter = { shopId };

  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: "i" } },
      { phone: { $regex: query.search, $options: "i" } },
    ];
  }
  if (query.riskLevel) filter.riskLevel = query.riskLevel;

  const [customers, total] = await Promise.all([
    Customer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Customer.countDocuments(filter),
  ]);

  return { customers, pagination: buildPaginationMeta(total, page, limit) };
};

const updateCustomer = async (customerId, data, user) => {
  assertValidObjectId(customerId, "customerId");
  const shopId = user?.shopId;

  const customer = await Customer.findOneAndUpdate(
    { _id: customerId, shopId },
    { $set: data },
    { new: true, runValidators: true },
  );

  if (!customer) throw new ApiError(404, "Customer not found");
  return customer;
};

export {
  createCustomer,
  getCustomerPurchaseHistory,
  listCustomers,
  updateCustomer,
};
