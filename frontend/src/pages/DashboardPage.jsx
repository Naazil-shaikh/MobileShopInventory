import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { dashboardService } from "../services/dashboard.service.js";
import { reportService } from "../services/report.service.js";
import { alertService } from "../services/alert.service.js";
import { QUERY_KEYS } from "../utils/constants.js";
import { PageLoader } from "../components/ui/LoadingSpinner.jsx";
import { formatCurrency, formatDate, getApiErrorMessage } from "../utils/format.js";
import { Alert } from "../components/ui/Alert.jsx";

// ── helpers ───────────────────────────────────────────────────────────────────

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function StatBlock({ title, value, subtitle, accent = "violet" }) {
  const accents = {
    violet:
      "bg-violet-50 border-violet-100 text-violet-700 shadow-violet-100",
    emerald:
      "bg-emerald-50 border-emerald-100 text-emerald-700 shadow-emerald-100",
    amber: "bg-amber-50 border-amber-100 text-amber-700 shadow-amber-100",
    slate: "bg-slate-50 border-slate-200 text-slate-700 shadow-slate-100",
  };

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 ${accents[accent]}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">
            {title}
          </p>

          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </h2>

          {subtitle && (
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          )}
        </div>

        <div className="w-11 h-11 rounded-xl bg-white/70 border border-white flex items-center justify-center shadow-sm">
          <div className="w-2.5 h-2.5 rounded-full bg-current opacity-80" />
        </div>
      </div>
    </div>
  );
}

function SaleCard({ sale }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 hover:bg-white transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold shrink-0">
          {getInitials(sale.customerId?.name || "NA")}
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">
            {sale.invoiceNumber}
          </p>

          <p className="text-xs text-slate-500 truncate">
            {sale.customerId?.name || "Walk-in Customer"} ·{" "}
            {formatDate(sale.createdAt)}
          </p>
        </div>
      </div>

      <div className="text-right shrink-0 ml-3">
        <p className="text-sm font-bold text-emerald-600">
          {formatCurrency(sale.totalAmount)}
        </p>

        <div className="mt-1 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
          Paid
        </div>
      </div>
    </div>
  );
}

function LowStockCard({ product }) {
  const percentage = Math.min(
    (product.currentStock / product.lowStockThreshold) * 100,
    100
  );

  return (
    <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">
            {product.name}
          </h3>

          <p className="mt-1 text-xs text-amber-700 font-medium">
            Low stock detected
          </p>
        </div>

        <div className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
          {product.currentStock} left
        </div>
      </div>

      <div className="mt-4">
        <div className="h-2 overflow-hidden rounded-full bg-amber-100">
          <div
            className="h-full rounded-full bg-amber-500 transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
          <span>Current stock</span>
          <span>Threshold: {product.lowStockThreshold}</span>
        </div>
      </div>
    </div>
  );
}

