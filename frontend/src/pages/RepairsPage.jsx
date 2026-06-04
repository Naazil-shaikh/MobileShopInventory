import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { repairService } from "../services/repair.service.js";
import { customerService } from "../services/customer.service.js";
import { Button } from "../components/ui/Button.jsx";
import { Input } from "../components/ui/Input.jsx";
import { Card } from "../components/ui/Card.jsx";
import { getApiErrorMessage } from "../utils/format.js";
import { Alert } from "../components/ui/Alert.jsx";

const STATUS_STYLES = {
  pending: "bg-slate-100 text-slate-700 border-slate-200",
  in_progress: "bg-amber-100 text-amber-700 border-amber-200",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-100 text-rose-700 border-rose-200",
};

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

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => repairService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repairs"] });
      setError("");
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: repairService.delete,
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
          <h2 className="mb-3 font-semibold">Jobs</h2>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="py-2 pr-3">Job</th>
                  <th className="py-2 pr-3">Customer</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.jobs?.map((j) => {
                  const badge =
                    STATUS_STYLES[j.status] ||
                    "bg-slate-100 text-slate-700 border-slate-200";
                  const isCompleted = j.status === "completed";
                  return (
                    <tr key={j._id} className="align-top">
                      <td className="py-3 pr-3">
                        <p className="font-semibold text-slate-900">
                          {j.jobNumber}
                        </p>
                        <p className="text-slate-500">{j.deviceName}</p>
                      </td>
                      <td className="py-3 pr-3">
                        {j.customerId?.name || "-"}
                      </td>
                      <td className="py-3 pr-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${badge}`}
                        >
                          {j.status}
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              updateMutation.mutate({
                                id: j._id,
                                payload: { status: "in_progress" },
                              })
                            }
                            disabled={j.status !== "pending"}
                          >
                            Start Repair
                          </Button>
                          <Button
                            size="sm"
                            onClick={() =>
                              updateMutation.mutate({
                                id: j._id,
                                payload: { status: "completed" },
                              })
                            }
                            disabled={isCompleted || j.status === "cancelled"}
                          >
                            Mark Completed
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => deleteMutation.mutate(j._id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};
