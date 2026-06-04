import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileUnitService } from "../services/mobileUnit.service.js";
import { productService } from "../services/product.service.js";
import { QUERY_KEYS, MOBILE_UNIT_STATUSES } from "../utils/constants.js";
import { SearchBar } from "../components/ui/SearchBar.jsx";
import { Select } from "../components/ui/Select.jsx";
import { RegisterImeiModal } from "../components/mobileUnits/RegisterImeiModal.jsx";
import { PageLoader } from "../components/ui/LoadingSpinner.jsx";
import { Alert } from "../components/ui/Alert.jsx";
import { formatDate, getApiErrorMessage } from "../utils/format.js";

export const MobileUnitsPage = () => {
  const queryClient = useQueryClient();

  const [imeiSearch, setImeiSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { data: productsData } = useQuery({
    queryKey: [QUERY_KEYS.products, "imei"],
    queryFn: () =>
      productService.getAll({
        page: 1,
        limit: 100,
        hasIMEI: true,
      }),
  });

  const imeiProducts =
    productsData?.products?.filter((p) => p.hasIMEI) ?? [];

  const {
    data: searchResult,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEYS.mobileUnits, imeiSearch],

    queryFn: () =>
      mobileUnitService.searchByImei(imeiSearch.trim()),

    enabled: false,
  });

  const unit = searchResult?.unit;
  const linkedSale = searchResult?.linkedSale;

  const registerMutation = useMutation({
    mutationFn: mobileUnitService.register,

    onSuccess: () => {
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
        queryKey: ["payables", "finance-overview"],
      });

      setModalOpen(false);

      setSuccess("Devices registered successfully");
      setError("");
    },

    onError: (err) => setError(getApiErrorMessage(err)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) =>
      mobileUnitService.updateStatus(id, status),

    onSuccess: (data, variables) => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["sales-returns"] });
      queryClient.invalidateQueries({ queryKey: ["returns"] });
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
      queryClient.invalidateQueries({ queryKey: ["finance-overview"] });

      if (variables.status === "returned") {
        setSuccess(
          data?.saleReturn
            ? `Returned and invoice ${data.sale?.invoiceNumber || ""} updated`
            : "Device marked as returned",
        );
      } else {
        setSuccess("Status updated");
      }
    },

    onError: (err) => setError(getApiErrorMessage(err)),
  });

  const handleSearch = () => {
    if (imeiSearch.trim().length < 5) {
      setError("Enter a valid IMEI to search");
      return;
    }

    setError("");
    refetch();
  };

  const statusStyles = {
    in_stock:
      "bg-emerald-100 text-emerald-700 border-emerald-200",

    sold:
      "bg-blue-100 text-blue-700 border-blue-200",

    returned:
      "bg-amber-100 text-amber-700 border-amber-200",
  };

  return (
    <div className="pb-10">
      {/* ── page header ── */}
      <div className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Mobile IMEI
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Register, search, and track individual mobile devices
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          disabled={imeiProducts.length === 0}
          className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition-all duration-200 hover:bg-violet-700 hover:shadow-violet-300 disabled:cursor-not-allowed disabled:bg-violet-300"
        >
          <span className="text-base leading-none">+</span>
          Register Devices
        </button>
      </div>

      <Alert type="error" message={error} />
      <Alert type="success" message={success} />

      {/* ── warning banner ── */}
      {imeiProducts.length === 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            !
          </div>

          <div>
            <p className="text-sm font-semibold text-amber-800">
              No IMEI-enabled products found
            </p>

            <p className="mt-1 text-xs leading-relaxed text-amber-700">
              Create a product with IMEI tracking enabled before
              registering mobile devices.
            </p>
          </div>
        </div>
      )}

      {/* ── search card ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* header */}
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold tracking-tight text-slate-900">
            Search by IMEI
          </h2>

          <p className="mt-0.5 text-xs text-slate-400">
            Locate and manage a specific mobile device
          </p>
        </div>

        {/* body */}
        <div className="p-5">
          {/* search area */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1">
              <SearchBar
                value={imeiSearch}
                onChange={setImeiSearch}
                placeholder="Enter IMEI number..."
              />
            </div>

            <button
              onClick={handleSearch}
              disabled={isFetching}
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isFetching ? "Searching..." : "Search"}
            </button>
          </div>

          {/* loading */}
          {isFetching && (
            <div className="flex justify-center py-10">
              <PageLoader />
            </div>
          )}

          {/* result */}
          {unit && !isFetching && (
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70">
              {/* top section */}
              <div className="flex flex-col gap-5 border-b border-slate-200 p-5 lg:flex-row lg:items-start lg:justify-between">
                {/* left */}
                <div className="min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 shadow-sm">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect
                          x="7"
                          y="2"
                          width="10"
                          height="20"
                          rx="2"
                          ry="2"
                        />
                        <line
                          x1="11"
                          y1="18"
                          x2="13"
                          y2="18"
                        />
                      </svg>
                    </div>

                    <div className="min-w-0">
                      <p className="font-mono text-lg font-bold tracking-tight text-slate-900 break-all">
                        {unit.imei}
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        {unit.productId?.name} · {unit.color} ·{" "}
                        {unit.storage}GB
                      </p>
                    </div>
                  </div>

                  {/* metadata */}
                  <div className="mt-5 flex flex-wrap gap-3">
                    <div className="rounded-xl bg-white px-3 py-2 border border-slate-200">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Purchased
                      </p>

                      <p className="mt-1 text-sm font-medium text-slate-700">
                        {formatDate(unit.purchaseDate)}
                      </p>
                    </div>

                    {unit.sellingDate && (
                      <div className="rounded-xl bg-white px-3 py-2 border border-slate-200">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Sold
                        </p>

                        <p className="mt-1 text-sm font-medium text-slate-700">
                          {formatDate(unit.sellingDate)}
                        </p>
                      </div>
                    )}

                    {linkedSale && (
                      <div className="rounded-xl bg-white px-3 py-2 border border-slate-200">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Invoice
                        </p>

                        <p className="mt-1 text-sm font-medium text-slate-700">
                          {linkedSale.invoiceNumber}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* status */}
                <div
                  className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
                    statusStyles[unit.status] ||
                    "bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  {unit.status.replace("_", " ")}
                </div>
              </div>

              {/* bottom section */}
              <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Update Device Status
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {unit.status === "sold"
                      ? "Mark Return to process refund and update the linked invoice"
                      : "Change the lifecycle state of this device"}
                  </p>
                </div>

                <Select
                  key={`${unit._id}-${unit.status}`}
                  options={MOBILE_UNIT_STATUSES.filter((opt) => {
                    if (unit.status === "sold") {
                      return opt.value === "returned";
                    }
                    if (unit.status === "returned") {
                      return opt.value === "in_stock";
                    }
                    if (unit.status === "in_stock") {
                      return opt.value !== "returned";
                    }
                    return true;
                  })}
                  defaultValue={unit.status}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (next === "returned" && unit.status === "sold") {
                      const ok = window.confirm(
                        "This will create a return record, refund the line amount, and update the invoice. Continue?",
                      );
                      if (!ok) return;
                    }
                    statusMutation.mutate({
                      id: unit._id,
                      status: next,
                    });
                  }}
                  className="w-full sm:w-[220px]"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── modal ── */}
      <RegisterImeiModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        imeiProducts={imeiProducts}
        isLoading={registerMutation.isPending}
        onSubmit={(data) => registerMutation.mutate(data)}
      />
    </div>
  );
};