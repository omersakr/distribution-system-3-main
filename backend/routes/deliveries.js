const express = require('express');
const deliveriesController = require('../controllers/deliveriesController');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// ============================================================================
// CONSOLIDATED DELIVERIES ROUTES - ALL METHODS
// Combines functionality from: deliveries.js, deliveries-new.js, deliveries-refactored.js
// Uses MVC architecture with controllers and services
// ============================================================================

// Get all deliveries (simple list) - Both roles
router.get('/', deliveriesController.getAllDeliveries);

// Get deliveries with advanced filtering and pagination - Both roles
router.get('/search', deliveriesController.getDeliveriesWithFilters);

// Get delivery by ID with detailed information - Both roles
router.get('/:id', deliveriesController.getDeliveryById);

// Create new delivery - Both roles
router.post('/', deliveriesController.createDelivery);

// Update delivery - Manager only (accountant cannot edit vouchers after creation)
router.put('/:id', requireRole(['manager']), deliveriesController.updateDelivery);

// Delete delivery - Manager only
router.delete('/:id', requireRole(['manager']), deliveriesController.deleteDelivery);

module.exports = router;