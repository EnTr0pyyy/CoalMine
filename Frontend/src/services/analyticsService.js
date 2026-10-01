import { apiClient } from './api.js';

export const analyticsService = {
  getWordCloud: async (payload = {}) => {
    try {
      const res = await apiClient.post('/analytics/wordcloud', payload);
      return res.wordCloud || [];
    } catch (e) {
      console.warn('Error fetching word cloud:', e);
      return [];
    }
  },

  getTopics: async (payload = {}) => {
    try {
      const res = await apiClient.post('/analytics/topics', payload);
      return res.topics || [];
    } catch (e) {
      console.warn('Error fetching topics:', e);
      return [];
    }
  },

  getPlatformStats: async () => {
    try {
      const res = await apiClient.get('/analytics/platform-stats');
      return res;
    } catch (e) {
      console.warn('Error fetching platform stats:', e);
      return null;
    }
  }
};
