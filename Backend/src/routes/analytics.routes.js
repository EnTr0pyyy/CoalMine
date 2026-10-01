const express = require('express');
const { getWordCloud, getTopics, getPlatformStats } = require('../controllers/analytics.controller');

const router = express.Router();

router.get('/platform-stats', getPlatformStats);
router.get('/stats', getPlatformStats);
router.get('/wordcloud', getWordCloud);
router.post('/wordcloud', getWordCloud);
router.get('/topics', getTopics);
router.post('/topics', getTopics);

module.exports = router;
