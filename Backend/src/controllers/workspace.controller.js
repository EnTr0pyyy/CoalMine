const prisma = require('../config/db');
const { verifyAccessToken } = require('../utils/jwt');
const { createWorkspaceTask } = require('../services/workspaceTaskService');

function resolveUserId(req) {
  if (req.user?.userId) return String(req.user.userId);
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    const token = header.slice(7);
    if (token.startsWith('mock-token-')) return token.replace('mock-token-', '').trim();
    try {
      return String(verifyAccessToken(token)?.userId || '');
    } catch (_) {}
  }
  return String(req.headers['x-user-id'] || req.body?.userId || req.query?.userId || '');
}

async function ownedSession(sessionId, userId) {
  if (!sessionId || !userId) return null;
  return prisma.chatSession.findFirst({ where: { id: sessionId, userId } });
}

async function accessibleDocument(documentId, userId) {
  return prisma.document.findFirst({
    where: {
      id: documentId,
      OR: [
        { userId },
        { userId: null, chatLinks: { some: { session: { userId } } } },
      ],
    },
  });
}

exports.getWorkspace = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const session = await ownedSession(req.params.id, userId);
    if (!session) return res.status(404).json({ message: 'Workspace not found or unauthorized.' });

    const [links, tasks] = await Promise.all([
      prisma.chatDocument.findMany({
        where: { sessionId: session.id },
        include: { document: { include: { versions: { orderBy: { versionNumber: 'desc' }, take: 10 } } } },
        orderBy: { attachedAt: 'asc' },
      }),
      prisma.workspaceTask.findMany({
        where: { sessionId: session.id, userId },
        orderBy: { updatedAt: 'desc' },
        take: 30,
      }),
    ]);
    return res.json({ success: true, workspace: { ...session, documents: links, tasks } });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Unable to load workspace.' });
  }
};

exports.attachDocument = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const session = await ownedSession(req.params.id, userId);
    if (!session) return res.status(404).json({ message: 'Workspace not found or unauthorized.' });
    const { documentId, role = 'SOURCE' } = req.body || {};
    if (!documentId) return res.status(400).json({ message: 'documentId is required.' });
    const document = await prisma.document.findFirst({
      where: { id: documentId, OR: [{ userId }, { userId: null }] },
    });
    if (!document) return res.status(404).json({ message: 'Document not found or unauthorized.' });

    const link = await prisma.chatDocument.upsert({
      where: { sessionId_documentId: { sessionId: session.id, documentId } },
      update: { role },
      create: { sessionId: session.id, documentId, role },
      include: { document: true },
    });
    await prisma.chatSession.update({ where: { id: session.id }, data: { activeDocumentId: documentId } });
    return res.status(201).json({ success: true, link });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Unable to attach document.' });
  }
};

exports.detachDocument = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const session = await ownedSession(req.params.id, userId);
    if (!session) return res.status(404).json({ message: 'Workspace not found or unauthorized.' });
    await prisma.chatDocument.deleteMany({ where: { sessionId: session.id, documentId: req.params.documentId } });
    if (session.activeDocumentId === req.params.documentId) {
      await prisma.chatSession.update({ where: { id: session.id }, data: { activeDocumentId: null } });
    }
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Unable to detach document.' });
  }
};

exports.createTask = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const { sessionId = null, documentId = null, type, payload = {} } = req.body || {};
    if (!['ANALYZE_DOCUMENT', 'GENERATE_REPORT', 'EDIT_DOCUMENT', 'COMPARE_DOCUMENTS'].includes(type)) {
      return res.status(400).json({ message: 'Unsupported workspace task type.' });
    }
    let activeDocumentId = documentId;
    if (sessionId) {
      const session = await ownedSession(sessionId, userId);
      if (!session) return res.status(404).json({ message: 'Workspace not found or unauthorized.' });
      activeDocumentId = activeDocumentId || session.activeDocumentId;
    }
    if (activeDocumentId && !(await accessibleDocument(activeDocumentId, userId))) {
      return res.status(404).json({ message: 'Document not found or unauthorized.' });
    }
    const task = await createWorkspaceTask({ userId, sessionId, documentId: activeDocumentId, type, payload });
    return res.status(202).json({ success: true, task });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Unable to start workspace task.' });
  }
};

