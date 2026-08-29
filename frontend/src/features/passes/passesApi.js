import api from "../../api/api";

export const getPasses = async (params) => {
  const { data } = await api.get("/api/passes", { params });
  return data;
};

export const createPass = async (payload) => {
  const { data } = await api.post("/api/passes", payload);
  return data;
};

export const checkoutPass = async (id) => {
  const { data } = await api.patch(`/api/passes/${id}/checkout`, {});
  return data;
};

export const exportPassesCsv = async () => {
  const response = await api.get("/api/passes/export/csv", {
    responseType: "blob",
  });
  return response.data;
};
