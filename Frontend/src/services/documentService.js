import { apiClient, USE_MOCKS, mockDelay } from './api.js';
import { mockDocuments } from '../data/mockData.js';

let documents = [...mockDocuments];

async function getDocuments() {
  if (USE_MOCKS) return mockDelay([...documents].sort((a, b) => new Date(b.uploadedDate) - new Date(a.uploadedDate)));
  return apiClient.get('/documents'); // GET /documents
}

async function getDocumentById(id) {
  if (USE_MOCKS) return mockDelay(documents.find((d) => d.id === id) ?? null);
  return apiClient.get(`/documents/${id}`); // GET /documents/:id
}

// Uploading only ever creates the record with status "Processing" —
// the actual OCR/AI extraction always happens server-side. In mock
// mode, processDocument() below stands in for that backend step.
async function uploadDocument(fileOrPayload, metadata = {}) {
  if (USE_MOCKS) {
    const name = fileOrPayload instanceof File ? fileOrPayload.name : (fileOrPayload?.name || 'Document.pdf');
    const newDoc = {
      id: `DOC-${Date.now()}`,
      name,
      status: 'Processing',
      uploadedDate: new Date().toISOString(),
      extractedData: null,
      ...(typeof fileOrPayload === 'object' && !(fileOrPayload instanceof File) ? fileOrPayload : {}),
      ...metadata,
    };
    documents = [newDoc, ...documents];
    return mockDelay(newDoc, 400);
  }

  if (fileOrPayload instanceof File || fileOrPayload instanceof Blob) {
    const formData = new FormData();
    formData.append('file', fileOrPayload);
    if (metadata) {
      Object.entries(metadata).forEach(([k, v]) => {
        if (v !== undefined && v !== null) formData.append(k, String(v));
      });
    }
    return apiClient.postForm('/documents', formData);
  }

  if (typeof FormData !== 'undefined' && fileOrPayload instanceof FormData) {
    return apiClient.postForm('/documents', fileOrPayload);
  }

  return apiClient.post('/documents', fileOrPayload);
}

// Triggers real multimodal OCR & tabular extraction pipeline on the document
async function processDocument(id) {
  if (USE_MOCKS) {
    const extractedData = {
      documentType: 'Field Report',
      mine: documents.find((d) => d.id === id)?.mineName || 'Unknown',
      inspectionDate: new Date().toISOString(),
      inspector: 'Pending Review',
      observations: ['Document processed — no high-severity findings detected by the classification service.'],
      highSeverityFindings: 0,
      suggestedCorrectiveActions: [],
    };
    documents = documents.map((d) => (d.id === id ? { ...d, status: 'Processed', extractedData } : d));
    return mockDelay(documents.find((d) => d.id === id), 1200);
  }
  return apiClient.post(`/documents/${id}/process`, {});
}

export const documentService = { getDocuments, getDocumentById, uploadDocument, processDocument };
