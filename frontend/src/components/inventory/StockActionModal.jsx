import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "../ui/Modal.jsx";
import { Select } from "../ui/Select.jsx";
import { Input } from "../ui/Input.jsx";
import { Button } from "../ui/Button.jsx";

const stockSchema = z
  .object({
    productId: z.string().min(1, "Product is required"),
    quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
    note: z.string().optional(),
    purchasePaymentType: z.enum(["paid", "credit"]).default("paid"),
    supplierBillNumber: z.string().optional(),
    paidAmount: z.coerce.number().min(0).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.purchasePaymentType === "credit" && !data.supplierBillNumber?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["supplierBillNumber"],
        message: "Supplier bill / invoice number is required for credit purchase",
      });
    }
  });

export const StockActionModal = ({
  isOpen,
  onClose,
  onSubmit,
  products,
  actionType,
  isLoading,
}) => {
  const titles = {
    add: "Add Stock",
    reduce: "Reduce Stock",
    return: "Return Stock",
    damage: "Record Damage",
  };

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(stockSchema),
    defaultValues: {
      productId: "",
      quantity: 1,
      note: "",
      purchasePaymentType: "paid",
      supplierBillNumber: "",
      paidAmount: 0,
    },
  });

  const nonImeiProducts = products.filter((p) => !p.hasIMEI);
  const selectedProduct = nonImeiProducts.find((p) => p._id === watch("productId"));
  const quantity = watch("quantity");
  const purchasePaymentType = watch("purchasePaymentType");
  const showPurchaseFields = actionType === "add";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={titles[actionType]}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isLoading}>
            {isLoading ? "Processing..." : "Submit"}
          </Button>
        </div>
      }
    >
      <form className="space-y-4">
        <Select
          label="Product"
          placeholder="Select product"
          options={nonImeiProducts.map((p) => ({
            value: p._id,
            label: `${p.name} (stock: ${p.currentStock})`,
          }))}
          error={errors.productId?.message}
          {...register("productId")}
        />
        {nonImeiProducts.length === 0 && (
          <p className="text-xs text-amber-700">
            Only non-IMEI products appear here. Use Mobile IMEI page for phones.
          </p>
        )}
        <Input
          label="Quantity"
          type="number"
          error={errors.quantity?.message}
          {...register("quantity")}
        />
        <Input label="Note" {...register("note")} />
        {showPurchaseFields && (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800">Supplier purchase</p>
            <Select
              label="Payment to supplier"
              options={[
                { value: "paid", label: "Paid in full" },
                { value: "credit", label: "On supplier credit" },
              ]}
              error={errors.purchasePaymentType?.message}
              {...register("purchasePaymentType")}
            />
            {purchasePaymentType === "credit" && (
              <>
                <Input
                  label="Supplier bill / invoice number"
                  placeholder="From supplier's invoice"
                  error={errors.supplierBillNumber?.message}
                  {...register("supplierBillNumber")}
                />
                <Input
                  label="Paid now to supplier"
                  type="number"
                  error={errors.paidAmount?.message}
                  {...register("paidAmount")}
                />
                {selectedProduct && (
                  <p className="text-xs text-slate-500">
                    Purchase total: ₹
                    {(
                      Number(quantity || 0) * Number(selectedProduct.purchasePrice || 0)
                    ).toLocaleString("en-IN")}
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
};
