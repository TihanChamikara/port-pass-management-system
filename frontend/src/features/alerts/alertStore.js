/**
 * Alerts Store - Zustand state management for alerts and dashboard stats
 */

import { create } from 'zustand';

const useAlertStore = create((set) => ({
  // Alerts
  activeAlerts: [],
  alertsLoading: false,
  alertsError: null,
  
  // Dashboard Stats
  stats: null,
  statsLoading: false,
  statsError: null,
  
  // Last check time (for polling)
  lastCheckTime: null,
  
  // Actions
  setActiveAlerts: (alerts) => set({ activeAlerts: alerts }),
  setAlertsLoading: (loading) => set({ alertsLoading: loading }),
  setAlertsError: (error) => set({ alertsError: error }),
  
  setStats: (stats) => set({ stats }),
  setStatsLoading: (loading) => set({ statsLoading: loading }),
  setStatsError: (error) => set({ statsError: error }),
  
  addAlert: (alert) => set((state) => ({
    activeAlerts: [...state.activeAlerts, alert]
  })),
  
  removeAlert: (alertId) => set((state) => ({
    activeAlerts: state.activeAlerts.filter(a => a.id !== alertId)
  })),
  
  setLastCheckTime: (time) => set({ lastCheckTime: time }),
}));

export default useAlertStore;
