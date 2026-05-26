import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "../ui/Modal.jsx";
import { Select } from "../ui/Select.jsx";
import { Input } from "../ui/Input.jsx";
import { Button } from "../ui/Button.jsx";

const stockSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  note: z.string().optional(),
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
    formState: { errors },
  } = useForm({
    resolver: zodResolver(stockSchema),
    defaultValues: { productId: "", quantity: 1, note: "" },
  });

  const nonImeiProducts = products.filter((p) => !p.hasIMEI);

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
      </form>
    </Modal>
  );
};
