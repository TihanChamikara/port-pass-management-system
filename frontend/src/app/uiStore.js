import { create } from "zustand";

export const useUiStore = create((set) => ({
  mode: localStorage.getItem("app_mode") || "light",
  toggleMode: () =>
    set((state) => {
      const next = state.mode === "light" ? "dark" : "light";
      localStorage.setItem("app_mode", next);
      return { mode: next };
    }),
}));
