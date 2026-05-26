import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supplierService } from "../services/supplier.service.js";
import { QUERY_KEYS } from "../utils/constants.js";
import { useDebounce } from "../hooks/useDebounce.js";
import { SearchBar } from "../components/ui/SearchBar.jsx";
import { Pagination } from "../components/ui/Pagination.jsx";
import { PageLoader } from "../components/ui/LoadingSpinner.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { ConfirmDialog } from "../components/ui/ConfirmDialog.jsx";
import { SupplierFormModal } from "../components/suppliers/SupplierFormModal.jsx";
import { Alert } from "../components/ui/Alert.jsx";
import { getApiErrorMessage } from "../utils/format.js";

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

const AVATAR_PALETTES = [
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-blue-100 text-blue-700",
  "bg-amber-100 text-amber-700",
  "bg-cyan-100 text-cyan-700",
];

function avatarClass(name = "") {
  return AVATAR_PALETTES[
    name.charCodeAt(0) % AVATAR_PALETTES.length
  ];
}

function SupplierRow({
  supplier,
  onEdit,
  onDelete,
}) {
  return (
    <tr className="border-b border-slate-100 transition-colors hover:bg-slate-50">
      {/* supplier */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${avatarClass(
              supplier.name
            )}`}
          >
            {getInitials(supplier.name)}
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              {supplier.name}
            </p>

            <p className="truncate text-xs text-slate-500">
              Supplier Partner
            </p>
          </div>
        </div>
      </td>

      {/* phone */}
      <td className="px-5 py-4">
        <p className="text-sm font-medium text-slate-700">
          {supplier.phone || "—"}
        </p>
      </td>

      {/* email */}
      <td className="px-5 py-4">
        <p className="max-w-[220px] truncate text-sm text-slate-600">
          {supplier.email || "—"}
        </p>
      </td>

      {/* gst */}
      <td className="px-5 py-4">
        {supplier.gstNumber ? (
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            GST Registered
          </span>
        ) : (
          <span className="text-xs text-slate-400">
            Not Available
          </span>
        )}
      </td>

      {/* actions */}
      <td className="px-5 py-4">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => onEdit(supplier)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Edit
          </button>

          <button
            onClick={() => onDelete(supplier._id)}
            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

export const SuppliersPage = () => {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [error, setError] = useState("");

  const debouncedSearch = useDebounce(search);

  const { data, isLoading } = useQuery({
    queryKey: [
      QUERY_KEYS.suppliers,
      page,
      debouncedSearch,
    ],

    queryFn: () =>
      supplierService.getAll({
        page,
        limit: 10,
        search:
          debouncedSearch || undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: supplierService.create,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.suppliers],
      });

      setModalOpen(false);
    },

    onError: (err) =>
      setError(getApiErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) =>
      supplierService.update(id, payload),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.suppliers],
      });

      setModalOpen(false);
      setEditing(null);
    },

    onError: (err) =>
      setError(getApiErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: supplierService.delete,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.suppliers],
      });

      setDeleteId(null);
    },

    onError: (err) =>
      setError(getApiErrorMessage(err)),
  });

  return (
    <div className="pb-10">
      {/* ── header ── */}
      <div className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Suppliers
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage supplier contacts and procurement partners
          </p>
        </div>

        <button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition-all duration-200 hover:bg-violet-700 hover:shadow-violet-300"
        >
          <span className="text-base leading-none">
            +
          </span>

          Add Supplier
        </button>
      </div>

      <Alert type="error" message={error} />

      {/* ── search ── */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search suppliers by name, phone, or email..."
        />
      </div>

      {/* ── loading ── */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <PageLoader />
        </div>
      ) : data?.suppliers?.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <EmptyState
            title="No suppliers found"
            description="Add your first supplier to start managing procurement"
            action={
              <button
                onClick={() =>
                  setModalOpen(true)
                }
                className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
              >
                Add Supplier
              </button>
            }
          />
        </div>
      ) : (
        <>
          {/* ── suppliers table ── */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* table header */}
            <div className="grid grid-cols-[2fr_1.2fr_1.6fr_1fr_140px] border-b border-slate-200 bg-slate-50 px-5 py-3">
              {[
                "Supplier",
                "Phone",
                "Email",
                "GST",
                "",
              ].map((header, index) => (
                <span
                  key={index}
                  className={`text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 ${
                    index === 4
                      ? "text-right"
                      : ""
                  }`}
                >
                  {header}
                </span>
              ))}
            </div>

            {/* table body */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <tbody>
                  {data.suppliers.map((supplier) => (
                    <SupplierRow
                      key={supplier._id}
                      supplier={supplier}
                      onEdit={(supplier) => {
                        setEditing(supplier);
                        setModalOpen(true);
                      }}
                      onDelete={(id) =>
                        setDeleteId(id)
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* pagination */}
          <div className="mt-6">
            <Pagination
              pagination={data.pagination}
              onPageChange={setPage}
            />
          </div>
        </>
      )}

      {/* ── supplier modal ── */}
      <SupplierFormModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={(formData) =>
          editing
            ? updateMutation.mutate({
                id: editing._id,
                payload: formData,
              })
            : createMutation.mutate(formData)
        }
        supplier={editing}
        isLoading={
          createMutation.isPending ||
          updateMutation.isPending
        }
      />

      {/* ── confirm dialog ── */}
      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={() =>
          deleteMutation.mutate(deleteId)
        }
        title="Delete supplier"
        message="Supplier must not be linked to any products."
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};