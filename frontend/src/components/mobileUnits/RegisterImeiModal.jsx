import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "../ui/Modal.jsx";
import { Select } from "../ui/Select.jsx";
import { Input } from "../ui/Input.jsx";
import { Button } from "../ui/Button.jsx";

const unitSchema = z.object({
  imei: z.string().min(10, "Valid IMEI required"),
  color: z.string().min(1, "Color required"),
  storage: z.coerce.number().min(1),
  purchaseDate: z.string().min(1, "Date required"),
});

const registerSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  units: z.array(unitSchema).min(1),
});

export const RegisterImeiModal = ({
  isOpen,
  onClose,
  onSubmit,
  imeiProducts,
  isLoading,
}) => {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      productId: "",
      units: [{ imei: "", color: "", storage: 128, purchaseDate: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "units" });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Register IMEI Devices"
      size="xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isLoading}>
            {isLoading ? "Registering..." : "Register"}
          </Button>
        </div>
      }
    >
      <form className="space-y-4">
        <Select
          label="Product"
          placeholder="Select mobile product"
          options={imeiProducts.map((p) => ({
            value: p._id,
            label: `${p.name} — ${p.brand}`,
          }))}
          error={errors.productId?.message}
          {...register("productId")}
        />

        {fields.map((field, index) => (
          <div
            key={field.id}
            className="grid gap-3 rounded-lg border border-slate-200 p-4 sm:grid-cols-2"
          >
            <Input
              label="IMEI"
              error={errors.units?.[index]?.imei?.message}
              {...register(`units.${index}.imei`)}
            />
            <Input
              label="Color"
              error={errors.units?.[index]?.color?.message}
              {...register(`units.${index}.color`)}
            />
            <Input
              label="Storage (GB)"
              type="number"
              error={errors.units?.[index]?.storage?.message}
              {...register(`units.${index}.storage`)}
            />
            <Input
              label="Purchase Date"
              type="date"
              error={errors.units?.[index]?.purchaseDate?.message}
              {...register(`units.${index}.purchaseDate`)}
            />
            {fields.length > 1 && (
              <div className="sm:col-span-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                  Remove unit
                </Button>
              </div>
            )}
          </div>
        ))}

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() =>
            append({ imei: "", color: "", storage: 128, purchaseDate: "" })
          }
        >
          + Add another device
        </Button>
      </form>
    </Modal>
  );
};
