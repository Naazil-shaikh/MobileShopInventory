import { apiClient } from "../api/client.js";

export const inventoryService = {
  addStock: async (payload) => {
    const { data } = await apiClient.post("/inventory/add", payload);
    return data.data;
  },

  reduceStock: async (payload) => {
    const { data } = await apiClient.post("/inventory/reduce", payload);
    return data.data;
  },

  returnStock: async (payload) => {
    const { data } = await apiClient.post("/inventory/return", payload);
    return data.data;
  },

  recordDamage: async (payload) => {
    const { data } = await apiClient.post("/inventory/damage", payload);
    return data.data;
  },

  getHistory: async (params) => {
    const { data } = await apiClient.get("/inventory/history", { params });
    return data.data;
  },

  getLowStock: async () => {
    const { data } = await apiClient.get("/inventory/low-stock");
    return data.data;
  },
};
