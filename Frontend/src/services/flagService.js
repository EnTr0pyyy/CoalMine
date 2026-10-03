import { apiClient, USE_MOCKS, mockDelay } from './api.js';
import { mockFlags, mockFlagsByCategory } from '../data/mockData.js';

// In-memory copy so the mock "create flag" flow can append new
// records for the session without mutating the imported module.
let flags = [...mockFlags];

async function getFlags() {
  if (USE_MOCKS) return mockDelay([...flags].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  try {
    const res = await apiClient.get('/flags');
    return Array.isArray(res) && res.length > 0 ? res : [...flags].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (err) {
    console.warn('API /flags error, falling back to local flags:', err?.message);
    return [...flags].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
}

async function getRecentFlags(limit = 5) {
  if (USE_MOCKS) {
    const sorted = [...flags].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return mockDelay(sorted.slice(0, limit));
  }
  try {
    const res = await apiClient.get(`/flags?sort=-createdAt&limit=${limit}`);
    return Array.isArray(res) && res.length > 0 ? res : [...flags].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit);
  } catch (err) {
    return [...flags].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit);
  }
}

async function getFlagsByCategory() {
  if (USE_MOCKS) return mockDelay(mockFlagsByCategory);
  try {
    const res = await apiClient.get('/flags/stats/by-category');
    return res || mockFlagsByCategory;
  } catch (err) {
    return mockFlagsByCategory;
  }
}

async function getFlagById(id) {
  if (USE_MOCKS) return mockDelay(flags.find((f) => f.id === id) ?? null);
  try {
    const res = await apiClient.get(`/flags/${id}`);
    return res || (flags.find((f) => f.id === id) ?? null);
  } catch (err) {
    return flags.find((f) => f.id === id) ?? null;
  }
}

async function getFlagsForMine(mineId) {
  if (USE_MOCKS) return mockDelay(flags.filter((f) => f.mineId === mineId));
  try {
    const res = await apiClient.get(`/flags?mineId=${mineId}`);
    return Array.isArray(res) && res.length > 0 ? res : flags.filter((f) => f.mineId === mineId);
  } catch (err) {
    return flags.filter((f) => f.mineId === mineId);
  }
}

async function createFlag(payload) {
  if (USE_MOCKS) {
    const newFlag = {
      id: `F-${1021 + flags.length + 1}`,
      status: 'New',
      assignedAuthority: 'Unassigned',
      createdAt: new Date().toISOString(),
      reporterName: payload.isConfidential
        ? `Confidential Reporter #${Math.floor(Math.random() * 9000 + 1000)}`
        : payload.reporterName,
      ...payload,
    };
    flags = [newFlag, ...flags];
    return mockDelay(newFlag, 600);
  }
  return apiClient.post('/flags', payload); // POST /flags
}

async function updateFlag(id, patch) {
  if (USE_MOCKS) {
    flags = flags.map((f) => (f.id === id ? { ...f, ...patch } : f));
    return mockDelay(flags.find((f) => f.id === id), 400);
  }
  return apiClient.patch(`/flags/${id}`, patch); // PATCH /flags/:id
}

export const flagService = { getFlags, getRecentFlags, getFlagsByCategory, getFlagById, getFlagsForMine, createFlag, updateFlag };
