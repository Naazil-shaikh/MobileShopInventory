import { apiClient } from "../api/client.js";

export const mobileUnitService = {
  register: async (payload) => {
    const { data } = await apiClient.post("/mobile-units", payload);
    return data.data;
  },

  searchByImei: async (imei) => {
    const { data } = await apiClient.get(`/mobile-units/imei/${imei}`);
    return data.data;
  },

  updateStatus: async (id, status) => {
    const { data } = await apiClient.patch(`/mobile-units/${id}/status`, {
      status,
    });
    return data.data;
  },
};
