import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { financeService } from "../services/finance.service.js";
import { supplierService } from "../services/supplier.service.js";
import { formatCurrency, getApiErrorMessage } from "../utils/format.js";
import { Card, StatCard } from "../components/ui/Card.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Input } from "../components/ui/Input.jsx";
import { Alert } from "../components/ui/Alert.jsx";
import { PageLoader } from "../components/ui/LoadingSpinner.jsx";

export const FinancePage = () => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("overview");
  const [error, setError] = useState("");
  const [billForm, setBillForm] = useState({
    supplierId: "",
    billNumber: "",
    totalAmount: "",
    paidAmount: "0",
  });

  const { data: overview, isLoading } = useQuery({
    queryKey: ["finance-overview"],
    queryFn: financeService.getOverview,
  });

  const { data: payables } = useQuery({
    queryKey: ["payables"],
    queryFn: () => financeService.listPayables({ page: 1, limit: 20 }),
    enabled: tab === "payables",
  });

  const { data: receivables } = useQuery({
    queryKey: ["receivables"],
    queryFn: () => financeService.listReceivables({ page: 1, limit: 20 }),
    enabled: tab === "receivables",
  });

  const { data: cashbook } = useQuery({
    queryKey: ["cashbook"],
    queryFn: () => financeService.getCashbook({ page: 1, limit: 20 }),
    enabled: tab === "cashbook",
  });

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers-finance"],
    queryFn: () => supplierService.getAll({ page: 1, limit: 100 }),
  });

  const createBillMutation = useMutation({
    mutationFn: financeService.createPayable,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payables", "finance-overview"] });
      setError("");
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  const payBillMutation = useMutation({
    mutationFn: ({ id, amount }) =>
      financeService.payBill(id, { amount, paymentDate: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payables", "finance-overview", "cashbook"] });
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  const payReceivableMutation = useMutation({
    mutationFn: ({ saleId, amount }) =>
      financeService.paySaleReceivable(saleId, {
        amount,
        paymentDate: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["receivables", "finance-overview", "cashbook"],
      });
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "payables", label: "Supplier Credit" },
    { id: "receivables", label: "Customer EMI / Credit" },
    { id: "cashbook", label: "Cashbook" },
  ];

  if (isLoading && tab === "overview") return <PageLoader />;

  return (
    <div className="pb-10">
      <h1 className="text-2xl font-bold text-slate-900">Finance</h1>
      <p className="mt-1 text-sm text-slate-500">
        Payables, receivables, and daily cash movement
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              tab === t.id
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <Alert type="error" message={error} />
      </div>

      {tab === "overview" && overview && (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <StatCard
            title="Supplier Payables"
            value={formatCurrency(overview.totalPayables)}
            accent="amber"
          />
          <StatCard
            title="Customer Receivables"
            value={formatCurrency(overview.totalReceivables)}
            accent="blue"
          />
          <StatCard
            title="Overdue EMI"
            value={overview.overdueInstallments}
            accent="slate"
          />
        </div>
      )}

      {tab === "payables" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="mb-1 font-semibold">Record supplier bill manually</h2>
            <p className="mb-3 text-xs text-slate-500">
              Use this only if you forgot to enter the bill when adding stock. Normally
              the bill number is captured on Products, Inventory, or Mobile IMEI pages.
            </p>
            <div className="space-y-3">
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={billForm.supplierId}
                onChange={(e) =>
                  setBillForm({ ...billForm, supplierId: e.target.value })
                }
              >
                <option value="">Select supplier</option>
                {suppliers?.suppliers?.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <Input
                label="Supplier bill / invoice number"
                placeholder="From supplier's paper or PDF invoice"
                value={billForm.billNumber}
                onChange={(e) =>
                  setBillForm({ ...billForm, billNumber: e.target.value })
                }
              />
              <Input
                label="Total Amount"
                type="number"
                value={billForm.totalAmount}
                onChange={(e) =>
                  setBillForm({ ...billForm, totalAmount: e.target.value })
                }
              />
              <Input
                label="Paid Now"
                type="number"
                value={billForm.paidAmount}
                onChange={(e) =>
                  setBillForm({ ...billForm, paidAmount: e.target.value })
                }
              />
              <Button
                onClick={() =>
                  createBillMutation.mutate({
                    ...billForm,
                    billDate: new Date().toISOString(),
                    totalAmount: Number(billForm.totalAmount),
                    paidAmount: Number(billForm.paidAmount),
                  })
                }
              >
                Save Bill
              </Button>
            </div>
          </Card>
          <Card>
            <h2 className="mb-3 font-semibold">Outstanding Bills</h2>
            <ul className="space-y-2 text-sm">
              {payables?.bills?.map((b) => (
                <li
                  key={b._id}
                  className="flex justify-between rounded-lg bg-slate-50 px-3 py-2"
                >
                  <span>
                    {b.billNumber} — {b.supplierId?.name}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-amber-700">
                      {formatCurrency(b.balanceDue)}
                    </span>
                    <Button
                      size="sm"
                      onClick={() =>
                        payBillMutation.mutate({
                          id: b._id,
                          amount: b.balanceDue,
                        })
                      }
                    >
                      Pay
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {tab === "receivables" && (
        <Card className="mt-6">
          <h2 className="mb-3 font-semibold">Outstanding Customer Balances</h2>
          <p className="mb-4 text-xs text-slate-500">
            Sales on EMI or Credit (partial payment) with remaining amount due
          </p>
          {receivables?.receivables?.length === 0 ? (
            <p className="text-sm text-slate-500">No outstanding customer balances</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {receivables?.receivables?.map((r) => (
                <li
                  key={r._id}
                  className="rounded-xl border border-slate-100 px-4 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {r.customerId?.name}
                        <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-700">
                          {r.paymentPlan === "credit" ? "Credit" : "EMI"}
                        </span>
                      </p>
                      <p className="mt-1 text-slate-500">
                        {r.invoiceNumber}
                        {r.paymentPlan === "emi" && r.emiTenure
                          ? ` · ${r.emiTenure} months`
                          : ""}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        Total {formatCurrency(r.totalAmount)} · Paid{" "}
                        {formatCurrency(r.amountPaid)}
                      </p>
                      {r.pendingInstallments?.length > 0 &&
                        r.paymentPlan === "emi" && (
                          <p className="mt-1 text-xs text-slate-400">
                            Next due:{" "}
                            {new Date(
                              r.pendingInstallments[0].dueDate,
                            ).toLocaleDateString()}{" "}
                            (
                            {formatCurrency(
                              r.pendingInstallments[0].amount -
                                r.pendingInstallments[0].paidAmount,
                            )}
                            )
                          </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-amber-700">
                        {formatCurrency(r.balanceDue)} due
                      </span>
                      <Button
                        size="sm"
                        onClick={() =>
                          payReceivableMutation.mutate({
                            saleId: r._id,
                            amount: r.balanceDue,
                          })
                        }
                      >
                        Pay
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === "cashbook" && (
        <Card className="mt-6">
          <div className="mb-4 flex gap-4 text-sm">
            <span>In: {formatCurrency(cashbook?.summary?.cashIn)}</span>
            <span>Out: {formatCurrency(cashbook?.summary?.cashOut)}</span>
            <span className="font-semibold">
              Net: {formatCurrency(cashbook?.summary?.net)}
            </span>
          </div>
          <ul className="space-y-2 text-sm">
            {cashbook?.entries?.map((e) => (
              <li key={e._id} className="flex justify-between py-1">
                <span>
                  {e.type === "in" ? "+" : "-"} {e.category} — {e.note}
                </span>
                <span>{formatCurrency(e.amount)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
};
