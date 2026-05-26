import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supplierSchema } from "../../schemas/supplier.schema.js";
import { Modal } from "../ui/Modal.jsx";
import { Input } from "../ui/Input.jsx";
import { Button } from "../ui/Button.jsx";

export const SupplierFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  supplier,
  isLoading,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(supplierSchema),
  });

  useEffect(() => {
    if (supplier) {
      reset(supplier);
    } else {
      reset({
        name: "",
        phone: "",
        address: "",
        email: "",
        gstNumber: "",
      });
    }
  }, [supplier, reset, isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={supplier ? "Edit Supplier" : "Add Supplier"}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </div>
      }
    >
      <form className="space-y-4">
        <Input label="Name" error={errors.name?.message} {...register("name")} />
        <Input label="Phone" error={errors.phone?.message} {...register("phone")} />
        <Input label="Email" error={errors.email?.message} {...register("email")} />
        <Input
          label="GST Number (optional)"
          placeholder="Leave blank if not available"
          error={errors.gstNumber?.message}
          {...register("gstNumber")}
        />
        <Input label="Address" error={errors.address?.message} {...register("address")} />
      </form>
    </Modal>
  );
};
