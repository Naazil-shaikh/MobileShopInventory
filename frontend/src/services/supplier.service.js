import { apiClient } from "../api/client.js";

export const supplierService = {
  getAll: async (params) => {
    const { data } = await apiClient.get("/suppliers", { params });
    return data.data;
  },

  create: async (payload) => {
    const { data } = await apiClient.post("/suppliers", payload);
    return data.data;
  },

  update: async (id, payload) => {
    const { data } = await apiClient.patch(`/suppliers/${id}`, payload);
    return data.data;
  },

  delete: async (id) => {
    const { data } = await apiClient.delete(`/suppliers/${id}`);
    return data.data;
  },
};
