import { z } from "zod";

export const productSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    brand: z.string().min(1, "Brand is required"),
    category: z.enum(["mobile", "accessory", "charger", "cable", "earphones"]),
    purchasePrice: z.coerce.number().min(0, "Must be 0 or more"),
    sellingPrice: z.coerce.number().min(0, "Must be 0 or more"),
    currentStock: z.coerce.number().min(0, "Must be 0 or more"),
    lowStockThreshold: z.coerce.number().min(0, "Must be 0 or more"),
    supplier: z.string().min(1, "Supplier is required"),
    hasIMEI: z.boolean().default(false),
    purchasePaymentType: z.enum(["paid", "credit"]).default("paid"),
    supplierBillNumber: z.string().optional(),
    paidAmount: z.coerce.number().min(0).optional(),
  })
  .superRefine((data, ctx) => {
    const hasStock = !data.hasIMEI && data.currentStock > 0;
    if (hasStock && data.purchasePaymentType === "credit") {
      if (!data.supplierBillNumber?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["supplierBillNumber"],
          message: "Supplier bill / invoice number is required for credit purchase",
        });
      }
    }
  });
