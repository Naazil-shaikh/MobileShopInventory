import { apiClient } from "../api/client.js";

export const repairService = {
  list: async (params) => {
    const { data } = await apiClient.get("/repairs", { params });
    return data.data;
  },
  create: async (payload) => {
    const { data } = await apiClient.post("/repairs", payload);
    return data.data;
  },
  update: async (id, payload) => {
    const { data } = await apiClient.patch(`/repairs/${id}`, payload);
    return data.data;
  },
  delete: async (id) => {
    const { data } = await apiClient.delete(`/repairs/${id}`);
    return data.data;
  },
};