exports.getTasks = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const where = { userId };
    if (req.query.sessionId) where.sessionId = String(req.query.sessionId);
    if (req.query.status) where.status = String(req.query.status);
    const tasks = await prisma.workspaceTask.findMany({ where, orderBy: { updatedAt: 'desc' }, take: 50 });
    return res.json({ success: true, tasks });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Unable to fetch tasks.' });
  }
};

exports.getTask = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const task = await prisma.workspaceTask.findFirst({ where: { id: req.params.id, userId } });
    if (!task) return res.status(404).json({ message: 'Task not found or unauthorized.' });
    return res.json({ success: true, task });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Unable to fetch task.' });
  }
};

exports.cancelTask = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const task = await prisma.workspaceTask.findFirst({ where: { id: req.params.id, userId } });
    if (!task) return res.status(404).json({ message: 'Task not found or unauthorized.' });
    if (['COMPLETED', 'FAILED'].includes(task.status)) return res.status(409).json({ message: 'Completed tasks cannot be cancelled.' });
    const updated = await prisma.workspaceTask.update({
      where: { id: task.id },
      data: { status: 'CANCELLED', currentStep: 'Cancelled by user', completedAt: new Date() },
    });
    return res.json({ success: true, task: updated });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Unable to cancel task.' });
  }
};

exports.createAutomation = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const { name, trigger, action, config = {} } = req.body || {};
    if (!name || !trigger || !action) return res.status(400).json({ message: 'name, trigger and action are required.' });
    if (!['DOCUMENT_UPLOADED', 'SCHEDULE'].includes(trigger)) return res.status(400).json({ message: 'Unsupported automation trigger.' });
    if (!['ANALYZE_DOCUMENT', 'GENERATE_REPORT', 'EDIT_DOCUMENT', 'COMPARE_DOCUMENTS'].includes(action)) {
      return res.status(400).json({ message: 'Unsupported automation action.' });
    }
    const automation = await prisma.automation.create({ data: { userId, name, trigger, action, config } });
    return res.status(201).json({ success: true, automation });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Unable to create automation.' });
  }
};

exports.getAutomations = async (req, res) => {
  try {
    const automations = await prisma.automation.findMany({
      where: { userId: resolveUserId(req) },
      orderBy: { updatedAt: 'desc' },
    });
    return res.json({ success: true, automations });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Unable to fetch automations.' });
  }
};

exports.getDocumentVersions = async (req, res) => {
  try {
    const document = await accessibleDocument(req.params.documentId, resolveUserId(req));
    if (!document) return res.status(404).json({ message: 'Document not found or unauthorized.' });
    const versions = await prisma.documentVersion.findMany({
      where: { documentId: document.id },
      orderBy: { versionNumber: 'desc' },
    });
    return res.json({ success: true, document, versions });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Unable to fetch document versions.' });
  }
};

exports.compareDocumentVersions = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    const document = await accessibleDocument(req.params.documentId, userId);
    if (!document) return res.status(404).json({ message: 'Document not found or unauthorized.' });
    const versionNumbers = [Number(req.params.from), Number(req.params.to)];
    if (versionNumbers.some((number) => !Number.isInteger(number) || number < 1)) {
      return res.status(400).json({ message: 'Version numbers must be positive integers.' });
    }
    const versions = await prisma.documentVersion.findMany({
      where: { documentId: document.id, versionNumber: { in: versionNumbers } },
    });
    const from = versions.find((version) => version.versionNumber === versionNumbers[0]);
    const to = versions.find((version) => version.versionNumber === versionNumbers[1]);
    if (!from || !to) return res.status(404).json({ message: 'One or both requested versions do not exist.' });
    const before = from.content || {};
    const after = to.content || {};
    const changedFields = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
      .filter((field) => JSON.stringify(before[field]) !== JSON.stringify(after[field]));
    return res.json({
      success: true,
      documentId: document.id,
      from: { id: from.id, versionNumber: from.versionNumber, label: from.label },
      to: { id: to.id, versionNumber: to.versionNumber, label: to.label },
      changedFields,
      before,
      after,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Unable to compare document versions.' });
  }
};
