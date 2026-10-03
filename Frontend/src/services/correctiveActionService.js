import { apiClient, USE_MOCKS, mockDelay } from './api.js';
import { mockCorrectiveActions } from '../data/mockData.js';

let actions = [...mockCorrectiveActions];

async function getCorrectiveActions() {
  if (USE_MOCKS) return mockDelay(actions);
  try {
    return await apiClient.get('/corrective-actions');
  } catch (e) {
    console.warn('getCorrectiveActions API failed, using local data:', e.message);
    return [...actions];
  }
}

async function getOverdueActions() {
  if (USE_MOCKS) return mockDelay(actions.filter((a) => a.isOverdue));
  try {
    return await apiClient.get('/corrective-actions?overdue=true');
  } catch (e) {
    console.warn('getOverdueActions API failed, using local data:', e.message);
    return actions.filter((a) => a.isOverdue);
  }
}

async function getCorrectiveActionsForFlag(flagId) {
  if (USE_MOCKS) return mockDelay(actions.filter((a) => a.flagId === flagId));
  try {
    return await apiClient.get(`/corrective-actions?flagId=${flagId}`);
  } catch (e) {
    console.warn('getCorrectiveActionsForFlag API failed, using local data:', e.message);
    return actions.filter((a) => a.flagId === flagId);
  }
}

async function getCorrectiveActionsForMine(mineId) {
  if (USE_MOCKS) return mockDelay(actions.filter((a) => a.mineId === mineId));
  try {
    return await apiClient.get(`/corrective-actions?mineId=${mineId}`);
  } catch (e) {
    console.warn('getCorrectiveActionsForMine API failed, using local data:', e.message);
    return actions.filter((a) => a.mineId === mineId);
  }
}

async function getCorrectiveActionById(id) {
  if (USE_MOCKS) return mockDelay(actions.find((a) => a.id === id) ?? null);
  try {
    return await apiClient.get(`/corrective-actions/${id}`);
  } catch (e) {
    console.warn('getCorrectiveActionById API failed, using local data:', e.message);
    return actions.find((a) => a.id === id) ?? null;
  }
}

async function createCorrectiveAction(payload) {
  if (USE_MOCKS) {
    const newAction = {
      id: `CA-${1042 + actions.length + 1}`,
      status: 'Open',
      isOverdue: false,
      evidence: [],
      comments: [],
      ...payload,
    };
    actions = [newAction, ...actions];
    return mockDelay(newAction, 500);
  }
  return apiClient.post('/corrective-actions', payload); // POST /corrective-actions
}

async function updateCorrectiveAction(id, patch) {
  if (USE_MOCKS) {
    actions = actions.map((a) => (a.id === id ? { ...a, ...patch } : a));
    return mockDelay(actions.find((a) => a.id === id), 400);
  }
  return apiClient.patch(`/corrective-actions/${id}`, patch); // PATCH /corrective-actions/:id
}

async function addComment(id, comment) {
  if (USE_MOCKS) {
    const newComment = { id: `c${Date.now()}`, timestamp: new Date().toISOString(), ...comment };
    actions = actions.map((a) => (a.id === id ? { ...a, comments: [...(a.comments || []), newComment] } : a));
    return mockDelay(newComment, 350);
  }
  return apiClient.post(`/corrective-actions/${id}/comments`, comment);
}

export const correctiveActionService = {
  getCorrectiveActions,
  getOverdueActions,
  getCorrectiveActionsForFlag,
  getCorrectiveActionsForMine,
  getCorrectiveActionById,
  createCorrectiveAction,
  updateCorrectiveAction,
  addComment,
};
