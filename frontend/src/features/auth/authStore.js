import { create } from "zustand";

import api from "../../api/client";

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem("access_token"),
  loading: false,
  login: async (username, password) => {
    set({ loading: true });
    try {
      const { data } = await api.post("/auth/login", { username, password });
      localStorage.setItem("access_token", data.access_token);
      const me = await api.get("/auth/me", {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      set({ token: data.access_token, user: me.data, loading: false });
      return { ok: true };
    } catch (error) {
      set({ loading: false });
      return { ok: false, message: error.response?.data?.detail || "Login failed" };
    }
  },
  loadMe: async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      set({ user: null, token: null });
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      set({ user: data, token });
    } catch {
      localStorage.removeItem("access_token");
      set({ user: null, token: null });
    }
  },
  logout: () => {
    localStorage.removeItem("access_token");
    set({ token: null, user: null });
  },
}));
