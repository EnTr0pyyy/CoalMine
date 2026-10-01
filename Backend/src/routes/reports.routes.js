const express = require('express');
const { generateReport, getTemplates } = require('../controllers/reports.controller');

const router = express.Router();

router.get('/templates', getTemplates);
router.post('/generate', generateReport);
router.post('/', generateReport);

module.exports = router;
