import { z } from "zod";

export const supplierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(10, "Valid phone is required"),
  address: z.string().min(1, "Address is required"),
  email: z.string().email("Valid email is required"),
  gstNumber: z.string().optional().or(z.literal("")),
});
