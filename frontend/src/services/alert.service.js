import { apiClient } from "../api/client.js";

export const alertService = {
  getAll: async () => {
    const { data } = await apiClient.get("/alerts");
    return data.data;
  },
};
