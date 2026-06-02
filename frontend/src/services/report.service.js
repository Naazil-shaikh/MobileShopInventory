import { apiClient } from "../api/client.js";

export const reportService = {
  getStockReport: async (period, params = {}) => {
    const { data } = await apiClient.get(`/reports/stock/${period}`, { params });
    return data.data;
  },
  getArchived: async (params) => {
    const { data } = await apiClient.get("/reports/archived", { params });
    return data.data;
  },
  getProfit: async (period = "month") => {
    const { data } = await apiClient.get("/reports/profit", {
      params: { period },
    });
    return data.data;
  },
};
