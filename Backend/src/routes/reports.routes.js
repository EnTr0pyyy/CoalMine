const express = require('express');
const {
  generateReport,
  getTemplates,
  analyzeAndGenerateFromUpload,
} = require('../controllers/reports.controller');
const { upload } = require('../middlewares/upload.middleware');

const router = express.Router();

router.get('/templates', getTemplates);
router.post('/generate', generateReport);
router.post('/analyze-upload', upload.single('file'), analyzeAndGenerateFromUpload);
router.post('/', generateReport);

module.exports = router;
