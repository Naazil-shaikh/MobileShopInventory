import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  brand: z.string().min(1, "Brand is required"),
  category: z.enum(["mobile", "accessory", "charger", "cable", "earphones"]),
  purchasePrice: z.coerce.number().min(0, "Must be 0 or more"),
  sellingPrice: z.coerce.number().min(0, "Must be 0 or more"),
  currentStock: z.coerce.number().min(0, "Must be 0 or more"),
  lowStockThreshold: z.coerce.number().min(0, "Must be 0 or more"),
  supplier: z.string().min(1, "Supplier is required"),
  hasIMEI: z.boolean().default(false),
});
