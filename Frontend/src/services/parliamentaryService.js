import { apiClient } from './api.js';

export const parliamentaryService = {
  getInquiries: async () => {
    try {
      const res = await apiClient.get('/parliamentary/inquiries');
      return res.inquiries || [];
    } catch (e) {
      console.warn('Error fetching parliamentary inquiries:', e);
      return [];
    }
  },

  getInquiryById: async (id) => {
    return apiClient.get(`/parliamentary/inquiries/${id}`);
  },

  draftResponse: async (payload) => {
    return apiClient.post('/parliamentary/draft-response', payload);
  },

  verifyResponse: async (citations) => {
    return apiClient.post('/parliamentary/verify', { citations });
  }
};
