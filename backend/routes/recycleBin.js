const express = require('express');
const router = express.Router();
const RecycleBinController = require('../controllers/recycleBinController');
const { requireRole } = require('../middleware/auth');

const recycleBinController = new RecycleBinController();

// View deleted items (Manager + Accountant)
router.get('/recycle-bin', requireRole(['manager', 'accountant']), recycleBinController.getDeletedItems.bind(recycleBinController));

// Restore operations (Manager only)
router.post('/recycle-bin/:entityType/:id/restore', requireRole(['manager']), recycleBinController.restoreItem.bind(recycleBinController));
router.post('/recycle-bin/bulk-restore', requireRole(['manager']), recycleBinController.bulkRestore.bind(recycleBinController));

// Permanent delete operations (Manager only)
router.delete('/recycle-bin/:entityType/:id/permanent', requireRole(['manager']), recycleBinController.permanentDelete.bind(recycleBinController));
router.delete('/recycle-bin/bulk-delete', requireRole(['manager']), recycleBinController.bulkDelete.bind(recycleBinController));

module.exports = router;