import { useRef } from "react";
import { useReactToPrint } from "react-to-print";

import { Modal } from "../ui/Modal.jsx";
import { Button } from "../ui/Button.jsx";

import { formatCurrency, formatDate } from "../../utils/format.js";

export const InvoiceModal = ({ isOpen, onClose, invoice }) => {
  const printRef = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,

    documentTitle: `Invoice-${invoice?.invoiceNumber}`,

    pageStyle: `
      @page {
        margin: 18px;
      }

      body {
        background: white;
        color: black;
        -webkit-print-color-adjust: exact;
      }

      table {
        border-collapse: collapse;
      }
    `,
  });

  if (!invoice) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Invoice ${invoice.invoiceNumber}`}
      size="lg"
      footer={
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>

          <Button onClick={handlePrint}>Print Invoice</Button>
        </div>
      }
    >
      {/* printable area */}
      <div ref={printRef} className="bg-white p-1 text-slate-900">
        {/* top header */}
        <div className="border-b border-slate-300 pb-5">
          <div className="flex items-start justify-between gap-6">
            {/* shop */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Mobile Shop</h2>

              <p className="mt-1 text-sm text-slate-500">Sales Invoice</p>

              {/* optional business details */}
              <div className="mt-4 space-y-1 text-xs text-slate-500">
                <p>Phone: +91 9876543210</p>

                <p>Email: mobileshop@example.com</p>

                <p>GSTIN: 27ABCDE1234F1Z5</p>
              </div>
            </div>

            {/* invoice meta */}
            <div className="min-w-[220px] text-right">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium uppercase text-slate-500">
                    Invoice No
                  </p>

                  <p className="mt-1 font-mono text-sm font-semibold text-slate-900">
                    {invoice.invoiceNumber}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase text-slate-500">
                    Date
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {formatDate(invoice.createdAt)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase text-slate-500">
                    Payment
                  </p>

                  <p className="mt-1 text-sm font-medium uppercase text-slate-800">
                    {invoice.paymentMethod}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* customer */}
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Bill To
          </p>

          <div className="mt-2">
            <p className="text-sm font-semibold text-slate-900">
              {invoice.customerId?.name || "Walk-in Customer"}
            </p>

            <p className="mt-1 text-sm text-slate-600">
              {invoice.customerId?.phone || "No phone number"}
            </p>
          </div>
        </div>

        {/* invoice table */}
        <div className="mt-6 overflow-hidden border border-slate-300">
          <table className="w-full text-left">
            <thead className="bg-slate-100">
              <tr className="border-b border-slate-300">
                <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-600">
                  Item
                </th>

                <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-600">
                  Qty
                </th>

                <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-600">
                  Price
                </th>

                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-600">
                  Total
                </th>
              </tr>
            </thead>

            <tbody>
              {invoice.items?.map((item, i) => (
                <tr
                  key={i}
                  className="border-b border-slate-200 last:border-none"
                >
                  {/* product */}
                  <td className="px-4 py-4">
                    <p className="text-sm font-medium text-slate-900">
                      {item.productId?.name || "Product"}
                    </p>

                    {item.imeiIds?.length > 0 && (
                      <p className="mt-1 break-all font-mono text-xs text-slate-500">
                        IMEI: {item.imeiIds.map((u) => u.imei || u).join(", ")}
                      </p>
                    )}
                  </td>

                  {/* qty */}
                  <td className="px-4 py-4 text-sm text-slate-700">
                    {item.quantity}
                  </td>

                  {/* price */}
                  <td className="px-4 py-4 text-sm text-slate-700">
                    {formatCurrency(item.price)}
                  </td>

                  {/* total */}
                  <td className="px-4 py-4 text-right text-sm font-semibold text-slate-900">
                    {formatCurrency(item.price * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* total */}
        <div className="mt-6 flex justify-end">
          <div className="w-full max-w-xs border border-slate-300">
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-sm font-semibold text-slate-700">
                Total Amount
              </p>

              <p className="text-xl font-bold text-slate-900">
                {formatCurrency(invoice.totalAmount)}
              </p>
            </div>
          </div>
        </div>

        {/* footer */}
        <div className="mt-10 border-t border-slate-300 pt-4 text-center">
          <p className="text-xs text-slate-500">
            This is a computer-generated invoice.
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Thank you for shopping with us.
          </p>
        </div>
      </div>
    </Modal>
  );
};