function ActivityItem({ tx }) {
  const isIncrease =
    tx.newStock > tx.previousStock ||
    tx.type?.toLowerCase()?.includes("add");

  return (
    <div className="relative flex gap-4 pl-6">
      <div
        className={`absolute left-0 top-1.5 w-3 h-3 rounded-full border-2 ${
          isIncrease
            ? "bg-emerald-500 border-emerald-100"
            : "bg-amber-500 border-amber-100"
        }`}
      />

      <div className="flex-1 border-b border-slate-100 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-800">
              {tx.productId?.name || "Product"}
            </p>

            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  isIncrease
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {tx.type}
              </span>

              <span className="text-xs text-slate-500">
                {tx.previousStock} → {tx.newStock}
              </span>
            </div>
          </div>

          <span className="text-xs text-slate-400 shrink-0">
            {formatDate(tx.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export const DashboardPage = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: [QUERY_KEYS.dashboard],
    queryFn: dashboardService.getSummary,
  });

  const { data: profit } = useQuery({
    queryKey: ["profit-month"],
    queryFn: () => reportService.getProfit("month"),
  });

  const { data: alerts } = useQuery({
    queryKey: ["alerts"],
    queryFn: alertService.getAll,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <PageLoader />
      </div>
    );
  }

  if (error) {
    return (
      <Alert type="error" message={getApiErrorMessage(error)} />
    );
  }

  return (
    <div className="pb-10">
      {/* ── page header ── */}
      <div className="mb-7 flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Dashboard
        </h1>

        <p className="text-sm text-slate-500">
          Overview of inventory, stock activity, and recent sales
        </p>
      </div>

      {/* ── stat cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatBlock
          title="Total Products"
          value={data.totalProducts}
          accent="violet"
        />

        <StatBlock
          title="Low Stock Items"
          value={data.lowStockCount}
          subtitle="Needs attention"
          accent="amber"
        />

        <StatBlock
          title="Total Sales"
          value={data.totalSales}
          accent="emerald"
        />

        <StatBlock
          title="Stock Value"
          value={formatCurrency(data.totalStockValue)}
          accent="slate"
        />
      </div>

      {/* ── mid section ── */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* low stock */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-bold tracking-tight text-slate-900">
                Low Stock Alerts
              </h2>

              <p className="text-xs text-slate-400 mt-0.5">
                Products nearing critical levels
              </p>
            </div>

            <Link
              to="/inventory"
              className="text-sm font-medium text-violet-600 hover:text-violet-700"
            >
              View inventory →
            </Link>
          </div>

          <div className="p-4">
            {data.lowStockProducts?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-lg font-bold">
                  ✓
                </div>

                <p className="mt-4 text-sm font-medium text-slate-700">
                  Inventory levels look healthy
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  No products currently require restocking
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.lowStockProducts.slice(0, 5).map((p) => (
                  <LowStockCard key={p._id} product={p} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* recent sales */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-bold tracking-tight text-slate-900">
                Recent Sales
              </h2>

              <p className="text-xs text-slate-400 mt-0.5">
                Latest completed transactions
              </p>
            </div>

            <Link
              to="/sales"
              className="text-sm font-medium text-violet-600 hover:text-violet-700"
            >
              View all →
            </Link>
          </div>

          <div className="p-4">
            {data.recentSales?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-lg font-bold">
                  ₹
                </div>

                <p className="mt-4 text-sm font-medium text-slate-700">
                  No sales recorded yet
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Completed sales will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.recentSales.map((sale) => (
                  <SaleCard key={sale._id} sale={sale} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── inventory activity ── */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold tracking-tight text-slate-900">
            Recent Inventory Activity
          </h2>

          <p className="text-xs text-slate-400 mt-0.5">
            Latest stock movement and inventory updates
          </p>
        </div>

        <div className="p-5">
          {data.recentTransactions?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm font-medium text-slate-700">
                No inventory activity yet
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Stock changes and transactions will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.recentTransactions.map((tx) => (
                <ActivityItem key={tx._id} tx={tx} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Profit & Cash (This Month)</h2>
          {profit && (
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>Gross profit: {formatCurrency(profit.sales?.grossProfit)}</li>
              <li>Net cash flow: {formatCurrency(profit.netCashFlow)}</li>
              <li>Receivables due: {formatCurrency(profit.receivablesDue)}</li>
              <li>Payables due: {formatCurrency(profit.payablesDue)}</li>
            </ul>
          )}
          <Link to="/finance" className="mt-3 inline-block text-sm font-medium text-violet-700">
            Open Finance →
          </Link>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">
            Alerts ({alerts?.total || 0})
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {alerts?.alerts?.slice(0, 5).map((a) => (
              <li key={a.type} className="rounded-lg bg-slate-50 px-3 py-2">
                {a.message}
              </li>
            ))}
          </ul>
          <Link to="/reports" className="mt-3 inline-block text-sm font-medium text-violet-700">
            View Reports →
          </Link>
        </div>
      </div>
    </div>
  );
};