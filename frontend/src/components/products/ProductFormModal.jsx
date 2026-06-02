import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productSchema } from "../../schemas/product.schema.js";
import { Modal } from "../ui/Modal.jsx";
import { Input } from "../ui/Input.jsx";
import { Select } from "../ui/Select.jsx";
import { Button } from "../ui/Button.jsx";
import { PRODUCT_CATEGORIES } from "../../utils/constants.js";

export const ProductFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  suppliers,
  product,
  isLoading,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      brand: "",
      category: "mobile",
      purchasePrice: 0,
      sellingPrice: 0,
      currentStock: 0,
      lowStockThreshold: 2,
      supplier: "",
      hasIMEI: false,
      purchasePaymentType: "paid",
      supplierBillNumber: "",
      paidAmount: 0,
    },
  });

  const hasIMEI = watch("hasIMEI");
  const currentStock = watch("currentStock");
  const purchasePaymentType = watch("purchasePaymentType");
  const purchasePrice = watch("purchasePrice");

  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        brand: product.brand,
        category: product.category,
        purchasePrice: product.purchasePrice,
        sellingPrice: product.sellingPrice,
        currentStock: product.currentStock,
        lowStockThreshold: product.lowStockThreshold,
        supplier: product.supplier?._id || product.supplier,
        hasIMEI: product.hasIMEI,
      });
    } else {
      reset({
        name: "",
        brand: "",
        category: "mobile",
        purchasePrice: 0,
        sellingPrice: 0,
        currentStock: 0,
        lowStockThreshold: 2,
        supplier: "",
        hasIMEI: false,
        purchasePaymentType: "paid",
        supplierBillNumber: "",
        paidAmount: 0,
      });
    }
  }, [product, reset, isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? "Edit Product" : "Add Product"}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isLoading}>
            {isLoading ? "Saving..." : product ? "Update" : "Create"}
          </Button>
        </div>
      }
    >
      <form className="grid gap-4 sm:grid-cols-2">
        <Input label="Name" error={errors.name?.message} {...register("name")} />
        <Input label="Brand" error={errors.brand?.message} {...register("brand")} />
        <Select
          label="Category"
          options={PRODUCT_CATEGORIES}
          error={errors.category?.message}
          {...register("category")}
        />
        <Select
          label="Supplier"
          placeholder="Select supplier"
          options={suppliers.map((s) => ({ value: s._id, label: s.name }))}
          error={errors.supplier?.message}
          {...register("supplier")}
        />
        <Input
          label="Purchase Price"
          type="number"
          error={errors.purchasePrice?.message}
          {...register("purchasePrice")}
        />
        <Input
          label="Selling Price"
          type="number"
          error={errors.sellingPrice?.message}
          {...register("sellingPrice")}
        />
        {!product && (
          <Input
            label="Initial Stock"
            type="number"
            disabled={hasIMEI}
            error={errors.currentStock?.message}
            {...register("currentStock")}
          />
        )}
        <Input
          label="Low Stock Threshold"
          type="number"
          error={errors.lowStockThreshold?.message}
          {...register("lowStockThreshold")}
        />
        <div className="flex items-center gap-2 sm:col-span-2">
          <input type="checkbox" id="hasIMEI" {...register("hasIMEI")} />
          <label htmlFor="hasIMEI" className="text-sm text-slate-700">
            Track individual devices by IMEI (mobile phones)
          </label>
        </div>
        {hasIMEI && !product && (
          <p className="sm:col-span-2 text-xs text-amber-700">
            IMEI products start with 0 stock. Register devices on the Mobile IMEI
            page — enter the supplier bill number there when buying on credit.
          </p>
        )}
        {!product && !hasIMEI && Number(currentStock) > 0 && (
          <div className="sm:col-span-2 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800">Supplier purchase</p>
            <Select
              label="Payment to supplier"
              options={[
                { value: "paid", label: "Paid in full (cash/UPI/card)" },
                { value: "credit", label: "On supplier credit (partial or full)" },
              ]}
              error={errors.purchasePaymentType?.message}
              {...register("purchasePaymentType")}
            />
            {purchasePaymentType === "credit" && (
              <>
                <Input
                  label="Supplier bill / invoice number"
                  placeholder="e.g. INV/2025/1042 from supplier's bill"
                  error={errors.supplierBillNumber?.message}
                  {...register("supplierBillNumber")}
                />
                <Input
                  label="Paid now to supplier"
                  type="number"
                  error={errors.paidAmount?.message}
                  {...register("paidAmount")}
                />
                <p className="text-xs text-slate-500">
                  Purchase total: ₹
                  {(Number(currentStock) * Number(purchasePrice || 0)).toLocaleString(
                    "en-IN",
                  )}
                  . Remaining balance will appear in Finance → Supplier Credit.
                </p>
              </>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
};
