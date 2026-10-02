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

  generateAutomatedReport: async ({ templateType, subsidiary, period, metrics }) => {
    return apiClient.post('/reports/generate', { templateType, subsidiary, period, metrics });
  },

  generateReport: async (payload) => {
    return apiClient.post('/reports', payload);
  },

  analyzeAndGenerateFromUpload: async (file, { templateType, subsidiary, period } = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    if (templateType) formData.append('templateType', templateType);
    if (subsidiary) formData.append('subsidiary', subsidiary);
    if (period) formData.append('period', period);
    return apiClient.postForm('/reports/analyze-upload', formData);
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
};

