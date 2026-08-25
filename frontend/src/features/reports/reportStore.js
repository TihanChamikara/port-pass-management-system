/**
 * Reports Store - Zustand state management for reports
 */

import { create } from 'zustand';

const useReportStore = create((set) => ({
  // Daily Report
  dailyReport: [],
  dailyReportLoading: false,
  
  // Zone-wise Report
  zoneWiseReport: [],
  zoneWiseReportLoading: false,
  
  // Group Stats
  groupStats: null,
  groupStatsLoading: false,
  
  // Filters
  reportDateFrom: null,
  reportDateTo: null,
  reportZone: null,
  reportCompany: null,
  
  // Export state
  exportLoading: false,
  
  // Actions
  setDailyReport: (report) => set({ dailyReport: report }),
  setDailyReportLoading: (loading) => set({ dailyReportLoading: loading }),
  
  setZoneWiseReport: (report) => set({ zoneWiseReport: report }),
  setZoneWiseReportLoading: (loading) => set({ zoneWiseReportLoading: loading }),
  
  setGroupStats: (stats) => set({ groupStats: stats }),
  setGroupStatsLoading: (loading) => set({ groupStatsLoading: loading }),
  
  setReportDateFrom: (date) => set({ reportDateFrom: date }),
  setReportDateTo: (date) => set({ reportDateTo: date }),
  setReportZone: (zone) => set({ reportZone: zone }),
  setReportCompany: (company) => set({ reportCompany: company }),
  
  setExportLoading: (loading) => set({ exportLoading: loading }),
}));

export default useReportStore;
