import { apiClient } from './api.js';

export const subsidiaryService = {
  getSubsidiaries: async () => {
    try {
      const res = await apiClient.get('/subsidiaries');
      return res.subsidiaries || [];
    } catch (e) {
      console.warn('Error fetching subsidiaries:', e);
      return [];
    }
  },

  getSubsidiaryByCode: async (code) => {
    return apiClient.get(`/subsidiaries/${code}`);
  }
};
