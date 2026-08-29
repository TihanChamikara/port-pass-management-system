import { create } from 'zustand';

const stored = localStorage.getItem('darkMode');

export const useThemeStore = create((set) => ({
  darkMode: stored === 'true',
  toggleDarkMode: () =>
    set((state) => {
      const next = !state.darkMode;
      localStorage.setItem('darkMode', String(next));
      return { darkMode: next };
    }),
}));
