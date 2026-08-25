/**
 * Group Pass Store - Zustand state management for group passes
 */

import { create } from 'zustand';

const initialState = {
  // Current group being edited
  currentGroup: null,
  currentVisitors: [],
  
  // List of groups
  groups: [],
  groupsLoading: false,
  groupsError: null,
  
  // Pagination
  page: 1,
  pageSize: 20,
  total: 0,
  
  // Filters
  searchTerm: '',
  statusFilter: null,
  zoneFilter: null,
  
  // UI state
  isFormOpen: false,
  step: 1,  // 1 = group info, 2 = add visitors
};

const useGroupStore = create((set, get) => ({
  ...initialState,
  
  // Form Management
  openForm: () => set({ isFormOpen: true, step: 1, currentGroup: null, currentVisitors: [] }),
  closeForm: () => set({ isFormOpen: false }),
  
  // Group Management
  setCurrentGroup: (group) => set({ currentGroup: group }),
  setCurrentVisitors: (visitors) => set({ currentVisitors: visitors }),
  
  addVisitor: (visitor) => set({
    currentVisitors: [...get().currentVisitors, { ...visitor, id: Date.now() }]
  }),
  
  removeVisitor: (id) => set({
    currentVisitors: get().currentVisitors.filter(v => v.id !== id)
  }),
  
  updateVisitor: (id, updates) => set({
    currentVisitors: get().currentVisitors.map(v => 
      v.id === id ? { ...v, ...updates } : v
    )
  }),
  
  // Step Navigation
  goToStep: (step) => set({ step }),
  nextStep: () => {
    const { step } = get();
    if (step < 2) set({ step: step + 1 });
  },
  prevStep: () => {
    const { step } = get();
    if (step > 1) set({ step: step - 1 });
  },
  
  // Groups List Management
  setGroups: (groups) => set({ groups }),
  setGroupsLoading: (loading) => set({ groupsLoading: loading }),
  setGroupsError: (error) => set({ groupsError: error }),
  
  // Pagination
  setPage: (page) => set({ page }),
  setTotal: (total) => set({ total }),
  
  // Filters
  setSearchTerm: (term) => set({ searchTerm: term, page: 1 }),
  setStatusFilter: (status) => set({ statusFilter: status, page: 1 }),
  setZoneFilter: (zone) => set({ zoneFilter: zone, page: 1 }),
  
  // Clear
  clearForm: () => set({
    currentGroup: null,
    currentVisitors: [],
    step: 1,
  }),
}));

export default useGroupStore;
