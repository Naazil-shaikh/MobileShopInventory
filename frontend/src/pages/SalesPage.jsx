import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { saleService } from "../services/sale.service.js";
import { customerService } from "../services/customer.service.js";
import { QUERY_KEYS } from "../utils/constants.js";
import { CreateSaleForm } from "../components/sales/CreateSaleForm.jsx";
import { Pagination } from "../components/ui/Pagination.jsx";
import { PageLoader } from "../components/ui/LoadingSpinner.jsx";
import { InvoiceModal } from "../components/sales/InvoiceModal.jsx";
import {
  formatCurrency,
  formatDate,
  getApiErrorMessage,
} from "../utils/format.js";

export const SalesPage = () => {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [saleError, setSaleError] = useState("");
  const [invoiceId, setInvoiceId] = useState(null);

  const { data: salesData, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.sales, page],

    queryFn: () =>
      saleService.getHistory({
        page,
        limit: 10,
      }),
  });

  const { data: customersData } = useQuery({
    queryKey: ["customers-sales"],
    queryFn: () => customerService.getAll({ page: 1, limit: 200 }),
  });

  const customers = customersData?.customers ?? [];

  const {
    data: invoice,
    isLoading: invoiceLoading,
  } = useQuery({
    queryKey: [QUERY_KEYS.saleInvoice, invoiceId],

    queryFn: () =>
      saleService.getInvoice(invoiceId),

    enabled: Boolean(invoiceId),
  });

  const createMutation = useMutation({
    mutationFn: saleService.create,

    onSuccess: (sale) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.sales],
      });

      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.products],
      });

      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.dashboard],
      });

      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.inventoryHistory],
      });

      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.lowStock],
      });

      setSaleError("");

      setInvoiceId(
        sale.invoiceNumber || sale._id
      );
    },

    onError: (err) =>
      setSaleError(getApiErrorMessage(err)),
  });

  const handleCreateSale = (data) => {
    if (customers.length === 0) {
      setSaleError(
        "Add a customer first from the Customers page"
      );

      return;
    }

    createMutation.mutate(data);
  };

  const paymentStyles = {
    cash: "bg-emerald-100 text-emerald-700 border-emerald-200",
    upi: "bg-violet-100 text-violet-700 border-violet-200",
    card: "bg-blue-100 text-blue-700 border-blue-200",
    bank: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <div className="pb-10">
      {/* ── page header ── */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Sales
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Create invoices, manage customer sales,
          and track transaction history
        </p>
      </div>

      {/* ── create sale section ── */}
      <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* header */}
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold tracking-tight text-slate-900">
            Create New Sale
          </h2>

          <p className="mt-0.5 text-xs text-slate-400">
            Generate invoices and complete sales
            transactions
          </p>
        </div>

        {/* body */}
        <div className="p-5">
          <CreateSaleForm
            customers={customers}
            onSubmit={handleCreateSale}
            isLoading={createMutation.isPending}
            error={saleError}
          />

          {customers.length === 0 && (
            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                !
              </div>

              <div>
                <p className="text-sm font-semibold text-amber-800">
                  No customers available
                </p>

                <p className="mt-1 text-xs leading-relaxed text-amber-700">
                  Add a customer before creating
                  a sale invoice.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── sales history ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* header */}
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold tracking-tight text-slate-900">
            Sales History
          </h2>

          <p className="mt-0.5 text-xs text-slate-400">
            Recent invoices and completed
            transactions
          </p>
        </div>

        {/* content */}
        <div className="p-4">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <PageLoader />
            </div>
          ) : salesData?.sales?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                ₹
              </div>

              <p className="mt-4 text-sm font-semibold text-slate-700">
                No sales recorded yet
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Completed invoices will appear here
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {salesData?.sales?.map((sale) => (
                  <div
                    key={sale._id}
                    className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                  >
                    {/* top */}
                    <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-start lg:justify-between">
                      {/* left */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="font-mono text-lg font-bold tracking-tight text-slate-900">
                            {sale.invoiceNumber}
                          </h3>

                          <span
                            className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                              paymentStyles[
                                sale.paymentMethod
                              ] ||
                              "bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                          >
                            {sale.paymentMethod}
                          </span>
                        </div>

                        <div className="mt-4 flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
                            {sale.customerId?.name
                              ?.split(" ")
                              ?.map((n) => n[0])
                              ?.join("")
                              ?.slice(0, 2) || "NA"}
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              {sale.customerId?.name ||
                                "Walk-in Customer"}
                            </p>

                            <p className="text-xs text-slate-500">
                              {formatDate(
                                sale.createdAt
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* right */}
                      <div className="flex flex-col items-start gap-3 lg:items-end">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Total Amount
                          </p>

                          <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-600">
                            {formatCurrency(
                              sale.totalAmount
                            )}
                          </p>
                        </div>

                        <button
                          onClick={() =>
                            setInvoiceId(
                              sale.invoiceNumber
                            )
                          }
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                        >
                          View Invoice
                        </button>
                      </div>
                    </div>

                    {/* footer */}
                    <div className="flex flex-wrap items-center gap-2 px-5 py-3 text-xs text-slate-500">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                        Sale Completed
                      </span>

                      <span>
                        Payment via{" "}
                        <span className="font-semibold capitalize text-slate-700">
                          {sale.paymentMethod}
                        </span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* pagination */}
              <div className="mt-6">
                <Pagination
                  pagination={salesData?.pagination}
                  onPageChange={setPage}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── invoice modal ── */}
      <InvoiceModal
        isOpen={Boolean(invoiceId)}
        onClose={() => setInvoiceId(null)}
        invoice={invoiceLoading ? null : invoice}
      />
    </div>
  );
};