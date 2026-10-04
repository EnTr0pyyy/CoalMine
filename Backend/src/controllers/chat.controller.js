const { memoryStore } = require('../services/memoryStore');
const prisma = require('../config/db');
const { verifyAccessToken } = require('../utils/jwt');
const { createWorkspaceTask, triggerDocumentAutomations } = require('../services/workspaceTaskService');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8001';

/**
 * Resolves the authenticated or client user identity from:
 * 1. req.user (from auth middleware)
 * 2. Authorization Bearer header (JWT token or mock-token-<userId>)
 * 3. X-User-Id header
 * 4. Request body userId
 * 5. Fallback: 'anonymous'
 */
function resolveUser(req) {
  if (req.user && req.user.userId) {
    return { userId: String(req.user.userId), role: req.user.role || 'USER' };
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token) {
      if (token.startsWith('mock-token-')) {
        const uid = token.replace('mock-token-', '').trim();
        return { userId: uid, role: 'MOCK_USER' };
      }
      try {
        const decoded = verifyAccessToken(token);
        if (decoded && decoded.userId) {
          return { userId: String(decoded.userId), role: decoded.role || 'USER' };
        }
      } catch (_) {}
    }
  }

  if (req.headers['x-user-id']) {
    return {
      userId: String(req.headers['x-user-id']).trim(),
      role: req.headers['x-user-role'] || 'USER',
    };
  }

  if (req.body && req.body.userId) {
    return { userId: String(req.body.userId).trim(), role: 'USER' };
  }

  if (req.query && req.query.userId) {
    return { userId: String(req.query.userId).trim(), role: 'USER' };
  }

  return { userId: 'anonymous', role: 'ANONYMOUS' };
}

function inferWorkspaceAction(message, hasAttachedDocuments, activeDocumentId) {
  if (!hasAttachedDocuments) return null;
  const text = String(message || '').toLowerCase();
  if (/\b(generate|create|make|prepare|build)\b[\s\S]{0,80}\b(report|document|brief|summary)\b/.test(text)) {
    return 'GENERATE_REPORT';
  }
  if (activeDocumentId && /\b(add|change|modify|edit|rewrite|replace|delete|shorten|expand|convert|update)\b/.test(text)) {
    return 'EDIT_DOCUMENT';
  }
  if (/\bcompare\b/.test(text)) {
    return 'COMPARE_DOCUMENTS';
  }
  if (/\b(analy[sz]e|read|review|summari[sz]e)\b/.test(text)) {
    return 'ANALYZE_DOCUMENT';
  }
  return null;
}

async function getAttachedWorkspaceDocuments(sessionId, userId) {
  if (!sessionId || !userId) return { session: null, documents: [] };
  try {
    const session = await prisma.chatSession.findFirst({ where: { id: sessionId, userId } });
    if (!session) return { session: null, documents: [] };
    const links = await prisma.chatDocument.findMany({
      where: { sessionId },
      include: { document: true },
      orderBy: { attachedAt: 'asc' },
    });
    return { session, documents: links.map((link) => link.document) };
  } catch (error) {
    console.warn('Workspace attachment lookup skipped:', error.message);
    return { session: null, documents: [] };
  }
}

async function saveAssistantMessage(sessionId, userId, content, sources) {
  try {
    await prisma.message.create({
      data: { sessionId, role: 'assistant', content, sources: sources || undefined },
    });
    await prisma.chatSession.update({ where: { id: sessionId }, data: { updatedAt: new Date() } });
  } catch (error) {
    console.warn('Could not save workspace assistant message:', error.message);
  }
}

/**
 * Proxies streaming chat to ML service (Ollama gemma3:1b),
 * optionally retrieving context from RAG, and managing
 * persistent vs temporary memory strictly isolated per user.
 */
