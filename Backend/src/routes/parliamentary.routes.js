const express = require('express');
const {
  getInquiries,
  getInquiryById,
  queryAndDraftResponse,
  verifyResponse
} = require('../controllers/parliamentary.controller');

const router = express.Router();

router.get('/inquiries', getInquiries);
router.get('/inquiries/:id', getInquiryById);
router.post('/query', queryAndDraftResponse);
router.post('/draft-response', queryAndDraftResponse);
router.post('/verify', verifyResponse);

module.exports = router;
