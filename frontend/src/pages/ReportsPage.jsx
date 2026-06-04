import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { reportService } from "../services/report.service.js";
import { formatCurrency } from "../utils/format.js";
import { getApiErrorMessage } from "../utils/format.js";
import { Alert } from "../components/ui/Alert.jsx";
import { PageLoader } from "../components/ui/LoadingSpinner.jsx";

export const ReportsPage = () => {
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [purgeInfo, setPurgeInfo] = useState(null);

  const { data: archived } = useQuery({
    queryKey: ["archived-reports"],
    queryFn: () => reportService.getArchived({}),
  });

  const reportMutation = useMutation({
    mutationFn: ({ period, archiveAndPurge }) =>
      reportService.getStockReport(period, {
        archiveAndPurge: archiveAndPurge ? "true" : undefined,
        year: new Date().getFullYear(),
      }),
    onSuccess: (data) => {
      setReport(data);
      setPurgeInfo(data.purgeResult);
      setError("");
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  const exportMutation = useMutation({
    mutationFn: ({ period }) =>
      reportService.downloadExcel(period, {
        year: new Date().getFullYear(),
      }),
    onSuccess: () => setError(""),
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  const buttons = [
    {
      id: "today",
      label: "Today's Stock Report",
      desc: "Current day activity",
      accent: "violet",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
          />
        </svg>
      ),
    },
    {
      id: "month",
      label: "This Month Stock Report",
      desc: "Month-to-date summary",
      accent: "emerald",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
          />
        </svg>
      ),
    },
    {
      id: "year",
      label: "This Year's Stock Report",
      desc: "Full year + archive & purge old data",
      accent: "amber",
      purge: true,
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
          />
        </svg>
      ),
    },
  ];

  const accentMap = {
    violet: {
      card: "bg-violet-50 border-violet-100 hover:border-violet-300 hover:shadow-violet-100",
      icon: "bg-violet-100 text-violet-600",
      label: "text-violet-600",
    },
    emerald: {
      card: "bg-emerald-50 border-emerald-100 hover:border-emerald-300 hover:shadow-emerald-100",
      icon: "bg-emerald-100 text-emerald-600",
      label: "text-emerald-600",
    },
    amber: {
      card: "bg-amber-50 border-amber-100 hover:border-amber-300 hover:shadow-amber-100",
      icon: "bg-amber-100 text-amber-600",
      label: "text-amber-600",
    },
  };

  const stockRows = report?.report
    ? [
        { key: "Products", val: report.report.stock.summary.totalProducts },
        {
          key: "Stock units",
          val: report.report.stock.summary.totalStockUnits,
        },
        {
          key: "Value at cost",
          val: formatCurrency(report.report.stock.summary.stockValueAtCost),
        },
        {
          key: "Value at sell",
          val: formatCurrency(report.report.stock.summary.stockValueAtSell),
          highlight: true,
        },
        {
          key: "Transactions",
          val: report.report.stock.summary.transactionsCount,
        },
      ]
    : [];

  const salesRows = report?.report
    ? [
        { key: "Sales count", val: report.report.sales.summary.salesCount },
        {
          key: "Revenue",
          val: formatCurrency(report.report.sales.summary.totalRevenue),
        },
        {
          key: "Collected",
          val: formatCurrency(report.report.sales.summary.totalCollected),
        },
        {
          key: "Due",
          val: formatCurrency(report.report.sales.summary.totalDue),
        },
        {
          key: "Gross profit",
          val: formatCurrency(report.report.sales.summary.grossProfit),
          highlight: true,
        },
      ]
    : [];

  return (
    <div className="pb-10">
      {/* ── Page header ── */}
      <div className="mb-7 flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Reports
        </h1>
        <p className="text-sm text-slate-500">
          Stock & sales reports. Year-end report archives data and purges
          previous year operational records to save database cost.
        </p>
      </div>

      <Alert type="error" message={error} />

      {/* ── Period selector buttons ── */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {buttons.map((btn) => {
          const a = accentMap[btn.accent];
          return (
            <div
              key={btn.id}
              className={`relative rounded-2xl border p-5 text-left shadow-sm transition-all duration-200 ${a.card}`}
            >
              {btn.purge && (
                <span className="absolute right-4 top-4 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                  + purge
                </span>
              )}
              <div
                className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${a.icon}`}
              >
                {btn.icon}
              </div>
              <button
                type="button"
                onClick={() =>
                  reportMutation.mutate({
                    period: btn.id,
                    archiveAndPurge: btn.purge,
                  })
                }
                disabled={reportMutation.isPending}
                className="w-full text-left disabled:opacity-60"
              >
                <p className="font-semibold text-slate-900">{btn.label}</p>
                <p className="mt-1 text-xs text-slate-500">{btn.desc}</p>
              </button>
              <button
                type="button"
                onClick={() => exportMutation.mutate({ period: btn.id })}
                disabled={exportMutation.isPending}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M7.5 7.5 12 3m0 0 4.5 4.5M12 3v13.5"
                  />
                </svg>
                {exportMutation.isPending ? "Exporting…" : "Download Excel"}
              </button>
            </div>
          );
        })}
      </div>

      {reportMutation.isPending && <PageLoader />}

      {/* ── Purge success notice ── */}
      {purgeInfo && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4">
          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
            ✓
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-800">
              Previous year data purged successfully
            </p>
            <p className="mt-0.5 text-xs text-emerald-600 break-all">
              Deleted: {JSON.stringify(purgeInfo.deleted)}
            </p>
          </div>
        </div>
      )}

      {/* ── Report result cards ── */}
      {report?.report && (
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={() =>
              exportMutation.mutate({ period: report.period })
            }
            disabled={exportMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
          >
            Download Excel — {report.periodLabel}
          </button>
        </div>
      )}

      {report?.report && (
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          {/* Stock card */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-4">
              <div>
                <h2 className="text-sm font-bold tracking-tight text-slate-900">
                  Stock Summary
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  {report.periodLabel}
                </p>
              </div>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
                  />
                </svg>
              </span>
            </div>
            <ul className="divide-y divide-slate-100 px-5">
              {stockRows.map(({ key, val, highlight }) => (
                <li
                  key={key}
                  className="flex items-center justify-between py-3"
                >
                  <span className="text-sm text-slate-500">{key}</span>
                  <span
                    className={`text-sm font-semibold ${highlight ? "text-emerald-600" : "text-slate-800"}`}
                  >
                    {val}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Sales card */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-4">
              <div>
                <h2 className="text-sm font-bold tracking-tight text-slate-900">
                  Sales Summary
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  {report.periodLabel}
                </p>
              </div>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z"
                  />
                </svg>
              </span>
            </div>
            <ul className="divide-y divide-slate-100 px-5">
              {salesRows.map(({ key, val, highlight }) => (
                <li
                  key={key}
                  className="flex items-center justify-between py-3"
                >
                  <span className="text-sm text-slate-500">{key}</span>
                  <span
                    className={`text-sm font-semibold ${highlight ? "text-emerald-600" : "text-slate-800"}`}
                  >
                    {val}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ── Archived reports ── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-bold tracking-tight text-slate-900">
              Archived Reports
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Previously generated year-end archives
            </p>
          </div>
          {archived?.length > 0 && (
            <span className="rounded-full bg-violet-50 border border-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-600">
              {archived.length} records
            </span>
          )}
        </div>

        {!archived || archived.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
                />
              </svg>
            </div>
            <p className="mt-3 text-sm font-medium text-slate-700">
              No archived reports yet
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Year-end reports will appear here once generated
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {archived.slice(0, 15).map((r) => (
              <li
                key={r._id}
                className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-slate-50/70"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-500">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {r.reportType}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {r.periodLabel}
                    </p>
                  </div>
                </div>
                <span className="ml-4 shrink-0 text-xs text-slate-400">
                  {new Date(r.createdAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
