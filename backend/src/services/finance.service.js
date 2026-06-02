import { PurchaseBill } from "../models/purchaseBill.model.js";
import { CashbookEntry } from "../models/cashbookEntry.model.js";
import { Installment } from "../models/installment.model.js";
import { Sale } from "../models/sale.model.js";
import { Supplier } from "../models/supplier.model.js";
import { ApiError } from "../utils/ApiError.js";
import { assertValidObjectId } from "../utils/validateObjectId.js";
import { getPagination, buildPaginationMeta } from "../utils/pagination.js";

const getShopId = (user) => {
  if (!user?.shopId) throw new ApiError(401, "Unauthorized shop access");
  return user.shopId;
};

// ── Supplier payables ─────────────────────────────────────────────────────

const createPurchaseBill = async (data, user) => {
  const shopId = getShopId(user);
  const { supplierId, billNumber, billDate, dueDate, totalAmount, paidAmount, items, note } =
    data;

  if (!supplierId || !billNumber || !billDate || totalAmount == null) {
    throw new ApiError(400, "Supplier, bill number, date, and total are required");
  }

  assertValidObjectId(supplierId, "supplierId");
  const supplier = await Supplier.findOne({ _id: supplierId, shopId });
  if (!supplier) throw new ApiError(404, "Supplier not found");

  const paid = Number(paidAmount) || 0;
  const total = Number(totalAmount);
  const balanceDue = total - paid;

  const bill = await PurchaseBill.create({
    shopId,
    supplierId,
    billNumber,
    billDate,
    dueDate,
    totalAmount: total,
    paidAmount: paid,
    balanceDue,
    items: items || [],
    note,
    status: balanceDue <= 0 ? "paid" : paid > 0 ? "partial" : "unpaid",
  });

  if (paid > 0) {
    await CashbookEntry.create({
      shopId,
      type: "out",
      category: "supplier_payment",
      amount: paid,
      note: `Payment for bill ${billNumber}`,
      referenceId: bill._id,
      referenceType: "PurchaseBill",
      entryDate: new Date(),
      createdBy: user._id,
    });
  }

  return bill;
};

const payPurchaseBill = async (billId, { amount, note }, user) => {
  const shopId = getShopId(user);
  assertValidObjectId(billId, "billId");

  const bill = await PurchaseBill.findOne({ _id: billId, shopId });
  if (!bill) throw new ApiError(404, "Purchase bill not found");

  const pay = Number(amount);
  if (!pay || pay <= 0) throw new ApiError(400, "Invalid payment amount");

  bill.paidAmount += pay;
  bill.balanceDue = Math.max(0, bill.totalAmount - bill.paidAmount);
  bill.status =
    bill.balanceDue <= 0 ? "paid" : bill.paidAmount > 0 ? "partial" : "unpaid";
  await bill.save();

  await CashbookEntry.create({
    shopId,
    type: "out",
    category: "supplier_payment",
    amount: pay,
    note: note || `Payment for bill ${bill.billNumber}`,
    referenceId: bill._id,
    referenceType: "PurchaseBill",
    entryDate: new Date(),
    createdBy: user._id,
  });

  return bill;
};

