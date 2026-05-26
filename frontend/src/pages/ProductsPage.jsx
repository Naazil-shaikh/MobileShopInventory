import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { productService } from "../services/product.service.js";
import { supplierService } from "../services/supplier.service.js";
import { QUERY_KEYS, PRODUCT_CATEGORIES } from "../utils/constants.js";
import { useDebounce } from "../hooks/useDebounce.js";
import { SearchBar } from "../components/ui/SearchBar.jsx";
import { Select } from "../components/ui/Select.jsx";
import { Pagination } from "../components/ui/Pagination.jsx";
import { PageLoader } from "../components/ui/LoadingSpinner.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { ConfirmDialog } from "../components/ui/ConfirmDialog.jsx";
import { ProductFormModal } from "../components/products/ProductFormModal.jsx";
import { formatCurrency, getApiErrorMessage } from "../utils/format.js";
import { Alert } from "../components/ui/Alert.jsx";

export const ProductsPage = () => {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [error, setError] = useState("");

  const debouncedSearch = useDebounce(search);

  const { data, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.products, page, debouncedSearch, category],

    queryFn: () =>
      productService.getAll({
        page,
        limit: 10,
        search: debouncedSearch || undefined,
        category: category || undefined,
      }),
  });

  const { data: suppliersData } = useQuery({
    queryKey: [QUERY_KEYS.suppliers, "all"],

    queryFn: () =>
      supplierService.getAll({
        page: 1,
        limit: 100,
      }),
  });

  const createMutation = useMutation({
    mutationFn: productService.create,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.products],
      });

      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.dashboard],
      });

      setModalOpen(false);
      setError("");
    },

    onError: (err) => setError(getApiErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) =>
      productService.update(id, payload),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.products],
      });

      setModalOpen(false);
      setEditing(null);
      setError("");
    },

    onError: (err) => setError(getApiErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: productService.delete,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.products],
      });

      setDeleteId(null);
    },

    onError: (err) => setError(getApiErrorMessage(err)),
  });

  const handleSubmit = (formData) => {
    const payload = {
      ...formData,
      hasIMEI: Boolean(formData.hasIMEI),

      currentStock: formData.hasIMEI
        ? 0
        : Number(formData.currentStock),
    };

    if (editing) {
      const { currentStock, ...rest } = payload;

      updateMutation.mutate({
        id: editing._id,
        payload: rest,
      });
    } else {
      createMutation.mutate(payload);
    }
  };

  const getStockStyles = (product) => {
    if (product.currentStock <= product.lowStockThreshold) {
      return "bg-amber-100 text-amber-700 border-amber-200";
    }

    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  };

  return (
    <div className="pb-10">
      {/* ── header ── */}
      <div className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Products
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage product catalog, pricing, stock, and IMEI tracking
          </p>
        </div>

        <button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition-all duration-200 hover:bg-violet-700 hover:shadow-violet-300"
        >
          <span className="text-base leading-none">+</span>
          Add Product
        </button>
      </div>

      <Alert type="error" message={error} />

      {/* ── filters ── */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex-1">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search by product name or brand..."
            />
          </div>

          <Select
            options={[
              {
                value: "",
                label: "All categories",
              },
              ...PRODUCT_CATEGORIES,
            ]}
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="w-full lg:w-[220px]"
          />
        </div>
      </div>

      {/* ── loading ── */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <PageLoader />
        </div>
      ) : data?.products?.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <EmptyState
            title="No products found"
            description="Add your first product to start managing inventory"
            action={
              <button
                onClick={() => setModalOpen(true)}
                className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
              >
                Add Product
              </button>
            }
          />
        </div>
      ) : (
        <>
          {/* ── products grid ── */}
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {data.products.map((product) => (
              <div
                key={product._id}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-md"
              >
                {/* top */}
                <div className="border-b border-slate-100 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="truncate text-lg font-bold tracking-tight text-slate-900">
                          {product.name}
                        </h2>

                        {product.hasIMEI && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                            IMEI
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-sm text-slate-500">
                        {product.brand}
                      </p>
                    </div>

                    <div
                      className={`rounded-full border px-2.5 py-1 text-xs font-bold ${getStockStyles(
                        product
                      )}`}
                    >
                      {product.currentStock}
                    </div>
                  </div>

                  {/* category */}
                  <div className="mt-4 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {product.category}
                  </div>
                </div>

                {/* pricing */}
                <div className="grid grid-cols-2 border-b border-slate-100">
                  <div className="p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Selling Price
                    </p>

                    <p className="mt-1 text-lg font-bold text-slate-900">
                      {formatCurrency(product.sellingPrice)}
                    </p>
                  </div>

                  <div className="border-l border-slate-100 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Stock Status
                    </p>

                    <p
                      className={`mt-1 text-sm font-semibold ${
                        product.currentStock <=
                        product.lowStockThreshold
                          ? "text-amber-700"
                          : "text-emerald-700"
                      }`}
                    >
                      {product.currentStock <=
                      product.lowStockThreshold
                        ? "Low Stock"
                        : "In Stock"}
                    </p>
                  </div>
                </div>

                {/* actions */}
                <div className="flex items-center justify-between gap-3 p-4">
                  <button
                    onClick={() => {
                      setEditing(product);
                      setModalOpen(true);
                    }}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => setDeleteId(product._id)}
                    className="flex-1 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ── pagination ── */}
          <div className="mt-6">
            <Pagination
              pagination={data.pagination}
              onPageChange={setPage}
            />
          </div>
        </>
      )}

      {/* ── modal ── */}
      <ProductFormModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
        suppliers={suppliersData?.suppliers ?? []}
        product={editing}
        isLoading={
          createMutation.isPending ||
          updateMutation.isPending
        }
      />

      {/* ── confirm dialog ── */}
      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMutation.mutate(deleteId)}
        title="Delete product"
        message="This action cannot be undone. Product must have zero stock."
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};