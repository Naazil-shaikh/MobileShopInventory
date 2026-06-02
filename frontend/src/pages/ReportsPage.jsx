import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { reportService } from "../services/report.service.js";
import { formatCurrency } from "../utils/format.js";
import { getApiErrorMessage } from "../utils/format.js";
import { Alert } from "../components/ui/Alert.jsx";
import { PageLoader } from "../components/ui/LoadingSpinner.jsx";
import { Card } from "../components/ui/Card.jsx";

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

  const buttons = [
    { id: "today", label: "Today's Stock Report", desc: "Current day activity" },
    { id: "month", label: "This Month Stock Report", desc: "Month-to-date summary" },
    {
      id: "year",
      label: "This Year's Stock Report",
      desc: "Full year + optional archive & purge old data",
      purge: true,
    },
  ];

  return (
    <div className="pb-10">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="mt-1 text-sm text-slate-500">
          Stock & sales reports. Year-end report archives data and purges previous
          year operational records to save database cost.
        </p>
      </div>

      <Alert type="error" message={error} />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {buttons.map((btn) => (
          <button
            key={btn.id}
            onClick={() =>
              reportMutation.mutate({
                period: btn.id,
                archiveAndPurge: btn.purge,
              })
            }
            disabled={reportMutation.isPending}
            className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-violet-300 hover:shadow-md disabled:opacity-60"
          >
            <p className="font-semibold text-slate-900">{btn.label}</p>
            <p className="mt-1 text-xs text-slate-500">{btn.desc}</p>
          </button>
        ))}
      </div>

      {reportMutation.isPending && <PageLoader />}

      {purgeInfo && (
        <Alert
          type="success"
          message={`Previous year data purged. Archived reports preserved. Deleted: ${JSON.stringify(purgeInfo.deleted)}`}
        />
      )}

      {report?.report && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="mb-3 font-semibold">{report.periodLabel} — Stock</h2>
            <ul className="space-y-2 text-sm">
              <li>Products: {report.report.stock.summary.totalProducts}</li>
              <li>Stock units: {report.report.stock.summary.totalStockUnits}</li>
              <li>
                Value (cost):{" "}
                {formatCurrency(report.report.stock.summary.stockValueAtCost)}
              </li>
              <li>
                Value (sell):{" "}
                {formatCurrency(report.report.stock.summary.stockValueAtSell)}
              </li>
              <li>Transactions: {report.report.stock.summary.transactionsCount}</li>
            </ul>
          </Card>
          <Card>
            <h2 className="mb-3 font-semibold">Sales Summary</h2>
            <ul className="space-y-2 text-sm">
              <li>Sales count: {report.report.sales.summary.salesCount}</li>
              <li>Revenue: {formatCurrency(report.report.sales.summary.totalRevenue)}</li>
              <li>Collected: {formatCurrency(report.report.sales.summary.totalCollected)}</li>
              <li>Due: {formatCurrency(report.report.sales.summary.totalDue)}</li>
              <li>Gross profit: {formatCurrency(report.report.sales.summary.grossProfit)}</li>
            </ul>
          </Card>
        </div>
      )}

      <Card className="mt-6">
        <h2 className="mb-3 font-semibold">Archived Reports</h2>
        {archived?.length === 0 ? (
          <p className="text-sm text-slate-500">No archived reports yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {archived?.slice(0, 15).map((r) => (
              <li key={r._id} className="flex justify-between py-2 text-sm">
                <span>
                  {r.reportType} — {r.periodLabel}
                </span>
                <span className="text-slate-500">
                  {new Date(r.createdAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};
