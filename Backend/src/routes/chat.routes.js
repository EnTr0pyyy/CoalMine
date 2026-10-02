const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const { upload } = require('../middlewares/upload.middleware');

// Chat streaming
router.post('/chat', chatController.handleChatStream);

// Session management
router.get('/sessions', chatController.getSessions);
router.post('/sessions', chatController.createSession);
router.post('/sessions/clear', chatController.clearUserSessions);
router.get('/sessions/:id/messages', chatController.getSessionMessages);
router.delete('/sessions/:id', chatController.deleteSession);

// RAG Document Ingestion & Knowledge Base Management
router.post('/chat/documents', upload.single('file'), chatController.uploadRagDocument);
router.get('/chat/documents', chatController.getRagDocuments);
router.get('/chat/documents/:id/chunks', chatController.getRagDocumentChunks);
router.delete('/chat/documents/:id', chatController.deleteRagDocument);

module.exports = router;
