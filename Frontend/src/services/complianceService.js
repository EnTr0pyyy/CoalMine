import { apiClient, USE_MOCKS, mockDelay } from './api.js';
import { mockComplianceRequirements } from '../data/mockData.js';

async function getComplianceRequirements() {
  if (USE_MOCKS) return mockDelay(mockComplianceRequirements);
  try {
    const res = await apiClient.get('/compliance');
    return Array.isArray(res) && res.length > 0 ? res : mockComplianceRequirements;
  } catch (err) {
    console.warn('API /compliance error, falling back to local compliance:', err?.message);
    return mockComplianceRequirements;
  }
}

async function getComplianceRequirementById(id) {
  if (USE_MOCKS) return mockDelay(mockComplianceRequirements.find((c) => c.id === id) ?? null);
  try {
    const res = await apiClient.get(`/compliance/${id}`);
    return res || (mockComplianceRequirements.find((c) => c.id === id) ?? null);
  } catch (err) {
    console.warn(`API /compliance/${id} error, falling back to local compliance:`, err?.message);
    return mockComplianceRequirements.find((c) => c.id === id) ?? null;
  }
}

async function getComplianceForMine(mineId) {
  if (USE_MOCKS) return mockDelay(mockComplianceRequirements.filter((c) => c.mineId === mineId));
  try {
    const res = await apiClient.get(`/compliance?mineId=${mineId}`);
    return Array.isArray(res) && res.length > 0 ? res : mockComplianceRequirements.filter((c) => c.mineId === mineId);
  } catch (err) {
    console.warn(`API /compliance?mineId=${mineId} error, falling back:`, err?.message);
    return mockComplianceRequirements.filter((c) => c.mineId === mineId);
  }
}

export const complianceService = { getComplianceRequirements, getComplianceRequirementById, getComplianceForMine };
