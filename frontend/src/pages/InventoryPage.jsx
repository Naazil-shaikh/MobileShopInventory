import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { inventoryService } from "../services/inventory.service.js";
import { productService } from "../services/product.service.js";
import { QUERY_KEYS } from "../utils/constants.js";
import { Pagination } from "../components/ui/Pagination.jsx";
import { PageLoader } from "../components/ui/LoadingSpinner.jsx";
import { StockActionModal } from "../components/inventory/StockActionModal.jsx";
import { Alert } from "../components/ui/Alert.jsx";
import { formatDate, getApiErrorMessage } from "../utils/format.js";

const actionMap = {
  add: inventoryService.addStock,
  reduce: inventoryService.reduceStock,
  return: inventoryService.returnStock,
  damage: inventoryService.recordDamage,
};

// ── helpers ───────────────────────────────────────────────────────────────────

const ACTION_STYLES = {
  add: "bg-emerald-100 text-emerald-700 border-emerald-200",
  reduce: "bg-amber-100 text-amber-700 border-amber-200",
  return: "bg-blue-100 text-blue-700 border-blue-200",
  damage: "bg-rose-100 text-rose-700 border-rose-200",
};

function ActionButton({ label, type, onClick }) {
  return (
    <button
      onClick={() => onClick(type)}
      className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-all duration-150 hover:-translate-y-0.5 ${
        ACTION_STYLES[type]
      }`}
    >
      {label}
    </button>
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

          <p className="mt-1 text-xs text-amber-700">
            Restock recommended soon
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

function TransactionCard({ tx }) {
  const type = tx.type?.toLowerCase();

  const styles =
    ACTION_STYLES[type] ||
    "bg-slate-100 text-slate-700 border-slate-200";

  const isIncrease =
    tx.newStock > tx.previousStock ||
    type === "add" ||
    type === "return";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-slate-800 truncate">
              {tx.productId?.name || "Product"}
            </h3>

            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${styles}`}
            >
              {tx.type}
            </span>
          </div>

          <div className="mt-2 flex items-center gap-3 flex-wrap text-xs text-slate-500">
            <span>
              Qty:{" "}
              <span className="font-semibold text-slate-700">
                {tx.quantity}
              </span>
            </span>

            <span>
              {tx.previousStock} → {tx.newStock}
            </span>

            <span>{formatDate(tx.createdAt)}</span>
          </div>
        </div>

        <div
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
            isIncrease
              ? "bg-emerald-100 text-emerald-700"
              : "bg-rose-100 text-rose-700"
          }`}
        >
          {isIncrease ? "+" : "-"} Stock
        </div>
      </div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export const InventoryPage = () => {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [actionType, setActionType] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { data: productsData } = useQuery({
    queryKey: [QUERY_KEYS.products, "inventory"],
    queryFn: () => productService.getAll({ page: 1, limit: 100 }),
  });

  const { data: lowStock, isLoading: lowStockLoading } = useQuery({
    queryKey: [QUERY_KEYS.lowStock],
    queryFn: inventoryService.getLowStock,
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: [QUERY_KEYS.inventoryHistory, page],
    queryFn: () => inventoryService.getHistory({ page, limit: 10 }),
  });

  const stockMutation = useMutation({
    mutationFn: ({ type, payload }) => actionMap[type](payload),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.inventoryHistory],
      });

      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.lowStock],
      });

      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.products],
      });

      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.dashboard],
      });

      queryClient.invalidateQueries({
        queryKey: ["payables", "finance-overview"],
      });

      setActionType(null);
      setSuccess("Stock updated successfully");
      setError("");
    },

    onError: (err) => setError(getApiErrorMessage(err)),
  });

  return (
    <div className="pb-10">
      {/* ── page header ── */}
      <div className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Inventory
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage stock adjustments and monitor inventory activity
          </p>
        </div>

        {/* actions */}
        <div className="flex flex-wrap gap-2">
          <ActionButton
            label="Add Stock"
            type="add"
            onClick={setActionType}
          />

          <ActionButton
            label="Reduce"
            type="reduce"
            onClick={setActionType}
          />

          <ActionButton
            label="Return"
            type="return"
            onClick={setActionType}
          />

          <ActionButton
            label="Damage"
            type="damage"
            onClick={setActionType}
          />
        </div>
      </div>

      <Alert type="error" message={error} />
      <Alert type="success" message={success} />

      {/* ── low stock alerts ── */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold tracking-tight text-slate-900">
            Low Stock Alerts
          </h2>

          <p className="mt-0.5 text-xs text-slate-400">
            Products requiring immediate restocking attention
          </p>
        </div>

        <div className="p-4">
          {lowStockLoading ? (
            <div className="flex justify-center py-8">
              <PageLoader />
            </div>
          ) : lowStock?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-lg font-bold">
                ✓
              </div>

              <p className="mt-4 text-sm font-medium text-slate-700">
                Inventory levels look healthy
              </p>

              <p className="mt-1 text-xs text-slate-400">
                No products are currently below threshold
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {lowStock.map((p) => (
                <LowStockCard key={p._id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── transaction history ── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold tracking-tight text-slate-900">
            Transaction History
          </h2>

          <p className="mt-0.5 text-xs text-slate-400">
            Recent inventory movements and stock updates
          </p>
        </div>

        <div className="p-4">
          {historyLoading ? (
            <div className="flex justify-center py-10">
              <PageLoader />
            </div>
          ) : historyData?.transactions?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm font-medium text-slate-700">
                No inventory transactions yet
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Stock updates and movements will appear here
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {historyData?.transactions?.map((tx) => (
                  <TransactionCard key={tx._id} tx={tx} />
                ))}
              </div>

              <div className="mt-5">
                <Pagination
                  pagination={historyData?.pagination}
                  onPageChange={setPage}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── stock modal ── */}
      <StockActionModal
        isOpen={Boolean(actionType)}
        onClose={() => setActionType(null)}
        actionType={actionType}
        products={productsData?.products ?? []}
        isLoading={stockMutation.isPending}
        onSubmit={(data) =>
          stockMutation.mutate({
            type: actionType,
            payload: data,
          })
        }
      />
    </div>
  );
};