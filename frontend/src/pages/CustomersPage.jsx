import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { customerSchema } from "../schemas/customer.schema.js";
import { customerService } from "../services/customer.service.js";
import { saleService } from "../services/sale.service.js";
import { QUERY_KEYS } from "../utils/constants.js";
import { PageLoader } from "../components/ui/LoadingSpinner.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { Alert } from "../components/ui/Alert.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { Input } from "../components/ui/Input.jsx";
import { Pagination } from "../components/ui/Pagination.jsx";
import { formatCurrency, formatDate, getApiErrorMessage } from "../utils/format.js";

// ── helpers ───────────────────────────────────────────────────────────────────

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

const AVATAR_PALETTES = [
  "bg-indigo-100 text-indigo-700",
  "bg-emerald-100 text-emerald-700",
  "bg-orange-100 text-orange-700",
  "bg-purple-100 text-purple-700",
  "bg-cyan-100 text-cyan-700",
];

function avatarClass(name = "") {
  return AVATAR_PALETTES[name.charCodeAt(0) % AVATAR_PALETTES.length];
}

// ── sub-components ────────────────────────────────────────────────────────────

function CustomerRow({ customer, isSelected, onSelect }) {
  return (
    <tr
      onClick={() => onSelect(customer._id)}
      className={`cursor-pointer border-b border-slate-100 transition-colors duration-150 ${
        isSelected ? "bg-violet-50" : "hover:bg-slate-50"
      }`}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 tracking-wide ${avatarClass(
              customer.name
            )}`}
          >
            {getInitials(customer.name)}
          </div>
          <span className="text-sm font-medium text-slate-900">{customer.name}</span>
        </div>
      </td>

      <td className="px-4 py-3 text-sm text-slate-500">{customer.phone}</td>
      <td className="px-4 py-3 text-xs text-slate-400">{customer.address || "—"}</td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(customer._id);
          }}
          className={`text-xs font-medium px-3 py-1.5 rounded-md border transition-all duration-150 ${
            isSelected
              ? "bg-violet-100 text-violet-700 border-violet-300"
              : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
          }`}
        >
          {isSelected ? "Viewing" : "View purchases"}
        </button>
      </td>
    </tr>
  );
}

function SaleCard({ sale }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-800 tracking-tight">
          {sale.invoiceNumber}
        </span>
        <span className="text-sm font-bold text-emerald-600">
          {formatCurrency(sale.totalAmount)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs bg-slate-200 text-slate-600 rounded px-2 py-0.5">
          {formatDate(sale.createdAt)}
        </span>
        <span className="text-xs bg-violet-100 text-violet-700 rounded px-2 py-0.5">
          {sale.paymentMethod}
        </span>
      </div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export const CustomersPage = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [error, setError] = useState("");

  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: [QUERY_KEYS.sales, "customers-list"],
    queryFn: () => saleService.getHistory({ page: 1, limit: 100 }),
  });

  const { data: createdCustomers = [] } = useQuery({
    queryKey: ["created-customers"],
    queryFn: () => [],
    staleTime: Infinity,
    initialData: [],
  });

  const customers = useMemo(() => {
    const map = new Map();
    createdCustomers.forEach((c) => map.set(c._id, c));
    salesData?.sales?.forEach((s) => {
      if (s.customerId?._id) map.set(s.customerId._id, s.customerId);
    });
    return Array.from(map.values());
  }, [salesData, createdCustomers]);

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: [QUERY_KEYS.customerPurchases, selectedId, historyPage],
    queryFn: () =>
      customerService.getPurchaseHistory(selectedId, { page: historyPage, limit: 5 }),
    enabled: Boolean(selectedId),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(customerSchema) });

  const createMutation = useMutation({
    mutationFn: customerService.create,
    onSuccess: (newCustomer) => {
      queryClient.setQueryData(["created-customers"], (old = []) => [
        newCustomer,
        ...old.filter((c) => c._id !== newCustomer._id),
      ]);
      setModalOpen(false);
      reset();
      setError("");
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  const selectedCustomer = historyData?.customer;

  return (
    <div className="pb-10">
      {/* ── page header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Customers</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Manage customers and view purchase history
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm shadow-violet-200 transition-colors duration-150"
        >
          <span className="text-base leading-none">+</span>
          Add Customer
        </button>
      </div>

      <Alert type="error" message={error} />

      {/* ── two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 items-start">

        {/* ── left: customer table ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* column headers */}
          <div className="grid grid-cols-[2fr_1.2fr_1.5fr_120px] px-4 py-2.5 bg-slate-50 border-b border-slate-200">
            {["Customer", "Phone", "Address", ""].map((h, i) => (
              <span
                key={i}
                className={`text-[10px] font-semibold text-slate-400 uppercase tracking-widest ${
                  i === 3 ? "text-right" : ""
                }`}
              >
                {h}
              </span>
            ))}
          </div>

          {salesLoading ? (
            <div className="p-10 flex justify-center">
              <PageLoader />
            </div>
          ) : customers.length === 0 ? (
            <div className="p-12">
              <EmptyState
                title="No customers yet"
                description="Create a customer or complete a sale"
              />
            </div>
          ) : (
            <table className="w-full border-collapse">
              <tbody>
                {customers.map((c) => (
                  <CustomerRow
                    key={c._id}
                    customer={c}
                    isSelected={selectedId === c._id}
                    onSelect={(id) => {
                      setSelectedId(id);
                      setHistoryPage(1);
                    }}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── right: purchase history panel ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* panel header */}
          <div className="flex items-center gap-3 px-4 py-3.5 bg-slate-50 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#7C3AED"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 leading-tight">
                Purchase History
              </p>
              {selectedCustomer && (
                <p className="text-xs text-slate-400 leading-tight mt-0.5">
                  {selectedCustomer.name} · {selectedCustomer.phone}
                </p>
              )}
            </div>
          </div>

          {/* panel body */}
          <div className="p-4">
            {!selectedId ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-slate-300">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
                </svg>
                <p className="text-sm text-slate-400 text-center leading-relaxed">
                  Select a customer
                  <br />
                  to view their purchases
                </p>
              </div>
            ) : historyLoading ? (
              <div className="py-8 flex justify-center">
                <PageLoader />
              </div>
            ) : (
              <>
                {historyData?.sales?.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">No purchases yet.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {historyData.sales.map((sale) => (
                      <SaleCard key={sale._id} sale={sale} />
                    ))}
                  </div>
                )}
                <div className="mt-4">
                  <Pagination
                    pagination={historyData?.pagination}
                    onPageChange={setHistoryPage}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── add customer modal ── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Customer"
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit((d) => createMutation.mutate(d))}
              disabled={isSubmitting || createMutation.isPending}
              className="px-5 py-2 text-sm font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:bg-violet-300 disabled:cursor-not-allowed transition-colors"
            >
              {createMutation.isPending ? "Creating…" : "Create Customer"}
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <Input label="Name" error={errors.name?.message} {...register("name")} />
          <Input label="Phone" error={errors.phone?.message} {...register("phone")} />
          <Input label="Address" error={errors.address?.message} {...register("address")} />
        </div>
      </Modal>
    </div>
  );
};