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

  downloadExcel: async (period, params = {}) => {
    const response = await apiClient.get(`/reports/export/${period}`, {
      params,
      responseType: "blob",
    });

    const blob = new Blob([response.data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const disposition = response.headers["content-disposition"];
    let filename = `report-${period}.xlsx`;
    if (disposition) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match?.[1]) filename = match[1];
    }

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
