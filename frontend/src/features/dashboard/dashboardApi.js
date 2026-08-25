import api from "../../api/client";

export async function fetchDashboardSummary(dateFrom, dateTo) {
  const { data } = await api.get("/dashboard/summary", {
    params: {
      date_from: dateFrom,
      date_to: dateTo,
    },
  });
  return data;
}