const listPurchaseBills = async (query, user) => {
  const shopId = getShopId(user);
  const { page, limit, skip } = getPagination(query);
  const filter = { shopId };
  if (query.status) filter.status = query.status;

  const [bills, total] = await Promise.all([
    PurchaseBill.find(filter)
      .populate("supplierId", "name phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    PurchaseBill.countDocuments(filter),
  ]);

  return { bills, pagination: buildPaginationMeta(total, page, limit) };
};

// ── Cashbook ──────────────────────────────────────────────────────────────

const addCashbookEntry = async (data, user) => {
  const shopId = getShopId(user);
  const { type, category, amount, paymentMethod, note, entryDate } = data;

  if (!type || !category || amount == null) {
    throw new ApiError(400, "Type, category, and amount are required");
  }

  return CashbookEntry.create({
    shopId,
    type,
    category,
    amount: Number(amount),
    paymentMethod: paymentMethod || "cash",
    note,
    entryDate: entryDate ? new Date(entryDate) : new Date(),
    createdBy: user._id,
  });
};

const getCashbook = async (query, user) => {
  const shopId = getShopId(user);
  const { page, limit, skip } = getPagination(query);
  const filter = { shopId };

  if (query.type) filter.type = query.type;
  if (query.from || query.to) {
    filter.entryDate = {};
    if (query.from) filter.entryDate.$gte = new Date(query.from);
    if (query.to) filter.entryDate.$lte = new Date(query.to);
  }

  const [entries, total] = await Promise.all([
    CashbookEntry.find(filter).sort({ entryDate: -1 }).skip(skip).limit(limit),
    CashbookEntry.countDocuments(filter),
  ]);

  const summary = await CashbookEntry.aggregate([
    { $match: filter },
    {
      $group: {
        _id: "$type",
        total: { $sum: "$amount" },
      },
    },
  ]);

  const cashIn = summary.find((s) => s._id === "in")?.total || 0;
  const cashOut = summary.find((s) => s._id === "out")?.total || 0;

  return {
    entries,
    summary: { cashIn, cashOut, net: cashIn - cashOut },
    pagination: buildPaginationMeta(total, page, limit),
  };
};

// ── Customer EMI / receivables ────────────────────────────────────────────

const applyPaymentToInstallments = async (saleId, shopId, pay) => {
  let remaining = pay;
  const pending = await Installment.find({
    shopId,
    saleId,
    status: { $in: ["pending", "partial", "overdue"] },
  }).sort({ dueDate: 1 });

  for (const inst of pending) {
    if (remaining <= 0) break;
    const due = inst.amount - inst.paidAmount;
    const apply = Math.min(remaining, due);
    inst.paidAmount += apply;
    inst.status =
      inst.paidAmount >= inst.amount
        ? "paid"
        : inst.paidAmount > 0
          ? "partial"
          : "pending";
    if (inst.status === "paid") inst.paidAt = new Date();
    await inst.save();
    remaining -= apply;
  }
};

const recordInstallmentPayment = async (installmentId, { amount, note }, user) => {
  const shopId = getShopId(user);
  assertValidObjectId(installmentId, "installmentId");

  const inst = await Installment.findOne({ _id: installmentId, shopId });
  if (!inst) throw new ApiError(404, "Installment not found");

  const pay = Number(amount);
  if (!pay || pay <= 0) throw new ApiError(400, "Invalid amount");

  const applied = Math.min(pay, inst.amount - inst.paidAmount);
  if (applied <= 0) throw new ApiError(400, "Installment is already paid");

  inst.paidAmount += applied;
  inst.status =
    inst.paidAmount >= inst.amount
      ? "paid"
      : inst.paidAmount > 0
        ? "partial"
        : "pending";
  if (inst.status === "paid") inst.paidAt = new Date();
  await inst.save();

  const sale = await Sale.findOne({ _id: inst.saleId, shopId });
  if (sale) {
    sale.amountPaid = Math.min(sale.totalAmount, sale.amountPaid + applied);
    sale.balanceDue = Math.max(0, sale.totalAmount - sale.amountPaid);
    await sale.save();
  }

  await CashbookEntry.create({
    shopId,
    type: "in",
    category: "customer_payment",
    amount: applied,
    note: note || `EMI payment #${inst.installmentNumber}`,
    referenceId: inst._id,
    referenceType: "Installment",
    entryDate: new Date(),
    createdBy: user._id,
  });

  return inst;
};

const recordSaleReceivablePayment = async (
  saleId,
  { amount, note, paymentMethod },
  user,
) => {
  const shopId = getShopId(user);
  assertValidObjectId(saleId, "saleId");

  const sale = await Sale.findOne({ _id: saleId, shopId });
  if (!sale) throw new ApiError(404, "Sale not found");
  if (sale.balanceDue <= 0) {
    throw new ApiError(400, "No balance due on this sale");
  }

  const pay = Math.min(Number(amount), sale.balanceDue);
  if (!pay || pay <= 0) throw new ApiError(400, "Invalid amount");

  sale.amountPaid = Math.min(sale.totalAmount, sale.amountPaid + pay);
  sale.balanceDue = Math.max(0, sale.totalAmount - sale.amountPaid);
  await sale.save();

  await applyPaymentToInstallments(sale._id, shopId, pay);

  await CashbookEntry.create({
    shopId,
    type: "in",
    category: "customer_payment",
    amount: pay,
    paymentMethod: paymentMethod || sale.paymentMethod,
    note: note || `Balance payment for ${sale.invoiceNumber}`,
    referenceId: sale._id,
    referenceType: "Sale",
    entryDate: new Date(),
    createdBy: user._id,
  });

  return Sale.findById(sale._id).populate("customerId", "name phone");
};

const listReceivables = async (query, user) => {
  const shopId = getShopId(user);
  const { page, limit, skip } = getPagination(query);
  const filter = {
    shopId,
    balanceDue: { $gt: 0 },
    paymentPlan: { $in: ["credit", "emi"] },
  };

  const [sales, total] = await Promise.all([
    Sale.find(filter)
      .populate("customerId", "name phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Sale.countDocuments(filter),
  ]);

  const saleIds = sales.map((sale) => sale._id);
  const installments = await Installment.find({
    shopId,
    saleId: { $in: saleIds },
    status: { $in: ["pending", "partial", "overdue"] },
  })
    .sort({ dueDate: 1 })
    .lean();

  const installmentsBySale = {};
  for (const inst of installments) {
    const key = String(inst.saleId);
    if (!installmentsBySale[key]) installmentsBySale[key] = [];
    installmentsBySale[key].push(inst);
  }

  const receivables = sales.map((sale) => ({
    ...sale,
    pendingInstallments: installmentsBySale[String(sale._id)] || [],
  }));

  return { receivables, pagination: buildPaginationMeta(total, page, limit) };
};

const getFinanceOverview = async (user) => {
  const shopId = getShopId(user);

  const [payables, receivables, overdue] = await Promise.all([
    PurchaseBill.aggregate([
      { $match: { shopId, balanceDue: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: "$balanceDue" } } },
    ]),
    Sale.aggregate([
      {
        $match: {
          shopId,
          balanceDue: { $gt: 0 },
          paymentPlan: { $in: ["credit", "emi"] },
        },
      },
      { $group: { _id: null, total: { $sum: "$balanceDue" } } },
    ]),
    Installment.countDocuments({
      shopId,
      status: "overdue",
    }),
  ]);

  return {
    totalPayables: payables[0]?.total || 0,
    totalReceivables: receivables[0]?.total || 0,
    overdueInstallments: overdue,
  };
};

const recordStockPurchaseBill = async (
  {
    purchasePaymentType = "paid",
    supplierBillNumber,
    paidAmount,
    supplierId,
    totalAmount,
    items,
    note,
  },
  user,
) => {
  if (purchasePaymentType !== "credit") {
    return null;
  }

  if (!supplierBillNumber?.trim()) {
    throw new ApiError(
      400,
      "Supplier bill / invoice number is required when purchasing on credit",
    );
  }

  if (!supplierId) {
    throw new ApiError(400, "A supplier must be linked to this product");
  }

  const total = Number(totalAmount);
  if (!total || total <= 0) {
    throw new ApiError(400, "Purchase total must be greater than 0");
  }

  return createPurchaseBill(
    {
      supplierId,
      billNumber: supplierBillNumber.trim(),
      billDate: new Date(),
      totalAmount: total,
      paidAmount: Number(paidAmount) || 0,
      items: items || [],
      note,
    },
    user,
  );
};

export {
  createPurchaseBill,
  payPurchaseBill,
  listPurchaseBills,
  addCashbookEntry,
  getCashbook,
  recordInstallmentPayment,
  recordSaleReceivablePayment,
  listReceivables,
  getFinanceOverview,
  recordStockPurchaseBill,
};
