import { apiClient } from "../api/client.js";

export const purchaseOrderService = {
  list: async (params) => {
    const { data } = await apiClient.get("/purchase-orders", { params });
    return data.data;
  },
  create: async (payload) => {
    const { data } = await apiClient.post("/purchase-orders", payload);
    return data.data;
  },
  updateStatus: async (id, status) => {
    const { data } = await apiClient.patch(`/purchase-orders/${id}/status`, {
      status,
    });
    return data.data;
  },
};
