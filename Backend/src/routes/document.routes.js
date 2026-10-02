const express = require('express');
const {
  getDocuments,
  getDocumentById,
  uploadDocument,
  processDocument,
  deleteDocument,
} = require('../controllers/document.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { upload } = require('../middlewares/upload.middleware');

const router = express.Router();

router.get('/', verifyToken, getDocuments);
router.get('/:id', verifyToken, getDocumentById);
router.post('/', verifyToken, upload.single('file'), uploadDocument);
router.post('/:id/process', verifyToken, processDocument);
router.delete('/:id', verifyToken, deleteDocument);

module.exports = router;
