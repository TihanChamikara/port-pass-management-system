import { create } from 'zustand';
import api from '../api/api';

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,

  login: async (username, password) => {
    set({ loading: true });
    try {
      const response = await api.post('/api/auth/login', { username, password });
      const { access_token } = response.data;
      localStorage.setItem('token', access_token);

      // Immediately fetch user details so role is known
      let userData = null;
      try {
        const meRes = await api.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        userData = meRes.data;
      } catch (e) {
        console.error('Failed to fetch user after login', e);
      }

      set({ user: userData, token: access_token, isAuthenticated: true, loading: false });
      return { success: true, user: userData };
    } catch (error) {
      set({ loading: false });
      return { success: false, error: error.response?.data?.detail || 'Login failed' };
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  fetchMe: async () => {
    try {
      const response = await api.get('/api/auth/me');
      set({ user: response.data, isAuthenticated: true });
    } catch (error) {
      localStorage.removeItem('token');
      set({ user: null, token: null, isAuthenticated: false });
    }
  },
}));
