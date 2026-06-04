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
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
      queryClient.invalidateQueries({ queryKey: ["finance-overview"] });
      setError("");
      setLines({});
      setReason("");
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  const productKey = (item) =>
    item.productId?._id || item.productId;

  const getRemainingQty = (item) =>
    Math.max(0, item.quantity - (item.returnedQuantity || 0));

  const getSoldImeis = (item) =>
    (item.imeiIds || []).filter((u) => {
      const status = typeof u === "object" ? u.status : null;
      return !status || status === "sold";
    });

  const toggleLine = (item, checked) => {
    const pid = productKey(item);
    const remaining = getRemainingQty(item);
    setLines((prev) => {
      const next = { ...prev };
      if (!checked) {
        delete next[pid];
        return next;
      }
      const soldImeis = getSoldImeis(item);
      next[pid] = {
        productId: pid,
        purchasedQty: remaining,
        returnQty: remaining > 0 ? 1 : 0,
        price: item.price,
        refundAmount: item.price,
        imeiSold: soldImeis,
        imeiSelected: [],
      };
      return next;
    });
  };

  const submitReturn = () => {
    const items = Object.values(lines)
      .filter((l) => Number(l.returnQty) > 0)
      .map((l) => ({
        productId: l.productId,
        quantity: Number(l.returnQty),
        refundAmount: Number(l.price) * Number(l.returnQty),
        imeiIds: l.imeiSelected?.length ? l.imeiSelected : undefined,
      }));

    if (!saleId || items.length === 0) {
      setError("Select a sale and at least one item to return");
      return;
    }

    // frontend validation for IMEI selection counts
    for (const item of items) {
      const line = lines[item.productId];
      const soldImeis = line?.imeiSold || [];
      if (soldImeis.length) {
        if (!line.imeiSelected?.length) {
          setError("Select IMEI devices for the returned quantity");
          return;
        }
        if (line.imeiSelected.length !== Number(line.returnQty)) {
          setError("Selected IMEI count must match return quantity");
          return;
        }
      }
      if (Number(line.returnQty) > Number(line.purchasedQty)) {
        setError("Return quantity cannot exceed remaining quantity on invoice");
        return;
      }
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
            const line = lines[pid];
            const remaining = getRemainingQty(item);
            const soldImeis = getSoldImeis(item);
            const fullyReturned = remaining <= 0;

            return (
              <div
                key={pid}
                className="mb-3 rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm"
              >
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(lines[pid])}
                    disabled={fullyReturned}
                    onChange={(e) => toggleLine(item, e.target.checked)}
                    className="mt-1"
                  />
                  <span className="flex-1">
                    <span className="font-medium">{name}</span> — Purchased{" "}
                    {item.quantity}
                    {(item.returnedQuantity || 0) > 0 && (
                      <span className="text-amber-700">
                        {" "}
                        (returned {item.returnedQuantity})
                      </span>
                    )}{" "}
                    × {formatCurrency(item.price)}
                    {fullyReturned && (
                      <span className="ml-2 text-xs text-slate-500">
                        Fully returned
                      </span>
                    )}
                  </span>
                </label>

                {line && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Input
                      label="Return Quantity"
                      type="number"
                      value={line.returnQty}
                      onChange={(e) => {
                        const v = Math.max(
                          0,
                          Math.min(
                            remaining,
                            Number(e.target.value || 0),
                          ),
                        );
                        setLines((prev) => ({
                          ...prev,
                          [pid]: {
                            ...prev[pid],
                            returnQty: v,
                            refundAmount: Number(item.price) * v,
                            imeiSelected:
                              soldImeis.length && prev[pid].imeiSelected?.length
                                ? prev[pid].imeiSelected.slice(0, v)
                                : prev[pid].imeiSelected,
                          },
                        }));
                      }}
                    />

                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-xs font-semibold uppercase text-slate-500">
                        Refund
                      </p>
                      <p className="mt-1 font-bold text-slate-900">
                        {formatCurrency(Number(item.price) * Number(line.returnQty))}
                      </p>
                    </div>

                    {soldImeis.length > 0 && (
                      <div className="sm:col-span-2">
                        <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
                          Select IMEI devices to return
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {soldImeis.map((u) => (
                            <label
                              key={u._id || u}
                              className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2 text-xs"
                            >
                              <input
                                type="checkbox"
                                checked={Boolean(
                                  line.imeiSelected?.includes(u._id || u),
                                )}
                                onChange={(e) => {
                                  const id = u._id || u;
                                  setLines((prev) => {
                                    const cur = prev[pid];
                                    const current = cur.imeiSelected || [];
                                    const nextSelected = e.target.checked
                                      ? [...current, id]
                                      : current.filter((x) => x !== id);

                                    return {
                                      ...prev,
                                      [pid]: {
                                        ...cur,
                                        imeiSelected: nextSelected.slice(
                                          0,
                                          Number(cur.returnQty) || 0,
                                        ),
                                      },
                                    };
                                  });
                                }}
                              />
                              <span className="font-mono">
                                {u.imei || String(u)}
                              </span>
                            </label>
                          ))}
                        </div>
                        <p className="mt-2 text-[11px] text-slate-500">
                          Selected {line.imeiSelected?.length || 0} /{" "}
                          {line.returnQty}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
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
