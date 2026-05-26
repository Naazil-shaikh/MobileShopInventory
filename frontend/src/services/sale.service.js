import { apiClient } from "../api/client.js";

export const saleService = {
  create: async (payload) => {
    const { data } = await apiClient.post("/sales", payload);
    return data.data;
  },

  getHistory: async (params) => {
    const { data } = await apiClient.get("/sales", { params });
    return data.data;
  },

  getInvoice: async (identifier) => {
    const { data } = await apiClient.get(`/sales/invoice/${identifier}`);
    return data.data;
  },
};
