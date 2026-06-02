import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { returnService } from "../services/return.service.js";
import { saleService } from "../services/sale.service.js";
import { Button } from "../components/ui/Button.jsx";
import { Input } from "../components/ui/Input.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Alert } from "../components/ui/Alert.jsx";
import { formatCurrency, getApiErrorMessage } from "../utils/format.js";

export const ReturnsPage = () => {
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [saleId, setSaleId] = useState("");
  const [reason, setReason] = useState("");
  const [lines, setLines] = useState({});

  const { data: salesData } = useQuery({
    queryKey: ["sales-returns"],
    queryFn: () => saleService.getHistory({ page: 1, limit: 50 }),
  });

  const { data: returnsData } = useQuery({
    queryKey: ["returns"],
    queryFn: () => returnService.list({ page: 1, limit: 20 }),
  });

  const selectedSale = useMemo(
    () => salesData?.sales?.find((s) => s._id === saleId),
    [salesData, saleId],
  );

  const createMutation = useMutation({
    mutationFn: returnService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["returns", "sales-returns"] });
      setError("");
      setLines({});
      setReason("");
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  const productKey = (item) =>
    item.productId?._id || item.productId;

  const toggleLine = (item, checked) => {
    const pid = productKey(item);
    setLines((prev) => {
      const next = { ...prev };
      if (!checked) {
        delete next[pid];
        return next;
      }
      next[pid] = {
        productId: pid,
        quantity: item.quantity,
        refundAmount: item.price * item.quantity,
        imeiIds: item.imeiIds || [],
      };
      return next;
    });
  };

  const submitReturn = () => {
    const items = Object.values(lines);
    if (!saleId || items.length === 0) {
      setError("Select a sale and at least one item to return");
      return;
    }
    createMutation.mutate({
      saleId,
      reason,
      type: "return",
      items,
    });
  };

  return (
    <div className="pb-10">
      <h1 className="text-2xl font-bold text-slate-900">Returns & Exchanges</h1>
      <p className="mt-1 text-sm text-slate-500">
        Process refunds and restock returned items
      </p>

      <Alert type="error" message={error} className="mt-4" />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">New Return</h2>
          <select
            className="mb-3 w-full rounded-lg border px-3 py-2 text-sm"
            value={saleId}
            onChange={(e) => {
              setSaleId(e.target.value);
              setLines({});
            }}
          >
            <option value="">Select invoice</option>
            {salesData?.sales?.map((s) => (
              <option key={s._id} value={s._id}>
                {s.invoiceNumber} — {formatCurrency(s.totalAmount)}
              </option>
            ))}
          </select>

          {selectedSale?.items?.map((item) => {
            const pid = productKey(item);
            const name = item.productId?.name || "Item";
            return (
              <label
                key={pid}
                className="mb-2 flex items-start gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={Boolean(lines[pid])}
                  onChange={(e) => toggleLine(item, e.target.checked)}
                  className="mt-1"
                />
                <span>
                  {name} — Qty {item.quantity} × {formatCurrency(item.price)}
                </span>
              </label>
            );
          })}

          <Input
            label="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-3"
          />

          <Button className="mt-4" onClick={submitReturn}>
            Process Return
          </Button>
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">Recent Returns</h2>
          <ul className="space-y-2 text-sm">
            {returnsData?.returns?.map((r) => (
              <li key={r._id} className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="font-medium">
                  {formatCurrency(r.totalRefund)} — {r.type}
                </p>
                <p className="text-slate-500">
                  Sale {r.saleId?.invoiceNumber || r.saleId}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
};
