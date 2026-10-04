import { API_BASE_URL } from './api.js';

// Local cache keyed by userId so users/roles never share client sessions in memory
let localConversationsByUser = {};

function getCurrentAuth() {
  const token = localStorage.getItem('minegov_auth_token');
  let userId = 'anonymous';
  try {
    const rawUser = localStorage.getItem('minegov_auth_user');
    if (rawUser) {
      const u = JSON.parse(rawUser);
      if (u && u.id) userId = String(u.id);
    }
  } catch (_) {}
  return { token, userId };
}

function getAuthHeaders(extraHeaders = {}) {
  const { token, userId } = getCurrentAuth();
  return {
    'Content-Type': 'application/json',
    'X-User-Id': userId,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  };
}

function getUserLocalConversations(userId) {
  if (!localConversationsByUser[userId]) {
    localConversationsByUser[userId] = [];
  }
  return localConversationsByUser[userId];
}

function setUserLocalConversations(userId, convs) {
  localConversationsByUser[userId] = convs;
}

/**
 * Streams chat tokens from the backend using fetch and ReadableStream
 */
export async function streamChatMessage({
  sessionId,
  message,
  isPersistent = false,
  onToken,
  onComplete,
  onError,
  onTask,
}) {
  try {
    const { userId } = getCurrentAuth();
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        sessionId,
        message,
        isPersistent,
        userId,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Chat request failed (${response.status}): ${errText}`);
    }

    if (!response.body) {
      throw new Error('ReadableStream not supported by response');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let accumulatedText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const data = JSON.parse(jsonStr);
            if (data.token) {
              accumulatedText += data.token;
              if (onToken) onToken(data.token, accumulatedText);
            }
            if (data.error) {
              if (onError) onError(new Error(data.error));
            }
            if (data.task && onTask) onTask(data.task);
          } catch (parseErr) {
            // Non-json SSE data line
          }
        }
      }
    }

    if (onComplete) onComplete(accumulatedText);
    return accumulatedText;
  } catch (err) {
    if (onError) onError(err);
    throw err;
  }
}

/**
 * Get chat sessions for the current authenticated user
 */
export async function getConversations() {
  const { userId } = getCurrentAuth();
  try {
    const res = await fetch(`${API_BASE_URL}/sessions`, {
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.sessions) {
        const loaded = data.sessions.map((s) => ({
          id: s.id,
          title: s.title || 'Conversation',
          isPersistent: s.isPersistent,
          createdAt: s.createdAt,
          activeDocumentId: s.activeDocumentId || null,
          messages: s.messages || [],
        }));
        setUserLocalConversations(userId, loaded);
        return loaded;
      }
    }
  } catch (e) {
    console.warn('Backend sessions fetch failed, fallback to local:', e.message);
  }
  return getUserLocalConversations(userId);
}

/**
 * Get messages for a session
 */
export async function getConversation(id) {
  const { userId } = getCurrentAuth();
  try {
    const res = await fetch(`${API_BASE_URL}/sessions/${id}/messages`, {
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      return {
        id,
        messages: data.messages || [],
      };
    }
  } catch (e) {
    console.warn('Session messages fetch failed:', e.message);
  }
  return getUserLocalConversations(userId).find((c) => c.id === id) || null;
}

/**
 * Create a new conversation session for current user
 */
export async function createConversation(isPersistent = true, title = 'New Chat') {
  const { userId } = getCurrentAuth();
  const newConv = {
    id: `session-${Date.now()}`,
    title,
    isPersistent,
    createdAt: new Date().toISOString(),
    messages: [],
  };

  try {
    const res = await fetch(`${API_BASE_URL}/sessions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ isPersistent, title, userId }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.session) {
        const sessionObj = {
          ...data.session,
          messages: [],
        };
        const currentList = getUserLocalConversations(userId);
        setUserLocalConversations(userId, [sessionObj, ...currentList.filter((c) => c.id !== sessionObj.id)]);
        return sessionObj;
      }
    }
  } catch (e) {
    console.warn('Create session API failed, using client session:', e.message);
  }

  const currentList = getUserLocalConversations(userId);
  setUserLocalConversations(userId, [newConv, ...currentList]);
  return newConv;
}

/**
 * Delete a session
 */
