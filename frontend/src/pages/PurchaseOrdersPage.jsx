import { useQuery } from "@tanstack/react-query";
import { purchaseOrderService } from "../services/purchaseOrder.service.js";
import { Card } from "../components/ui/Card.jsx";
import { formatCurrency } from "../utils/format.js";
import { Badge } from "../components/ui/Badge.jsx";

export const PurchaseOrdersPage = () => {
  const { data } = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: () => purchaseOrderService.list({ page: 1, limit: 20 }),
  });

  return (
    <div className="pb-10">
      <h1 className="text-2xl font-bold text-slate-900">Purchase Orders</h1>
      <p className="mt-1 text-sm text-slate-500">Restock workflow from suppliers</p>
      <Card className="mt-6">
        <ul className="space-y-3">
          {data?.orders?.map((o) => (
            <li
              key={o._id}
              className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3"
            >
              <div>
                <p className="font-medium">{o.orderNumber}</p>
                <p className="text-xs text-slate-500">{o.supplierId?.name}</p>
              </div>
              <div className="text-right">
                <Badge>{o.status}</Badge>
                <p className="mt-1 text-sm">{formatCurrency(o.totalAmount)}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
};
