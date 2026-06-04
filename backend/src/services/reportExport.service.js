import ExcelJS from "exceljs";
import { Product } from "../models/product.model.js";
import { Sale } from "../models/sale.model.js";
import { SaleReturn } from "../models/saleReturn.model.js";
import { RepairJob } from "../models/repairJob.model.js";
import { ApiError } from "../utils/ApiError.js";
import {
  getTodayRange,
  getMonthRange,
  getYearRange,
} from "../utils/dateRanges.js";
import {
  addReportTitle,
  addTableHeaders,
  addKeyValueRows,
  addDataRows,
  autoSizeColumns,
  addSheetTable,
  formatMoney,
} from "../utils/excelReportBuilder.js";

const resolvePeriod = (period, options = {}) => {
  if (period === "today") {
    const { start, end } = getTodayRange();
    return {
      start,
      end,
      periodLabel: `Today Report — ${start.toLocaleDateString("en-IN")}`,
      fileSlug: `today-${start.toISOString().slice(0, 10)}`,
    };
  }
  if (period === "month") {
    const { start, end } = getMonthRange();
    return {
      start,
      end,
      periodLabel: `Monthly Report — ${start.toLocaleString("default", { month: "long" })} ${start.getFullYear()}`,
      fileSlug: `month-${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
    };
  }
  if (period === "year") {
    const year = options.year || new Date().getFullYear();
    const { start, end } = getYearRange(year);
    return {
      start,
      end,
      year,
      periodLabel: `Yearly Business Report — ${year}`,
      fileSlug: `year-${year}`,
    };
  }
  throw new ApiError(400, "Invalid period. Use today, month, or year");
};

const loadProductsMap = async (shopId) => {
  const products = await Product.find({ shopId }).lean();
  return new Map(products.map((p) => [String(p._id), p]));
};

const fetchSales = (shopId, start, end) =>
  Sale.find({ shopId, createdAt: { $gte: start, $lte: end } })
    .populate("customerId", "name phone")
    .populate("items.productId", "name brand purchasePrice sellingPrice")
    .sort({ createdAt: -1 })
    .lean();

const fetchReturns = (shopId, start, end) =>
  SaleReturn.find({ shopId, createdAt: { $gte: start, $lte: end } })
    .populate("items.productId", "name brand")
    .sort({ createdAt: -1 })
    .lean();

const fetchRepairs = (shopId, start, end) =>
  RepairJob.find({ shopId, createdAt: { $gte: start, $lte: end } })
    .populate("customerId", "name")
    .sort({ createdAt: -1 })
    .lean();

const countProductsSold = (sales) =>
  sales.reduce(
    (sum, sale) =>
      sum + sale.items.reduce((q, item) => q + (item.quantity || 0), 0),
    0,
  );

const computeGrossProfit = (sales, productMap) => {
  let profit = 0;
  for (const sale of sales) {
    for (const item of sale.items) {
      const product =
        item.productId && typeof item.productId === "object"
          ? item.productId
          : productMap.get(String(item.productId));
      const cost = product?.purchasePrice || 0;
      profit += (item.price - cost) * item.quantity;
    }
  }
  return profit;
};

const buildSalesDetailRows = (sales) => {
  const rows = [];
  for (const sale of sales) {
    for (const item of sale.items) {
      const product = item.productId;
      rows.push({
        invoiceNumber: sale.invoiceNumber,
        customerName: sale.customerId?.name || "Walk-in Customer",
        product: product?.name || "Product",
        brand: product?.brand || "",
        quantity: item.quantity,
        amount: item.price * item.quantity,
        paymentMethod: sale.paymentMethod,
        date: sale.createdAt,
      });
    }
  }
  return rows;
};

const buildReturnRows = (returns) =>
  returns.flatMap((r) => {
    if (!r.items?.length) {
      return [
        {
          returnId: String(r._id).slice(-8).toUpperCase(),
          product: "—",
          quantity: 0,
          amount: r.totalRefund ?? 0,
          date: r.createdAt,
        },
      ];
    }
    return r.items.map((item) => ({
      returnId: String(r._id).slice(-8).toUpperCase(),
      product: item.productId?.name || "Product",
      quantity: item.quantity,
      amount: item.refundAmount ?? 0,
      date: r.createdAt,
    }));
  });

const buildRepairRows = (repairs) =>
  repairs.map((r) => ({
    repairId: r.jobNumber,
    product: r.deviceName,
    status: r.status,
    date: r.createdAt,
  }));

const aggregateTopProducts = (sales) => {
  const map = new Map();
  for (const sale of sales) {
    for (const item of sale.items) {
      const name = item.productId?.name || "Unknown";
      const prev = map.get(name) || { quantity: 0, revenue: 0 };
      prev.quantity += item.quantity;
      prev.revenue += item.price * item.quantity;
      map.set(name, prev);
    }
  }
  return [...map.entries()]
    .map(([productName, data]) => ({
      productName,
      quantitySold: data.quantity,
      revenue: data.revenue,
    }))
    .sort((a, b) => b.quantitySold - a.quantitySold);
};

const aggregateBrandRevenue = (sales) => {
  const map = new Map();
  for (const sale of sales) {
    for (const item of sale.items) {
      const brand = item.productId?.brand || "Unknown";
      map.set(brand, (map.get(brand) || 0) + item.price * item.quantity);
    }
  }
  return [...map.entries()]
    .map(([brandName, revenue]) => ({ brandName, revenue }))
    .sort((a, b) => b.revenue - a.revenue);
};

const aggregatePaymentMethods = (sales) => {
  const methods = ["cash", "upi", "card"];
  return methods.map((method) => {
    const filtered = sales.filter((s) => s.paymentMethod === method);
    return {
      method: method.toUpperCase(),
      salesCount: filtered.length,
      totalAmount: filtered.reduce((s, sale) => s + sale.totalAmount, 0),
    };
  });
};

const buildMonthlyBreakdown = async (shopId, year, productMap) => {
  const months = [];
  for (let m = 0; m < 12; m += 1) {
    const start = new Date(year, m, 1);
    const end = new Date(year, m + 1, 0, 23, 59, 59, 999);
    const sales = await fetchSales(shopId, start, end);
    const revenue = sales.reduce((s, sale) => s + sale.totalAmount, 0);
    const profit = computeGrossProfit(sales, productMap);
    months.push({
      month: start.toLocaleString("default", { month: "long" }),
      revenue,
      profit,
    });
  }
  return months;
};

const addSummarySheet = (workbook, title, generatedAt, entries) => {
  const sheet = workbook.addWorksheet("Summary");
  addReportTitle(sheet, title, generatedAt, 4);
  addKeyValueRows(sheet, 4, entries);
  autoSizeColumns(sheet);
};

const gatherPeriodData = async (shopId, start, end) => {
  const [sales, returns, repairs, productMap] = await Promise.all([
    fetchSales(shopId, start, end),
    fetchReturns(shopId, start, end),
    fetchRepairs(shopId, start, end),
    loadProductsMap(shopId),
  ]);

  const totalRevenue = sales.reduce((s, sale) => s + sale.totalAmount, 0);
  const totalReturns = returns.reduce((s, r) => s + (r.totalRefund || 0), 0);
  const grossProfit = computeGrossProfit(sales, productMap);
  const productsSold = countProductsSold(sales);

  return {
    sales,
    returns,
    repairs,
    productMap,
    metrics: {
      totalRevenue,
      totalReturns,
      grossProfit,
      productsSold,
      invoiceCount: sales.length,
      returnCount: returns.length,
      repairCount: repairs.length,
      netRevenue: totalRevenue - totalReturns,
      averageSaleValue:
        sales.length > 0 ? totalRevenue / sales.length : 0,
    },
    salesRows: buildSalesDetailRows(sales),
    returnRows: buildReturnRows(returns),
    repairRows: buildRepairRows(repairs),
    topProducts: aggregateTopProducts(sales),
    topBrands: aggregateBrandRevenue(sales),
    paymentMethods: aggregatePaymentMethods(sales),
  };
};

const buildTodayWorkbook = async (shopId, periodMeta) => {
  const generatedAt = new Date();
  const data = await gatherPeriodData(shopId, periodMeta.start, periodMeta.end);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Mobile Shop Inventory";
  workbook.created = generatedAt;

  addSummarySheet(workbook, periodMeta.periodLabel, generatedAt, [
    ["Total Sales Amount", formatMoney(data.metrics.totalRevenue)],
    ["Total Invoices", data.metrics.invoiceCount],
    ["Total Products Sold", data.metrics.productsSold],
    ["Total Returns", formatMoney(data.metrics.totalReturns)],
    ["Total Repairs", data.metrics.repairCount],
    ["Net Revenue", formatMoney(data.metrics.netRevenue)],
  ]);

  addSheetTable(
    workbook,
    "Sales",
    "Sales Detail",
    generatedAt,
    [
      "Invoice Number",
      "Customer Name",
      "Product",
      "Quantity",
      "Amount",
      "Payment Method",
      "Date",
    ],
    data.salesRows,
    [
      { key: "invoiceNumber" },
      { key: "customerName" },
      { key: "product" },
      { key: "quantity" },
      { key: "amount", format: "money" },
      { key: "paymentMethod" },
      { key: "date", format: "date" },
    ],
  );

  addSheetTable(
    workbook,
    "Returns",
    "Returns Detail",
    generatedAt,
    ["Return ID", "Product", "Quantity", "Amount", "Date"],
    data.returnRows,
    [
      { key: "returnId" },
      { key: "product" },
      { key: "quantity" },
      { key: "amount", format: "money" },
      { key: "date", format: "date" },
    ],
  );

  addSheetTable(
    workbook,
    "Repairs",
    "Repairs Detail",
    generatedAt,
    ["Repair ID", "Product", "Status", "Date"],
    data.repairRows,
    [
      { key: "repairId" },
      { key: "product" },
      { key: "status" },
      { key: "date", format: "date" },
    ],
  );

  return { workbook, filename: `report-${periodMeta.fileSlug}.xlsx` };
};

const buildMonthWorkbook = async (shopId, periodMeta) => {
  const generatedAt = new Date();
  const data = await gatherPeriodData(shopId, periodMeta.start, periodMeta.end);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Mobile Shop Inventory";
  workbook.created = generatedAt;

  addSummarySheet(workbook, periodMeta.periodLabel, generatedAt, [
    ["Total Revenue", formatMoney(data.metrics.totalRevenue)],
    ["Total Profit", formatMoney(data.metrics.grossProfit)],
    ["Total Products Sold", data.metrics.productsSold],
    ["Total Returns", formatMoney(data.metrics.totalReturns)],
    ["Total Repairs", data.metrics.repairCount],
    ["Average Sale Value", formatMoney(data.metrics.averageSaleValue)],
  ]);

  const addSheet = (name, title, headers, rows, columns) => {
    const sheet = workbook.addWorksheet(name);
    addReportTitle(sheet, title, generatedAt, headers.length);
    addTableHeaders(sheet, 4, headers);
    addDataRows(sheet, 5, rows, columns);
    autoSizeColumns(sheet);
  };

  addSheet(
    "Sales",
    "Sales Detail",
    [
      "Invoice Number",
      "Customer Name",
      "Product",
      "Quantity",
      "Amount",
      "Payment Method",
      "Date",
    ],
    data.salesRows,
    [
      { key: "invoiceNumber" },
      { key: "customerName" },
      { key: "product" },
      { key: "quantity" },
      { key: "amount", format: "money" },
      { key: "paymentMethod" },
      { key: "date", format: "date" },
    ],
  );

  addSheet(
    "Returns",
    "Returns Detail",
    ["Return ID", "Product", "Quantity", "Amount", "Date"],
    data.returnRows,
    [
      { key: "returnId" },
      { key: "product" },
      { key: "quantity" },
      { key: "amount", format: "money" },
      { key: "date", format: "date" },
    ],
  );

  addSheet(
    "Repairs",
    "Repairs Detail",
    ["Repair ID", "Product", "Status", "Date"],
    data.repairRows,
    [
      { key: "repairId" },
      { key: "product" },
      { key: "status" },
      { key: "date", format: "date" },
    ],
  );

  addSheet(
    "Top Products",
    "Top Products",
    ["Product Name", "Quantity Sold"],
    data.topProducts,
    [{ key: "productName" }, { key: "quantitySold" }],
  );

  addSheet(
    "Brand Performance",
    "Brand Performance",
    ["Brand Name", "Revenue"],
    data.topBrands,
    [{ key: "brandName" }, { key: "revenue", format: "money" }],
  );

  addSheet(
    "Payment Methods",
    "Payment Methods",
    ["Payment Method", "Invoice Count", "Total Amount"],
    data.paymentMethods,
    [
      { key: "method" },
      { key: "salesCount" },
      { key: "totalAmount", format: "money" },
    ],
  );

  return { workbook, filename: `report-${periodMeta.fileSlug}.xlsx` };
};

const buildYearWorkbook = async (shopId, periodMeta) => {
  const generatedAt = new Date();
  const { year } = periodMeta;
  const data = await gatherPeriodData(shopId, periodMeta.start, periodMeta.end);
  const monthlyRows = await buildMonthlyBreakdown(
    shopId,
    year,
    data.productMap,
  );

  const monthsWithRevenue = monthlyRows.filter((m) => m.revenue > 0).length;
  const avgMonthlyRevenue =
    monthsWithRevenue > 0
      ? data.metrics.totalRevenue / monthsWithRevenue
      : data.metrics.totalRevenue / 12;

  const products = await Product.find({ shopId }).lean();
  const inventoryRows = products.map((p) => ({
    productName: p.name,
    currentStock: p.currentStock,
    purchasePrice: p.purchasePrice,
    sellingPrice: p.sellingPrice,
  }));

  const lowStockRows = products
    .filter((p) => p.currentStock <= p.lowStockThreshold)
    .map((p) => ({
      productName: p.name,
      currentStock: p.currentStock,
      lowStockThreshold: p.lowStockThreshold,
      brand: p.brand,
    }));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Mobile Shop Inventory";
  workbook.created = generatedAt;

  addSummarySheet(workbook, periodMeta.periodLabel, generatedAt, [
    ["Total Revenue", formatMoney(data.metrics.totalRevenue)],
    ["Total Profit", formatMoney(data.metrics.grossProfit)],
    ["Total Products Sold", data.metrics.productsSold],
    ["Total Returns", formatMoney(data.metrics.totalReturns)],
    ["Total Repairs", data.metrics.repairCount],
    ["Average Monthly Revenue", formatMoney(avgMonthlyRevenue)],
  ]);

  const addSheet = (name, title, headers, rows, columns) => {
    const sheet = workbook.addWorksheet(name);
    addReportTitle(sheet, title, generatedAt, headers.length);
    addTableHeaders(sheet, 4, headers);
    addDataRows(sheet, 5, rows, columns);
    autoSizeColumns(sheet);
  };

  addSheet(
    "Monthly Breakdown",
    "Monthly Breakdown",
    ["Month", "Revenue", "Profit"],
    monthlyRows,
    [
      { key: "month" },
      { key: "revenue", format: "money" },
      { key: "profit", format: "money" },
    ],
  );

  addSheet(
    "Top Products",
    "Top Products",
    ["Product Name", "Quantity Sold", "Revenue Generated"],
    data.topProducts,
    [
      { key: "productName" },
      { key: "quantitySold" },
      { key: "revenue", format: "money" },
    ],
  );

  addSheet(
    "Top Brands",
    "Top Brands",
    ["Brand Name", "Revenue Generated"],
    data.topBrands,
    [{ key: "brandName" }, { key: "revenue", format: "money" }],
  );

  addSheet(
    "Current Inventory",
    "Current Inventory",
    ["Product Name", "Current Stock", "Purchase Price", "Selling Price"],
    inventoryRows,
    [
      { key: "productName" },
      { key: "currentStock" },
      { key: "purchasePrice", format: "money" },
      { key: "sellingPrice", format: "money" },
    ],
  );

  addSheet(
    "Low Stock",
    "Low Stock Alert",
    ["Product Name", "Current Stock", "Low Stock Threshold", "Brand"],
    lowStockRows,
    [
      { key: "productName" },
      { key: "currentStock" },
      { key: "lowStockThreshold" },
      { key: "brand" },
    ],
  );

  addSheet(
    "Sales",
    "Sales Detail (Year)",
    [
      "Invoice Number",
      "Customer Name",
      "Product",
      "Quantity",
      "Amount",
      "Payment Method",
      "Date",
    ],
    data.salesRows,
    [
      { key: "invoiceNumber" },
      { key: "customerName" },
      { key: "product" },
      { key: "quantity" },
      { key: "amount", format: "money" },
      { key: "paymentMethod" },
      { key: "date", format: "date" },
    ],
  );

  addSheet(
    "Returns",
    "Returns Detail (Year)",
    ["Return ID", "Product", "Quantity", "Amount", "Date"],
    data.returnRows,
    [
      { key: "returnId" },
      { key: "product" },
      { key: "quantity" },
      { key: "amount", format: "money" },
      { key: "date", format: "date" },
    ],
  );

  addSheet(
    "Repairs",
    "Repairs Detail (Year)",
    ["Repair ID", "Product", "Status", "Date"],
    data.repairRows,
    [
      { key: "repairId" },
      { key: "product" },
      { key: "status" },
      { key: "date", format: "date" },
    ],
  );

  return { workbook, filename: `report-${periodMeta.fileSlug}.xlsx` };
};

const exportReportExcel = async (user, period, options = {}) => {
  const shopId = user?.shopId;
  if (!shopId) throw new ApiError(401, "Unauthorized shop access");

  const periodMeta = resolvePeriod(period, options);

  if (period === "today") {
    return buildTodayWorkbook(shopId, periodMeta);
  }
  if (period === "month") {
    return buildMonthWorkbook(shopId, periodMeta);
  }
  if (period === "year") {
    return buildYearWorkbook(shopId, periodMeta);
  }

  throw new ApiError(400, "Invalid export period");
};

export { exportReportExcel };
