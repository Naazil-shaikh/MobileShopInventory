import { apiClient } from "../api/client.js";

export const financeService = {
  getOverview: async () => {
    const { data } = await apiClient.get("/finance/overview");
    return data.data;
  },
  listPayables: async (params) => {
    const { data } = await apiClient.get("/finance/payables", { params });
    return data.data;
  },
  createPayable: async (payload) => {
    const { data } = await apiClient.post("/finance/payables", payload);
    return data.data;
  },
  payBill: async (id, payload) => {
    const { data } = await apiClient.post(`/finance/payables/${id}/pay`, payload);
    return data.data;
  },
  listReceivables: async (params) => {
    const { data } = await apiClient.get("/finance/receivables", { params });
    return data.data;
  },
  payInstallment: async (id, payload) => {
    const { data } = await apiClient.post(`/finance/receivables/${id}/pay`, payload);
    return data.data;
  },
  paySaleReceivable: async (saleId, payload) => {
    const { data } = await apiClient.post(
      `/finance/receivables/sale/${saleId}/pay`,
      payload,
    );
    return data.data;
  },
  getCashbook: async (params) => {
    const { data } = await apiClient.get("/finance/cashbook", { params });
    return data.data;
  },
  addCashbookEntry: async (payload) => {
    const { data } = await apiClient.post("/finance/cashbook", payload);
    return data.data;
  },
};
