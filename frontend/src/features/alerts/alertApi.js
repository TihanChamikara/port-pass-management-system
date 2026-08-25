/**
 * Alerts API Client
 */

import apiClient from '../../api/client';

// Check for overdue passes and create alerts
export const checkOverdueAlerts = async (thresholdHours = 4) => {
  try {
    const response = await apiClient.post('/api/alerts/check-overdue', null, {
      params: { threshold_hours: thresholdHours }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Get active alerts
export const getActiveAlerts = async () => {
  try {
    const response = await apiClient.get('/api/alerts/active');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Resolve an alert
export const resolveAlert = async (alertId) => {
  try {
    const response = await apiClient.patch(`/api/alerts/${alertId}/resolve`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Get dashboard statistics
export const getDashboardStats = async () => {
  try {
    const response = await apiClient.get('/api/alerts/stats');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};
