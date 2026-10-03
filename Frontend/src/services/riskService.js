import { apiClient, USE_MOCKS, mockDelay } from './api.js';
import { mockRiskScores, mockRecurringIssues } from '../data/mockData.js';

// NOTE: risk scores and recurring-issue patterns are always computed
// by the backend/AI service. This layer only ever fetches and
// returns what the server sends — no scoring or pattern-detection
// logic belongs in the frontend.

async function getRiskScores() {
  if (USE_MOCKS) return mockDelay(mockRiskScores);
  try {
    return await apiClient.get('/risk');
  } catch (e) {
    console.warn('getRiskScores API failed, using local data:', e.message);
    return [...mockRiskScores];
  }
}

async function getRiskForMine(mineId) {
  if (USE_MOCKS) return mockDelay(mockRiskScores.find((r) => r.mineId === mineId) ?? null);
  try {
    return await apiClient.get(`/risk/mines/${mineId}`);
  } catch (e) {
    console.warn('getRiskForMine API failed, using local data:', e.message);
    return mockRiskScores.find((r) => r.mineId === mineId) ?? null;
  }
}

async function getRecurringIssues() {
  if (USE_MOCKS) return mockDelay(mockRecurringIssues);
  try {
    return await apiClient.get('/risk/recurring-issues');
  } catch (e) {
    console.warn('getRecurringIssues API failed, using local data:', e.message);
    return [...mockRecurringIssues];
  }
}

export const riskService = { getRiskScores, getRiskForMine, getRecurringIssues };
