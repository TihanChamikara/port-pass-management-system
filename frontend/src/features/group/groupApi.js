/**
 * Group Pass API Client
 */

import apiClient from '../../api/client';

// Create a new group pass (Step 1)
export const createGroupPass = async (groupData) => {
  try {
    const response = await apiClient.post('/api/pass-groups', groupData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Add visitors to group (Step 2)
export const addVisitorsToGroup = async (groupId, visitors) => {
  try {
    const response = await apiClient.post(`/api/pass-groups/${groupId}/visitors`, {
      visitors: visitors.map(v => ({
        visitor_name: v.visitor_name,
        nic_number: v.nic_number,
        contact_number: v.contact_number,
      }))
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Get list of groups
export const listGroups = async (page = 1, pageSize = 20, filters = {}) => {
  try {
    const params = {
      page,
      page_size: pageSize,
      ...filters,
    };
    const response = await apiClient.get('/api/pass-groups', { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Get group details with passes
export const getGroupDetail = async (groupId) => {
  try {
    const response = await apiClient.get(`/api/pass-groups/${groupId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Get passes for a group
export const getGroupPasses = async (groupId) => {
  try {
    const response = await apiClient.get(`/api/pass-groups/${groupId}/passes`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Complete a group
export const completeGroup = async (groupId) => {
  try {
    const response = await apiClient.patch(`/api/pass-groups/${groupId}/complete`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Remove a visitor from group
export const removeVisitorFromGroup = async (groupId, passId) => {
  try {
    const response = await apiClient.delete(`/api/pass-groups/${groupId}/visitors/${passId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};
