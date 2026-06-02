import { useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { productService } from "../../services/product.service.js";
import { QUERY_KEYS, PAYMENT_METHODS } from "../../utils/constants.js";
import { Select } from "../ui/Select.jsx";
import { Input } from "../ui/Input.jsx";
import { Button } from "../ui/Button.jsx";
import { Card } from "../ui/Card.jsx";
import { ImeiSelector } from "./ImeiSelector.jsx";
import { formatCurrency } from "../../utils/format.js";

const saleItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().min(1),
  price: z.coerce.number().min(0),
});

const saleSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  paymentMethod: z.enum(["cash", "card", "upi"]),
  paymentPlan: z.enum(["full", "emi", "credit"]),
  downPayment: z.coerce.number().min(0).optional(),
  emiTenure: z.coerce.number().min(2).optional(),
  items: z.array(saleItemSchema).min(1),
});

export const CreateSaleForm = ({ customers, onSubmit, isLoading, error: externalError }) => {
  const [imeiSelections, setImeiSelections] = useState({});
  const [localError, setLocalError] = useState("");

  const { data: productsData } = useQuery({
    queryKey: [QUERY_KEYS.products, "sales"],
    queryFn: () => productService.getAll({ page: 1, limit: 100 }),
  });

  const products = productsData?.products ?? [];
  const productMap = useMemo(
    () => Object.fromEntries(products.map((p) => [p._id, p])),
    [products],
  );

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      customerId: "",
      paymentMethod: "cash",
      paymentPlan: "full",
      downPayment: 0,
      emiTenure: 6,
      items: [{ productId: "", quantity: 1, price: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items");
  const paymentPlan = watch("paymentPlan");

  const subtotal = watchedItems.reduce((sum, item, i) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.price) || 0;
    return sum + qty * price;
  }, 0);

  const onFormSubmit = (data) => {
    setLocalError("");
    const items = data.items.map((item, index) => {
      const product = productMap[item.productId];
      const payload = {
        productId: item.productId,
        quantity: Number(item.quantity),
        price: Number(item.price),
      };

      if (product?.hasIMEI) {
        const selected = imeiSelections[index] || [];
        if (selected.length !== Number(item.quantity)) {
          setLocalError(
            `Select exactly ${item.quantity} IMEI(s) for ${product.name}`,
          );
          return;
        }
        payload.imeiIds = selected.map((u) => u._id);
      }

      const qty = Number(item.quantity);
      if (product && qty > product.currentStock) {
        setLocalError(
          `Insufficient stock for ${product.name} (${product.currentStock} available)`,
        );
        return;
      }

      return payload;
    });

    onSubmit({
      ...data,
      items,
      downPayment: Number(data.downPayment) || 0,
      emiTenure: data.paymentPlan === "emi" ? Number(data.emiTenure) : undefined,
    });
  };

  const displayError = externalError || localError;

  return (
    <Card>
      <h2 className="mb-4 font-semibold text-slate-900">New Sale</h2>
      {displayError && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {displayError}
        </p>
      )}

      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Customer"
            placeholder="Select customer"
            options={customers.map((c) => ({
              value: c._id,
              label: `${c.name} (${c.phone})`,
            }))}
            error={errors.customerId?.message}
            {...register("customerId")}
          />
          <Select
            label="Payment Method"
            options={PAYMENT_METHODS}
            error={errors.paymentMethod?.message}
            {...register("paymentMethod")}
          />
          <Select
            label="Payment Plan"
            options={[
              { value: "full", label: "Full Payment" },
              { value: "emi", label: "EMI" },
              { value: "credit", label: "Credit (partial)" },
            ]}
            error={errors.paymentPlan?.message}
            {...register("paymentPlan")}
          />
          {paymentPlan !== "full" && (
            <Input
              label="Down Payment"
              type="number"
              {...register("downPayment")}
            />
          )}
          {paymentPlan === "emi" && (
            <Input
              label="EMI Tenure (months)"
              type="number"
              {...register("emiTenure")}
            />
          )}
        </div>

        <div className="space-y-4">
          <p className="text-sm font-medium text-slate-700">Sale Items</p>
          {fields.map((field, index) => {
            const productId = watchedItems[index]?.productId;
            const product = productMap[productId];
            const quantity = Number(watchedItems[index]?.quantity) || 1;

            return (
              <div
                key={field.id}
                className="rounded-lg border border-slate-200 p-4"
              >
                <div className="grid gap-3 sm:grid-cols-4">
                  <Select
                    label="Product"
                    placeholder="Select"
                    options={products.map((p) => ({
                      value: p._id,
                      label: `${p.name} (stock: ${p.currentStock})`,
                    }))}
                    error={errors.items?.[index]?.productId?.message}
                    {...register(`items.${index}.productId`, {
                      onChange: (e) => {
                        const pid = e.target.value;
                        const product = productMap[pid];
                        if (product) {
                          setValue(`items.${index}.price`, product.sellingPrice);
                        }
                        setImeiSelections((prev) => ({ ...prev, [index]: [] }));
                      },
                    })}
                  />
                  <Input
                    label="Qty"
                    type="number"
                    min={1}
                    max={product?.currentStock || 999}
                    error={errors.items?.[index]?.quantity?.message}
                    {...register(`items.${index}.quantity`)}
                  />
                  <Input
                    label="Unit Price"
                    type="number"
                    error={errors.items?.[index]?.price?.message}
                    {...register(`items.${index}.price`)}
                  />
                  <div className="flex items-end">
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          remove(index);
                          setImeiSelections((prev) => {
                            const next = { ...prev };
                            delete next[index];
                            return next;
                          });
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>

                {product?.hasIMEI && productId && (
                  <ImeiSelector
                    productId={productId}
                    quantity={quantity}
                    selectedUnits={imeiSelections[index] || []}
                    onChange={(units) =>
                      setImeiSelections((prev) => ({ ...prev, [index]: units }))
                    }
                  />
                )}

                {product && !product.hasIMEI && quantity > product.currentStock && (
                  <p className="mt-2 text-xs text-red-600">
                    Exceeds available stock ({product.currentStock})
                  </p>
                )}
              </div>
            );
          })}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              append({ productId: "", quantity: 1, price: 0 })
            }
          >
            + Add item
          </Button>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          <p className="text-lg font-semibold text-slate-900">
            Total: {formatCurrency(subtotal)}
          </p>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Processing sale..." : "Complete Sale"}
          </Button>
        </div>
      </form>
    </Card>
  );
};