export async function deleteConversation(id) {
  const { userId } = getCurrentAuth();
  try {
    await fetch(`${API_BASE_URL}/sessions/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  } catch (e) {
    console.warn('Delete session API failed:', e.message);
  }
  const currentList = getUserLocalConversations(userId);
  setUserLocalConversations(userId, currentList.filter((c) => c.id !== id));
  return true;
}

/**
 * Rename a session
 */
export async function renameConversation(id, title) {
  const { userId } = getCurrentAuth();
  const currentList = getUserLocalConversations(userId);
  setUserLocalConversations(
    userId,
    currentList.map((c) => (c.id === id ? { ...c, title } : c))
  );
  return true;
}

/**
 * Clears all local conversation state in memory
 */
export function clearLocalState() {
  localConversationsByUser = {};
}

/**
 * Clears user temporary chat sessions both locally and on backend server
 */
export async function wipeUserTemporaryChats() {
  const { userId } = getCurrentAuth();
  if (localConversationsByUser[userId]) {
    localConversationsByUser[userId] = [];
  }
  try {
    await fetch(`${API_BASE_URL}/sessions/clear`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  } catch (_) {}
}

/**
 * Upload document for RAG indexing
 */
export async function uploadDocument(file, sessionId = null) {
  const { token, userId } = getCurrentAuth();
  const formData = new FormData();
  formData.append('file', file);
  if (sessionId) formData.append('sessionId', sessionId);

  const res = await fetch(`${API_BASE_URL}/chat/documents`, {
    method: 'POST',
    headers: {
      'X-User-Id': userId,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Upload failed: ${err}`);
  }

  return await res.json();
}

/**
 * Get ingested documents list
 */
export async function getDocuments() {
  try {
    const res = await fetch(`${API_BASE_URL}/chat/documents`, {
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      return data.documents || [];
    }
  } catch (e) {
    console.warn('Get documents failed:', e.message);
  }
  return [];
}

/**
 * Get all content chunks for a specific document
 */
export async function getDocumentChunks(documentId) {
  try {
    const res = await fetch(`${API_BASE_URL}/chat/documents/${documentId}/chunks`, {
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('Failed to fetch document chunks:', e.message);
  }
  return null;
}

/**
 * Delete a document from RAG knowledge store
 */
export async function deleteDocument(documentId) {
  try {
    const res = await fetch(`${API_BASE_URL}/chat/documents/${documentId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return res.ok;
  } catch (e) {
    console.warn('Failed to delete document:', e.message);
    return false;
  }
}

export async function getWorkspace(sessionId) {
  const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}/workspace`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Unable to load this workspace.');
  const data = await res.json();
  return data.workspace;
}

export async function attachDocumentToWorkspace(sessionId, documentId, role = 'SOURCE') {
  const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}/documents`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ documentId, role }),
  });
  if (!res.ok) throw new Error('Unable to attach document to this workspace.');
  return res.json();
}

export async function detachDocumentFromWorkspace(sessionId, documentId) {
  const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}/documents/${documentId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return res.ok;
}

export async function getWorkspaceTasks(sessionId = null) {
  const suffix = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : '';
  const res = await fetch(`${API_BASE_URL}/tasks${suffix}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Unable to load background tasks.');
  const data = await res.json();
  return data.tasks || [];
}

export async function cancelWorkspaceTask(taskId) {
  const res = await fetch(`${API_BASE_URL}/tasks/${taskId}/cancel`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Unable to cancel task.');
  return res.json();
}

export async function getDocumentVersions(documentId) {
  const res = await fetch(`${API_BASE_URL}/documents/${documentId}/versions`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Unable to load document versions.');
  const data = await res.json();
  return data.versions || [];
}

export async function compareDocumentVersions(documentId, fromVersion, toVersion) {
  const res = await fetch(`${API_BASE_URL}/documents/${documentId}/versions/${fromVersion}/compare/${toVersion}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Unable to compare document versions.');
  return res.json();
}

export const chatService = {
  streamChatMessage,
  getConversations,
  getConversation,
  createConversation,
  deleteConversation,
  renameConversation,
  clearLocalState,
  wipeUserTemporaryChats,
  uploadDocument,
  getDocuments,
  getDocumentChunks,
  deleteDocument,
  getWorkspace,
  attachDocumentToWorkspace,
  detachDocumentFromWorkspace,
  getWorkspaceTasks,
  cancelWorkspaceTask,
  getDocumentVersions,
  compareDocumentVersions,
};
