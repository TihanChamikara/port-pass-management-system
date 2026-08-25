/**
 * Reports API Client
 */

import apiClient from '../../api/client';

// Get daily report
export const getDailyReport = async (date, zone = null, company = null) => {
  try {
    const params = { date_str: date };
    if (zone) params.zone = zone;
    if (company) params.company = company;
    
    const response = await apiClient.get('/api/reports/daily', { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Get zone-wise report
export const getZoneWiseReport = async (dateFrom = null, dateTo = null) => {
  try {
    const params = {};
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    
    const response = await apiClient.get('/api/reports/zone-wise', { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Get group statistics
export const getGroupStatistics = async (dateFrom = null, dateTo = null) => {
  try {
    const params = {};
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    
    const response = await apiClient.get('/api/reports/group-stats', { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Export report
export const exportReport = async (reportType, format = 'csv', filters = {}) => {
  try {
    const params = {
      report_type: reportType,
      format: format,
      ...filters,
    };
    
    const response = await apiClient.get('/api/reports/export', {
      params,
      responseType: 'blob'
    });
    
    // Handle file download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `report_${reportType}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};
