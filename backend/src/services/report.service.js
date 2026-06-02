import { Product } from "../models/product.model.js";
import { Sale } from "../models/sale.model.js";
import { InventoryTransaction } from "../models/inventoryTransaction.model.js";
import { ReportArchive } from "../models/reportArchive.model.js";
import { Installment } from "../models/installment.model.js";
import { PurchaseBill } from "../models/purchaseBill.model.js";
import { CashbookEntry } from "../models/cashbookEntry.model.js";
import { PurchaseOrder } from "../models/purchaseOrder.model.js";
import { SaleReturn } from "../models/saleReturn.model.js";
import { RepairJob } from "../models/repairJob.model.js";
import { ApiError } from "../utils/ApiError.js";
import {
  getTodayRange,
  getMonthRange,
  getYearRange,
  getPreviousYearsEnd,
} from "../utils/dateRanges.js";

const buildStockReport = async (shopId, start, end) => {
  const products = await Product.find({ shopId }).lean();
  const transactions = await InventoryTransaction.find({
    shopId,
    createdAt: { $gte: start, $lte: end },
  })
    .populate("productId", "name brand")
    .sort({ createdAt: -1 })
    .lean();

  const summary = {
    totalProducts: products.length,
    totalStockUnits: products.reduce((s, p) => s + (p.currentStock || 0), 0),
    stockValueAtCost: products.reduce(
      (s, p) => s + (p.currentStock || 0) * (p.purchasePrice || 0),
      0,
    ),
    stockValueAtSell: products.reduce(
      (s, p) => s + (p.currentStock || 0) * (p.sellingPrice || 0),
      0,
    ),
    transactionsCount: transactions.length,
    addCount: transactions.filter((t) => t.type === "add").length,
    saleCount: transactions.filter((t) => t.type === "sale").length,
    returnCount: transactions.filter((t) => t.type === "return").length,
    damageCount: transactions.filter((t) => t.type === "damage").length,
  };

  return { summary, products, transactions, period: { start, end } };
};

const buildSalesReport = async (shopId, start, end) => {
  const sales = await Sale.find({
    shopId,
    createdAt: { $gte: start, $lte: end },
  })
    .populate("customerId", "name phone")
    .sort({ createdAt: -1 })
    .lean();

  const totalRevenue = sales.reduce((s, sale) => s + sale.totalAmount, 0);
  const totalCollected = sales.reduce(
    (s, sale) => s + (sale.amountPaid ?? sale.totalAmount),
    0,
  );
  const totalDue = sales.reduce((s, sale) => s + (sale.balanceDue || 0), 0);

  let grossProfit = 0;
  for (const sale of sales) {
    for (const item of sale.items) {
      const product = await Product.findById(item.productId).select(
        "purchasePrice",
      );
      if (product) {
        grossProfit +=
          (item.price - product.purchasePrice) * item.quantity;
      }
    }
  }

  return {
    summary: {
      salesCount: sales.length,
      totalRevenue,
      totalCollected,
      totalDue,
      grossProfit,
    },
    sales,
    period: { start, end },
  };
};

const archiveReport = async ({
  shopId,
  reportType,
  periodLabel,
  year,
  month,
  data,
  userId,
}) => {
  return ReportArchive.create({
    shopId,
    reportType,
    periodLabel,
    year,
    month,
    data,
    generatedBy: userId,
  });
};

const purgePreviousYearOperationalData = async (shopId, currentYear) => {
  const cutoff = getPreviousYearsEnd(currentYear);

  const filter = { shopId, createdAt: { $lte: cutoff } };

  const installments = await Installment.deleteMany(filter);
  const bills = await PurchaseBill.deleteMany(filter);
  const cashbook = await CashbookEntry.deleteMany(filter);
  const orders = await PurchaseOrder.deleteMany(filter);
  const returns = await SaleReturn.deleteMany(filter);
  const repairs = await RepairJob.deleteMany(filter);
  const inventoryTx = await InventoryTransaction.deleteMany(filter);

  return {
    purgedUntil: cutoff,
    deleted: {
      installments: installments.deletedCount,
      purchaseBills: bills.deletedCount,
      cashbookEntries: cashbook.deletedCount,
      purchaseOrders: orders.deletedCount,
      saleReturns: returns.deletedCount,
      repairJobs: repairs.deletedCount,
      inventoryTransactions: inventoryTx.deletedCount,
    },
    preserved: [
      "ReportArchive (all reports)",
      "Sales records (for sales reports)",
      "Products, Suppliers, Customers (master data)",
      "Current year operational data",
    ],
  };
};

