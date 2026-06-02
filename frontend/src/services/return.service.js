import { apiClient } from "../api/client.js";

export const returnService = {
  list: async (params) => {
    const { data } = await apiClient.get("/returns", { params });
    return data.data;
  },
  create: async (payload) => {
    const { data } = await apiClient.post("/returns", payload);
    return data.data;
  },
};
