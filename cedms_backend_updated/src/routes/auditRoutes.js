const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { authenticateToken } = require('../middleware/auth');
const { isAdmin } = require('../middleware/rbac');

// All audit routes are Admin only
router.get('/', authenticateToken, isAdmin, auditController.getLogs);
router.delete('/', authenticateToken, isAdmin, auditController.clearLogs);

module.exports = router;
