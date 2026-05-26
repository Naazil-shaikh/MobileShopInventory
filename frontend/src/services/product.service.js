import { apiClient } from "../api/client.js";

export const productService = {
  getAll: async (params) => {
    const { data } = await apiClient.get("/products", { params });
    return data.data;
  },

  getById: async (id) => {
    const { data } = await apiClient.get(`/products/${id}`);
    return data.data;
  },

  create: async (payload) => {
    const { data } = await apiClient.post("/products", payload);
    return data.data;
  },

  update: async (id, payload) => {
    const { data } = await apiClient.patch(`/products/${id}`, payload);
    return data.data;
  },

  delete: async (id) => {
    const { data } = await apiClient.delete(`/products/${id}`);
    return data.data;
  },
};
