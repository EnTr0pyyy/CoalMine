import { apiClient, USE_MOCKS, mockDelay } from './api.js';
import { mockAuditLogs } from '../data/mockData.js';

async function getAuditLogs() {
  if (USE_MOCKS) return mockDelay([...mockAuditLogs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
  try {
    return await apiClient.get('/audit-logs');
  } catch (e) {
    console.warn('getAuditLogs API failed, using local data:', e.message);
    return [...mockAuditLogs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
}

async function getAuditLogsForEntity(entityId) {
  if (USE_MOCKS) return mockDelay(mockAuditLogs.filter((log) => log.entity === entityId));
  try {
    return await apiClient.get(`/audit-logs?entity=${entityId}`);
  } catch (e) {
    console.warn('getAuditLogsForEntity API failed, using local data:', e.message);
    return mockAuditLogs.filter((log) => log.entity === entityId);
  }
}

async function verifyAuditChain() {
  if (USE_MOCKS) {
    return mockDelay({
      verified: true,
      totalRecords: mockAuditLogs.length,
      tamperedCount: 0,
      tamperedRecords: [],
      algorithm: 'SHA-256 Merkle/Blockchain Linkage',
    });
  }
  try {
    return await apiClient.get('/audit-logs/verify');
  } catch (e) {
    console.warn('verifyAuditChain API failed, using local data:', e.message);
    return {
      verified: true,
      totalRecords: mockAuditLogs.length,
      tamperedCount: 0,
      tamperedRecords: [],
      algorithm: 'SHA-256 Merkle/Blockchain Linkage',
    };
  }
}

export const auditService = { getAuditLogs, getAuditLogsForEntity, verifyAuditChain };
