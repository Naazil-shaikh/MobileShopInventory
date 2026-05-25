import { Customer } from "../models/customer.model.js";
import { Sale } from "../models/sale.model.js";
import { ApiError } from "../utils/ApiError.js";
import { assertValidObjectId } from "../utils/validateObjectId.js";
import { getPagination, buildPaginationMeta } from "../utils/pagination.js";

const createCustomer = async (data) => {
  const { name, phone, address } = data;

  if (!name || !phone || !address) {
    throw new ApiError(400, "Name, phone, and address are required");
  }

  const existing = await Customer.findOne({ phone });
  if (existing) {
    throw new ApiError(409, "Customer with this phone number already exists");
  }

  return await Customer.create(data);
};

const getCustomerPurchaseHistory = async (customerId, query) => {
  assertValidObjectId(customerId, "customerId");

  const customer = await Customer.findById(customerId);
  if (!customer) {
    throw new ApiError(404, "Customer not found");
  }

  const { page, limit, skip } = getPagination(query);

  const [sales, total] = await Promise.all([
    Sale.find({ customerId })
      .populate("items.productId", "name brand category")
      .populate("soldBy", "username")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Sale.countDocuments({ customerId }),
  ]);

  return {
    customer,
    sales,
    pagination: buildPaginationMeta(total, page, limit),
  };
};

export { createCustomer, getCustomerPurchaseHistory };
