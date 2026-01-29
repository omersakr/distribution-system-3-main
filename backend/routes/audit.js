const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { requireRole } = require('../middleware/auth');

// All audit routes require Manager or Accountant role
router.use(requireRole(['manager', 'accountant']));

// Get audit logs with filtering and pagination
router.get('/audit-logs', auditController.getAuditLogs);

// Export audit logs
router.get('/audit-logs/export', auditController.exportAuditLogs);

// Get audit logs for specific user
router.get('/audit-logs/user/:userId', auditController.getAuditLogsByUser);

// Get audit logs for specific entity
router.get('/audit-logs/entity/:entityType/:entityId', auditController.getAuditLogsByEntity);

module.exports = router;