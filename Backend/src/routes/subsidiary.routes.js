const express = require('express');
const { getAllSubsidiaries, getSubsidiaryByCode } = require('../controllers/subsidiary.controller');

const router = express.Router();

router.get('/', getAllSubsidiaries);
router.get('/:code', getSubsidiaryByCode);

module.exports = router;
