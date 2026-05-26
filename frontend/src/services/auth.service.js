import { apiClient } from "../api/client.js";

export const authService = {
  login: async (credentials) => {
    const { data } = await apiClient.post("/auth/login", credentials);
    return data.data;
  },

  register: async (payload) => {
    const { data } = await apiClient.post("/auth/register", payload);
    return data.data;
  },

  logout: async () => {
    const { data } = await apiClient.post("/auth/logout");
    return data;
  },

  refreshToken: async () => {
    const { data } = await apiClient.post("/auth/refresh-token");
    return data.data;
  },
};
