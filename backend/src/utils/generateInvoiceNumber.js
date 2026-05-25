import { Sale } from "../models/sale.model.js";

const generateInvoiceNumber = async () => {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const prefix = `INV-${y}${m}${d}`;

  const lastSale = await Sale.findOne({
    invoiceNumber: new RegExp(`^${prefix}`),
  })
    .sort({ createdAt: -1 })
    .select("invoiceNumber")
    .lean();

  let sequence = 1;
  if (lastSale?.invoiceNumber) {
    const parts = lastSale.invoiceNumber.split("-");
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!Number.isNaN(lastSeq)) {
      sequence = lastSeq + 1;
    }
  }

  return `${prefix}-${String(sequence).padStart(4, "0")}`;
};

export { generateInvoiceNumber };
