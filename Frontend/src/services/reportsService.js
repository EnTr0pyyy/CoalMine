import { apiClient } from './api.js';

const ML_BASE = import.meta.env.VITE_ML_API_URL || 'http://localhost:8001';

export const reportsService = {
  getTemplates: async () => {
    try {
      const res = await apiClient.get('/reports/templates');
      return res.templates || [];
    } catch (e) {
      console.warn('Error fetching report templates:', e);
      return [];
    }
  },

  generateAutomatedReport: async ({ templateType, subsidiary, period, metrics, selectedDocumentIds, copilotSessionId }) => {
    return apiClient.post('/reports/tasks', { templateType, subsidiary, period, metrics, selectedDocumentIds, copilotSessionId });
  },

  generateReport: async (payload) => {
    return apiClient.post('/reports', payload);
  },

  analyzeAndGenerateFromUpload: async (file, { templateType, subsidiary, period, saveToDatabase, selectedDocumentIds, copilotSessionId } = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    if (templateType) formData.append('templateType', templateType);
    if (subsidiary) formData.append('subsidiary', subsidiary);
    if (period) formData.append('period', period);
    if (saveToDatabase !== undefined) formData.append('saveToDatabase', String(saveToDatabase));
    if (selectedDocumentIds && selectedDocumentIds.length > 0) {
      formData.append('selectedDocumentIds', JSON.stringify(selectedDocumentIds));
    }
    if (copilotSessionId) formData.append('copilotSessionId', copilotSessionId);
    return apiClient.postForm('/reports/tasks/upload', formData);
  },

  getTask: async (taskId) => {
    const response = await apiClient.get(`/tasks/${encodeURIComponent(taskId)}`);
    return response.task || response;
  },

  // ── Ministry-Grade PDF Export (WeasyPrint via ML service) ──
  exportReportPdf: async (reportData) => {
    const res = await fetch(`${ML_BASE}/api/reports/export/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report_data: reportData }),
    });
    if (!res.ok) throw new Error('PDF export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Report_${reportData.subsidiary || 'CIL'}_${reportData.period || ''}.pdf`
      .replace(/[\s/\\:*?"<>|]/g, '_');
    a.click();
    URL.revokeObjectURL(url);
  },

  // ── Editable DOCX Export (python-docx via ML service) ──
  exportReportDocx: async (reportData) => {
    const res = await fetch(`${ML_BASE}/api/reports/export/docx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report_data: reportData }),
    });
    if (!res.ok) throw new Error('DOCX export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Report_${reportData.subsidiary || 'CIL'}_${reportData.period || ''}.docx`
      .replace(/[\s/\\:*?"<>|]/g, '_');
    a.click();
    URL.revokeObjectURL(url);
  },

  // ── Structured Excel (.xlsx) Export (openpyxl via ML service) ──
  exportReportXlsx: async (reportData) => {
    const res = await fetch(`${ML_BASE}/api/reports/export/xlsx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report_data: reportData }),
    });
    if (!res.ok) throw new Error('Excel export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ledger_${reportData.subsidiary || 'CIL'}_${reportData.period || ''}.xlsx`
      .replace(/[\s/\\:*?"<>|]/g, '_');
    a.click();
    URL.revokeObjectURL(url);
  },
};

