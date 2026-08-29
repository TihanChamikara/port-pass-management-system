import api from "../api/api";

export const fetchDashboardSummary = async (dateFrom, dateTo) => {
  try {
    const { data } = await api.get("/api/dashboard/summary", {
      params: {
        date_from: dateFrom,
        date_to: dateTo,
      },
    });
    return data;
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    return null;
  }
};