const getStockReport = async (user, period, options = {}) => {
  const shopId = user.shopId;
  if (!shopId) throw new ApiError(401, "Unauthorized shop access");

  let start;
  let end;
  let periodLabel;
  let reportType;
  let year;
  let month;

  if (period === "today") {
    ({ start, end } = getTodayRange());
    periodLabel = `Today ${start.toLocaleDateString()}`;
    reportType = "stock_daily";
    year = start.getFullYear();
  } else if (period === "month") {
    ({ start, end } = getMonthRange());
    periodLabel = `${start.toLocaleString("default", { month: "long" })} ${start.getFullYear()}`;
    reportType = "stock_monthly";
    year = start.getFullYear();
    month = start.getMonth() + 1;
  } else if (period === "year") {
    year = options.year || new Date().getFullYear();
    ({ start, end } = getYearRange(year));
    periodLabel = `Year ${year}`;
    reportType = "stock_yearly";
  } else {
    throw new ApiError(400, "Invalid period. Use today, month, or year");
  }

  const report = await buildStockReport(shopId, start, end);
  const salesReport = await buildSalesReport(shopId, start, end);

  const payload = {
    stock: report,
    sales: salesReport,
    generatedAt: new Date(),
  };

  await archiveReport({
    shopId,
    reportType,
    periodLabel,
    year,
    month,
    data: payload,
    userId: user._id,
  });

  await archiveReport({
    shopId,
    reportType: "sales_summary",
    periodLabel,
    year,
    month,
    data: salesReport,
    userId: user._id,
  });

  let purgeResult = null;
  if (period === "year" && options.archiveAndPurge) {
    purgeResult = await purgePreviousYearOperationalData(shopId, year);
  }

  return { period, periodLabel, report: payload, purgeResult };
};

const getArchivedReports = async (user, query = {}) => {
  const shopId = user.shopId;
  const filter = { shopId };
  if (query.year) filter.year = Number(query.year);
  if (query.reportType) filter.reportType = query.reportType;

  const reports = await ReportArchive.find(filter)
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return reports;
};

const getProfitSummary = async (user, period = "month") => {
  const shopId = user.shopId;
  let start;
  let end;
  if (period === "today") ({ start, end } = getTodayRange());
  else if (period === "year") ({ start, end } = getYearRange());
  else ({ start, end } = getMonthRange());

  const salesData = await buildSalesReport(shopId, start, end);

  const payables = await PurchaseBill.aggregate([
    { $match: { shopId, balanceDue: { $gt: 0 } } },
    { $group: { _id: null, total: { $sum: "$balanceDue" } } },
  ]);

  const receivables = await Sale.aggregate([
    {
      $match: {
        shopId,
        balanceDue: { $gt: 0 },
        paymentPlan: { $in: ["credit", "emi"] },
      },
    },
    { $group: { _id: null, total: { $sum: "$balanceDue" } } },
  ]);

  const cashIn = await CashbookEntry.aggregate([
    {
      $match: {
        shopId,
        type: "in",
        entryDate: { $gte: start, $lte: end },
      },
    },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  const cashOut = await CashbookEntry.aggregate([
    {
      $match: {
        shopId,
        type: "out",
        entryDate: { $gte: start, $lte: end },
      },
    },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  return {
    period,
    sales: salesData.summary,
    payablesDue: payables[0]?.total || 0,
    receivablesDue: receivables[0]?.total || 0,
    cashIn: cashIn[0]?.total || 0,
    cashOut: cashOut[0]?.total || 0,
    netCashFlow: (cashIn[0]?.total || 0) - (cashOut[0]?.total || 0),
  };
};

export {
  getStockReport,
  getArchivedReports,
  getProfitSummary,
  purgePreviousYearOperationalData,
};
