import { Product } from "../models/product.model.js";
import { Installment } from "../models/installment.model.js";
import { PurchaseBill } from "../models/purchaseBill.model.js";
import { PurchaseOrder } from "../models/purchaseOrder.model.js";
import { RepairJob } from "../models/repairJob.model.js";
import { MobileUnit } from "../models/mobileUnit.model.js";

const getAlerts = async (user) => {
  const shopId = user?.shopId;
  if (!shopId) return { alerts: [] };

  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const lowStock = await Product.find({
    shopId,
    $expr: { $lte: ["$currentStock", "$lowStockThreshold"] },
  })
    .select("name currentStock lowStockThreshold")
    .limit(10)
    .lean();

  const overdueEmi = await Installment.find({
    shopId,
    status: { $in: ["pending", "partial", "overdue"] },
    dueDate: { $lt: now },
  })
    .populate("customerId", "name phone")
    .limit(10)
    .lean();

  const upcomingEmi = await Installment.find({
    shopId,
    status: { $in: ["pending", "partial"] },
    dueDate: { $gte: now, $lte: in7Days },
  })
    .populate("customerId", "name")
    .limit(10)
    .lean();

  const overdueBills = await PurchaseBill.find({
    shopId,
    balanceDue: { $gt: 0 },
    dueDate: { $lt: now },
  })
    .populate("supplierId", "name")
    .limit(10)
    .lean();

  const pendingPOs = await PurchaseOrder.countDocuments({
    shopId,
    status: { $in: ["ordered", "partial"] },
  });

  const activeRepairs = await RepairJob.countDocuments({
    shopId,
    status: { $in: ["received", "in_progress"] },
  });

  const staleImei = await MobileUnit.countDocuments({
    shopId,
    status: "in_stock",
    createdAt: { $lt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) },
  });

  const alerts = [];

  if (lowStock.length) {
    alerts.push({
      type: "low_stock",
      severity: "warning",
      count: lowStock.length,
      message: `${lowStock.length} product(s) are low on stock`,
      items: lowStock,
    });
  }

  if (overdueEmi.length) {
    alerts.push({
      type: "overdue_emi",
      severity: "danger",
      count: overdueEmi.length,
      message: `${overdueEmi.length} overdue customer EMI payment(s)`,
      items: overdueEmi,
    });
  }

  if (upcomingEmi.length) {
    alerts.push({
      type: "upcoming_emi",
      severity: "info",
      count: upcomingEmi.length,
      message: `${upcomingEmi.length} EMI due in next 7 days`,
      items: upcomingEmi,
    });
  }

  if (overdueBills.length) {
    alerts.push({
      type: "overdue_payable",
      severity: "danger",
      count: overdueBills.length,
      message: `${overdueBills.length} overdue supplier bill(s)`,
      items: overdueBills,
    });
  }

  if (pendingPOs > 0) {
    alerts.push({
      type: "pending_po",
      severity: "info",
      count: pendingPOs,
      message: `${pendingPOs} purchase order(s) awaiting receipt`,
    });
  }

  if (activeRepairs > 0) {
    alerts.push({
      type: "active_repairs",
      severity: "info",
      count: activeRepairs,
      message: `${activeRepairs} repair job(s) in progress`,
    });
  }

  if (staleImei > 0) {
    alerts.push({
      type: "stale_imei",
      severity: "warning",
      count: staleImei,
      message: `${staleImei} device(s) in stock for 90+ days`,
    });
  }

  return { alerts, total: alerts.length };
};

export { getAlerts };
