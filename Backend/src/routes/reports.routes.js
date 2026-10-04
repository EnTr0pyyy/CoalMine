const express = require('express');
const {
  generateReport,
  getTemplates,
  analyzeAndGenerateFromUpload,
  createReportTask,
  createReportUploadTask,
} = require('../controllers/reports.controller');
const { upload } = require('../middlewares/upload.middleware');

const router = express.Router();

router.get('/templates', getTemplates);
// Durable Report Studio jobs. These return immediately and continue server-side
// so changing tabs/routes cannot abort OCR or report synthesis.
router.post('/tasks', createReportTask);
router.post('/tasks/upload', upload.single('file'), createReportUploadTask);
router.post('/generate', generateReport);
router.post('/analyze-upload', upload.single('file'), analyzeAndGenerateFromUpload);
router.post('/', generateReport);

module.exports = router;
