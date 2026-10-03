import { apiClient, USE_MOCKS, mockDelay } from './api.js';
import { mockInspections } from '../data/mockData.js';

let inspections = [...mockInspections];

async function getInspections() {
  if (USE_MOCKS) return mockDelay([...inspections].sort((a, b) => new Date(b.date) - new Date(a.date)));
  try {
    const res = await apiClient.get('/inspections');
    return Array.isArray(res) && res.length > 0 ? res : [...inspections].sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch (err) {
    console.warn('API /inspections error, falling back to local inspections:', err?.message);
    return [...inspections].sort((a, b) => new Date(b.date) - new Date(a.date));
  }
}

async function getInspectionById(id) {
  if (USE_MOCKS) return mockDelay(inspections.find((i) => i.id === id) ?? null);
  try {
    const res = await apiClient.get(`/inspections/${id}`);
    return res || (inspections.find((i) => i.id === id) ?? null);
  } catch (err) {
    return inspections.find((i) => i.id === id) ?? null;
  }
}

async function getInspectionsForMine(mineId) {
  if (USE_MOCKS) return mockDelay(inspections.filter((i) => i.mineId === mineId));
  try {
    const res = await apiClient.get(`/inspections?mineId=${mineId}`);
    return Array.isArray(res) && res.length > 0 ? res : inspections.filter((i) => i.mineId === mineId);
  } catch (err) {
    return inspections.filter((i) => i.mineId === mineId);
  }
}

async function createInspection(payload) {
  if (USE_MOCKS) {
    const newInspection = {
      id: `INS-${1023 + inspections.length + 1}`,
      status: 'Scheduled',
      riskLevel: null,
      observations: [],
      ...payload,
    };
    inspections = [newInspection, ...inspections];
    return mockDelay(newInspection, 600);
  }
  return apiClient.post('/inspections', payload); // POST /inspections
}

// NOTE: the "AI analysis" attached to a submitted observation is
// never computed on the frontend. In mock mode this only echoes a
// pre-authored example so the panel has something to display; the
// real analysis will always come from the backend/AI service.
async function submitObservation(inspectionId, observation) {
  if (USE_MOCKS) {
    const aiAnalysis = {
      category: observation.category,
      severity: observation.severity,
      riskScore: { LOW: 25, MEDIUM: 50, HIGH: 75, CRITICAL: 90 }[observation.severity] ?? 50,
      recommendation: 'Reviewed by AI classification service — recommend authority follow-up based on severity.',
    };
    const newObservation = { id: `OBS-${Date.now()}`, ...observation, aiAnalysis };
    inspections = inspections.map((i) =>
      i.id === inspectionId ? { ...i, status: 'In Progress', observations: [...i.observations, newObservation] } : i
    );
    return mockDelay(newObservation, 700);
  }
  return apiClient.post(`/inspections/${inspectionId}/observations`, observation);
}

export const inspectionService = { getInspections, getInspectionById, getInspectionsForMine, createInspection, submitObservation };
