import { Modal } from "../ui/Modal.jsx";
import { Button } from "../ui/Button.jsx";
import { formatCurrency, formatDate } from "../../utils/format.js";

export const InvoiceModal = ({ isOpen, onClose, invoice }) => {
  if (!invoice) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Invoice ${invoice.invoiceNumber}`}
      size="lg"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-4 text-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <p className="text-slate-500">Customer</p>
            <p className="font-medium text-slate-900">
              {invoice.customerId?.name}
            </p>
            <p className="text-slate-600">{invoice.customerId?.phone}</p>
          </div>
          <div>
            <p className="text-slate-500">Date</p>
            <p className="font-medium">{formatDate(invoice.createdAt)}</p>
            <p className="text-slate-600 capitalize">
              Payment: {invoice.paymentMethod}
            </p>
          </div>
        </div>

        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2">Item</th>
              <th className="py-2">Qty</th>
              <th className="py-2">Price</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items?.map((item, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="py-2">
                  <p className="font-medium">
                    {item.productId?.name || "Product"}
                  </p>
                  {item.imeiIds?.length > 0 && (
                    <p className="text-xs text-slate-500">
                      IMEI: {item.imeiIds.map((u) => u.imei || u).join(", ")}
                    </p>
                  )}
                </td>
                <td className="py-2">{item.quantity}</td>
                <td className="py-2">{formatCurrency(item.price)}</td>
                <td className="py-2 text-right">
                  {formatCurrency(item.price * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end border-t border-slate-200 pt-3">
          <p className="text-lg font-semibold">
            Total: {formatCurrency(invoice.totalAmount)}
          </p>
        </div>
      </div>
    </Modal>
  );
};
