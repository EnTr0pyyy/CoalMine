import { apiClient } from './api.js';

export const reportsService = {
  getTemplates: async () => {
    try {
      const res = await apiClient.get('/reports/templates');
      return res.templates || [];
    } catch (e) {
      console.warn('Error fetching report templates:', e);
      return [];
    }
  },

  generateAutomatedReport: async ({ templateType, subsidiary, period, metrics }) => {
    return apiClient.post('/reports/generate', { templateType, subsidiary, period, metrics });
  },

  generateReport: async (payload) => {
    return apiClient.post('/reports', payload);
  },

  analyzeAndGenerateFromUpload: async (file, { templateType, subsidiary, period } = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    if (templateType) formData.append('templateType', templateType);
    if (subsidiary) formData.append('subsidiary', subsidiary);
    if (period) formData.append('period', period);
    return apiClient.postForm('/reports/analyze-upload', formData);
  }
};
