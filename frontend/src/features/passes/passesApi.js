import api from "../../api/client";

export async function getPasses(params) {
  const { data } = await api.get("/passes", { params });
  return data;
}

export async function createPass(payload) {
  const { data } = await api.post("/passes", payload);
  return data;
}

export async function checkoutPass(passId) {
  const { data } = await api.patch(`/passes/${passId}/checkout`, {});
  return data;
}

export async function exportPassesCsv() {
  const response = await api.get("/passes/export/csv", { responseType: "blob" });
  return response.data;
}

export async function validateAccess(payload) {
  const { data } = await api.post("/validate-access", payload);
  return data;
}

export async function fetchPassTypeReport() {
  const { data } = await api.get("/reports/pass-types");
  return data;
}

export async function fetchAccessViolations() {
  const { data } = await api.get("/reports/access-violations");
  return data;
}