exports.handleChatStream = async (req, res) => {
  const { sessionId: rawSessionId, message, isPersistent = false, history = [] } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ success: false, message: 'Message text is required' });
  }

  const user = resolveUser(req);
  const userId = user.userId;
  const sessionId = rawSessionId || `session-${Date.now()}`;

  // Load the document links before retrieval. Indexed documents are only useful
  // to this conversation when they are explicitly attached to its workspace.
  const workspace = isPersistent
    ? await getAttachedWorkspaceDocuments(sessionId, userId)
    : { session: null, documents: [] };

  // 1. Prepare conversation history & persistence (isolated to userId)
  let contextHistory = [];
  if (Array.isArray(history) && history.length > 0) {
    contextHistory = history;
  } else if (!isPersistent) {
    const memSession = memoryStore.getSession(sessionId, userId);
    if (memSession) {
      contextHistory = memSession.messages.map((m) => ({ role: m.role, content: m.content }));
    }
  } else {
    try {
      const dbMessages = await prisma.message.findMany({
        where: {
          sessionId,
          session: { userId },
        },
        orderBy: { createdAt: 'asc' },
        take: 10,
      });
      if (dbMessages && dbMessages.length > 0) {
        contextHistory = dbMessages.map((m) => ({ role: m.role, content: m.content }));
      }
    } catch (dbErr) {
      const memSession = memoryStore.getSession(sessionId, userId);
      if (memSession) {
        contextHistory = memSession.messages.map((m) => ({ role: m.role, content: m.content }));
      }
    }
  }

  // 2. Query RAG context from ML service
  let ragContext = '';
  if (workspace.documents.length > 0) {
    try {
    const ragRes = await fetch(`${ML_SERVICE_URL}/rag/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: message,
        top_k: 3,
        document_ids: workspace.documents
          .map((document) => document.extractedData?.ragDocumentId || document.id)
          .filter(Boolean),
      }),
    });
    if (ragRes.ok) {
      const ragData = await ragRes.json();
      const chunks = ragData.chunks || [];
      if (chunks.length > 0) {
        const joinedChunks = chunks
          .filter((c) => (c.score || 0) > 0.3)
          .map((c, idx) => `[Source ${idx + 1}: ${c.filename}]\n${c.content}`)
          .join('\n\n');
        if (joinedChunks.trim()) {
          ragContext = `RELEVANT CONTEXT DOCUMENTS:\n${joinedChunks}\n\nUse the above context to answer the user's query when relevant.`;
        }
      }
    }
    } catch (ragErr) {
      console.warn('RAG query skipped or failed:', ragErr.message);
    }
  }

  // Record user message
  if (!isPersistent) {
    memoryStore.addMessage(sessionId, 'user', message, userId);
  } else {
    try {
      await prisma.chatSession.upsert({
        where: { id: sessionId },
        update: { updatedAt: new Date(), userId },
        create: {
          id: sessionId,
          userId,
          isPersistent: true,
          title: message.slice(0, 40) || 'New Chat',
        },
      });
      await prisma.message.create({
        data: {
          sessionId,
          role: 'user',
          content: message,
        },
      });
    } catch (dbErr) {
      console.warn('DB write failed for user message, using memory fallback:', dbErr.message);
      memoryStore.addMessage(sessionId, 'user', message, userId);
    }
  }

  // 3. Set SSE response headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  let fullAssistantResponse = '';

  // Tool requests become durable server-side jobs. The browser gets an immediate
  // acknowledgement and can safely navigate away while the worker continues.
  const action = isPersistent
    ? inferWorkspaceAction(message, workspace.documents.length > 0, workspace.session?.activeDocumentId)
    : null;
  if (action) {
    try {
      const task = await createWorkspaceTask({
        userId,
        sessionId,
        documentId: workspace.session?.activeDocumentId || null,
        type: action,
        payload: { instruction: message, title: workspace.session?.title },
      });
      const acknowledgment = action === 'EDIT_DOCUMENT'
        ? 'I have started a background document revision. I will save a new version and keep the source document unchanged.'
        : action === 'GENERATE_REPORT'
          ? 'I have started a background report-generation task using the documents attached to this conversation.'
          : 'I have started a background document-analysis task for the documents attached to this conversation.';
      await saveAssistantMessage(sessionId, userId, acknowledgment, { taskId: task.id });
      res.write(`data: ${JSON.stringify({ token: acknowledgment, done: true, task })}\n\n`);
      return res.end();
    } catch (taskError) {
      // Continue to normal chat if the workspace task could not be scheduled.
      console.warn('Workspace task could not be scheduled:', taskError.message);
    }
  }

  try {
    const mlResponse = await fetch(`${ML_SERVICE_URL}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        message,
        history: contextHistory,
        systemPrompt: ragContext || undefined,
      }),
    });

    if (!mlResponse.ok || !mlResponse.body) {
      const errText = await mlResponse.text();
      res.write(`data: ${JSON.stringify({ error: `ML service error: ${errText}` })}\n\n`);
      return res.end();
    }

    const reader = mlResponse.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunkText = decoder.decode(value, { stream: true });
      res.write(chunkText);

      const lines = chunkText.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.token) {
              fullAssistantResponse += parsed.token;
            }
          } catch (_) {}
        }
      }
    }

    // 4. Record assistant message when stream concludes
    if (fullAssistantResponse) {
      if (!isPersistent) {
        memoryStore.addMessage(sessionId, 'assistant', fullAssistantResponse, userId);
      } else {
        try {
          await prisma.message.create({
            data: {
              sessionId,
              role: 'assistant',
              content: fullAssistantResponse,
            },
          });
        } catch (dbErr) {
          console.warn('DB write failed for assistant message, using memory fallback:', dbErr.message);
          memoryStore.addMessage(sessionId, 'assistant', fullAssistantResponse, userId);
        }
      }
    }

    res.end();
  } catch (err) {
    console.error('Streaming error in chat controller:', err);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
};

/**
 * Get sessions belonging exclusively to the authenticated user
 */
exports.getSessions = async (req, res) => {
  try {
    const user = resolveUser(req);
    const userId = user.userId;

    let dbSessions = [];
    try {
      dbSessions = await prisma.chatSession.findMany({
        where: {
          isPersistent: true,
          userId,
        },
        orderBy: { updatedAt: 'desc' },
        include: {
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    } catch (dbErr) {
      console.warn('DB session fetch fallback to memory:', dbErr.message);
    }

    const memSessions = memoryStore.getSessionsForUser(userId);
    res.status(200).json({
      success: true,
      userId,
      sessions: [...dbSessions, ...memSessions],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Create a new session attached to the requesting user
 */
exports.createSession = async (req, res) => {
  const user = resolveUser(req);
  const userId = user.userId;
  const { isPersistent = false, title = 'New Conversation' } = req.body;
  const sessionId = `session-${Date.now()}`;

  try {
    if (isPersistent) {
      try {
        const session = await prisma.chatSession.create({
          data: {
            id: sessionId,
            userId,
            isPersistent: true,
            title,
          },
        });
        return res.status(201).json({ success: true, session });
      } catch (dbErr) {
        console.warn('Could not persist session to DB, using memory:', dbErr.message);
      }
    }

    const session = memoryStore.createSession(sessionId, title, userId);
    res.status(201).json({ success: true, session });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get messages for a session only if owned by the requesting user
 */
exports.getSessionMessages = async (req, res) => {
  const user = resolveUser(req);
  const userId = user.userId;
  const { id } = req.params;

  try {
    const memSession = memoryStore.getSession(id, userId);
    if (memSession) {
      return res.status(200).json({ success: true, messages: memSession.messages });
    }

    try {
      const dbSession = await prisma.chatSession.findFirst({
        where: { id, userId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
      if (dbSession) {
        return res.status(200).json({ success: true, messages: dbSession.messages });
      }
    } catch (dbErr) {
      console.warn('DB fetch error for session messages:', dbErr.message);
    }

    res.status(404).json({ success: false, message: 'Session not found or unauthorized' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete a session belonging to the requesting user
 */
exports.deleteSession = async (req, res) => {
  const user = resolveUser(req);
  const userId = user.userId;
  const { id } = req.params;

  try {
    memoryStore.deleteSession(id, userId);
    try {
      await prisma.chatSession.deleteMany({ where: { id, userId } }).catch(() => {});
    } catch (_) {}
    res.status(200).json({ success: true, message: 'Session deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Clear all temporary in-memory sessions for this user (called on logout)
 */
exports.clearUserSessions = async (req, res) => {
  const user = resolveUser(req);
  const userId = user.userId;
  try {
    memoryStore.clearUserSessions(userId);
    res.status(200).json({ success: true, message: `Cleared temporary sessions for user ${userId}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Upload and index a document into RAG vector knowledge base
 */
exports.uploadRagDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const fs = require('fs');
    const fileBytes = fs.readFileSync(req.file.path);
    const form = new FormData();
    form.append('file', new Blob([fileBytes]), req.file.originalname);

    const mlRes = await fetch(`${ML_SERVICE_URL}/rag/ingest`, {
      method: 'POST',
      body: form,
    });

    if (!mlRes.ok) {
      const errText = await mlRes.text();
      return res.status(mlRes.status).json({ success: false, message: errText });
    }

    const data = await mlRes.json();
    const user = resolveUser(req);
    const userId = user.userId;
    const sessionId = req.body?.sessionId;

    // Mirror the ML RAG identifier into the platform document registry. This is
    // what makes an indexed file attachable to a chat and retrievable by scope.
    let workspaceDocument = null;
    try {
      workspaceDocument = await prisma.document.upsert({
        where: { id: data.document_id },
        update: {
          name: data.filename,
          status: 'Indexed',
          extractedData: { ragDocumentId: data.document_id, chunksCount: data.chunks_count },
        },
        create: {
          id: data.document_id,
          userId,
          name: data.filename,
          fileType: (data.filename || '').split('.').pop()?.toUpperCase() || 'DOCUMENT',
          mineName: 'Workspace document',
          status: 'Indexed',
          isImmutable: true,
          extractedData: { ragDocumentId: data.document_id, chunksCount: data.chunks_count },
        },
      });

      if (sessionId) {
        const session = await prisma.chatSession.findFirst({ where: { id: sessionId, userId } });
        if (session) {
          await prisma.chatDocument.upsert({
            where: { sessionId_documentId: { sessionId, documentId: workspaceDocument.id } },
            update: { role: 'SOURCE' },
            create: { sessionId, documentId: workspaceDocument.id, role: 'SOURCE' },
          });
          await prisma.chatSession.update({ where: { id: sessionId }, data: { activeDocumentId: workspaceDocument.id } });
        }
      }
    } catch (workspaceError) {
      console.warn('RAG document was indexed but could not be linked to workspace:', workspaceError.message);
    }
    try {
      const automationTasks = await triggerDocumentAutomations({ userId, documentId: workspaceDocument?.id, sessionId });
      if (automationTasks.length > 0) data.automationTasks = automationTasks;
    } catch (automationError) {
      console.warn('Document automations could not be scheduled:', automationError.message);
    }
    return res.status(200).json({ ...data, workspaceDocument, attachedToSession: Boolean(sessionId && workspaceDocument) });
  } catch (error) {
    console.error('uploadRagDocument error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Retrieve list of ingested RAG documents
 */
exports.getRagDocuments = async (_req, res) => {
  try {
    const mlRes = await fetch(`${ML_SERVICE_URL}/rag/documents`);
    if (!mlRes.ok) {
      return res.status(200).json({ documents: [] });
    }
    const data = await mlRes.json();
    return res.status(200).json(data);
  } catch (error) {
    console.warn('getRagDocuments fetch failed:', error.message);
    return res.status(200).json({ documents: [] });
  }
};

/**
 * Get chunks for a specific RAG document
 */
exports.getRagDocumentChunks = async (req, res) => {
  try {
    const { id } = req.params;
    const mlRes = await fetch(`${ML_SERVICE_URL}/rag/documents/${id}/chunks`);
    if (!mlRes.ok) {
      return res.status(mlRes.status).json({ success: false, message: 'Document chunks not found' });
    }
    const data = await mlRes.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete a RAG document from knowledge base
 */
exports.deleteRagDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const mlRes = await fetch(`${ML_SERVICE_URL}/rag/documents/${id}`, {
      method: 'DELETE',
    });
    if (!mlRes.ok) {
      const err = await mlRes.text();
      return res.status(mlRes.status).json({ success: false, message: err });
    }
    const data = await mlRes.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
