import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { repairService } from "../services/repair.service.js";
import { customerService } from "../services/customer.service.js";
import { Button } from "../components/ui/Button.jsx";
import { Input } from "../components/ui/Input.jsx";
import { Card } from "../components/ui/Card.jsx";
import { getApiErrorMessage } from "../utils/format.js";
import { Alert } from "../components/ui/Alert.jsx";

export const RepairsPage = () => {
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    customerId: "",
    deviceName: "",
    imei: "",
    issue: "",
    estimatedCost: "",
  });

  const { data } = useQuery({
    queryKey: ["repairs"],
    queryFn: () => repairService.list({ page: 1, limit: 20 }),
  });

  const { data: customers } = useQuery({
    queryKey: ["customers-repair"],
    queryFn: () => customerService.getAll({ page: 1, limit: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: repairService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repairs"] });
      setError("");
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  return (
    <div className="pb-10">
      <h1 className="text-2xl font-bold text-slate-900">Repair Jobs</h1>
      <Alert type="error" message={error} />
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">New Repair Job</h2>
          <div className="space-y-3">
            <select
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: e.target.value })}
            >
              <option value="">Customer</option>
              {customers?.customers?.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Input
              label="Device"
              value={form.deviceName}
              onChange={(e) => setForm({ ...form, deviceName: e.target.value })}
            />
            <Input
              label="IMEI"
              value={form.imei}
              onChange={(e) => setForm({ ...form, imei: e.target.value })}
            />
            <Input
              label="Issue"
              value={form.issue}
              onChange={(e) => setForm({ ...form, issue: e.target.value })}
            />
            <Button
              onClick={() =>
                createMutation.mutate({
                  ...form,
                  estimatedCost: Number(form.estimatedCost) || 0,
                })
              }
            >
              Create Job
            </Button>
          </div>
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">Active Jobs</h2>
          <ul className="space-y-2 text-sm">
            {data?.jobs?.map((j) => (
              <li key={j._id} className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="font-medium">
                  {j.jobNumber} — {j.deviceName}
                </p>
                <p className="text-slate-500">
                  {j.customerId?.name} · {j.status}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
};
