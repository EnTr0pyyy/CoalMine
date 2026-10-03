import { apiClient, USE_MOCKS, mockDelay } from './api.js';
import { mockMines } from '../data/mockData.js';

async function getMines() {
  if (USE_MOCKS) return mockDelay(mockMines);
  try {
    const res = await apiClient.get('/mines');
    return Array.isArray(res) && res.length > 0 ? res : mockMines;
  } catch (err) {
    console.warn('API /mines error, falling back to accurate local CIL dataset:', err?.message);
    return mockMines;
  }
}

async function getMineById(id) {
  if (USE_MOCKS) return mockDelay(mockMines.find((m) => m.id === id) ?? null);
  try {
    const res = await apiClient.get(`/mines/${id}`);
    return res || (mockMines.find((m) => m.id === id) ?? null);
  } catch (err) {
    console.warn(`API /mines/${id} error, falling back to accurate local CIL dataset:`, err?.message);
    return mockMines.find((m) => m.id === id) ?? null;
  }
}

async function getHighRiskMines() {
  if (USE_MOCKS) return mockDelay(mockMines.filter((m) => ['HIGH', 'CRITICAL'].includes(m.riskLevel)));
  try {
    const res = await apiClient.get('/mines?riskLevel=HIGH,CRITICAL');
    return Array.isArray(res) && res.length > 0 ? res : mockMines.filter((m) => ['HIGH', 'CRITICAL'].includes(m.riskLevel));
  } catch (err) {
    return mockMines.filter((m) => ['HIGH', 'CRITICAL'].includes(m.riskLevel));
  }
}

export const mineService = { getMines, getMineById, getHighRiskMines };
