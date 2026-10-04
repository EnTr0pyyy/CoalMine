const express = require('express');
const controller = require('../controllers/workspace.controller');

const router = express.Router();

router.get('/sessions/:id/workspace', controller.getWorkspace);
router.post('/sessions/:id/documents', controller.attachDocument);
router.delete('/sessions/:id/documents/:documentId', controller.detachDocument);
router.post('/tasks', controller.createTask);
router.get('/tasks', controller.getTasks);
router.get('/tasks/:id', controller.getTask);
router.post('/tasks/:id/cancel', controller.cancelTask);
router.get('/automations', controller.getAutomations);
router.post('/automations', controller.createAutomation);
router.get('/documents/:documentId/versions', controller.getDocumentVersions);
router.get('/documents/:documentId/versions/:from/compare/:to', controller.compareDocumentVersions);

module.exports = router;
