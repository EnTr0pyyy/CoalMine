const express = require('express');
const router = express.Router();
const { globalSearch } = require('../services/searchService');
const { verifyToken } = require('../middlewares/auth.middleware');

/**
 * GET /api/search?q=query&limit=20&tables=all
 * PostgreSQL Full-Text Search across Flags, Corrective Actions, Inspections, Notices, Parliamentary Inquiries
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const { q, limit, tables } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({ query: q || '', total: 0, results: [] });
    }

    const searchResults = await globalSearch(q, {
      limit: parseInt(limit) || 20,
      tables: tables || 'all',
    });

    return res.json(searchResults);
  } catch (error) {
    console.error('Search route error:', error);
    return res.status(500).json({ message: 'Search failed', error: error.message });
  }
});

module.exports = router;
