import { apiClient } from "../api/client.js";

export const customerService = {
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
