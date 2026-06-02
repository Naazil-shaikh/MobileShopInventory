import { apiClient } from "../api/client.js";

export const customerService = {
  getAll: async (params) => {
    const { data } = await apiClient.get("/customers", { params });
    return data.data;
  },

  update: async (id, payload) => {
    const { data } = await apiClient.patch(`/customers/${id}`, payload);
    return data.data;
  },

  create: async (payload) => {
    const { data } = await apiClient.post("/customers", payload);
    return data.data;
  },

  getPurchaseHistory: async (id, params) => {
    const { data } = await apiClient.get(`/customers/${id}/purchases`, {
      params,
    });
    return data.data;
  },
};
