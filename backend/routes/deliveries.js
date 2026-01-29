const express = require('express');
const deliveriesController = require('../controllers/deliveriesController');

const router = express.Router();

// ============================================================================
// CONSOLIDATED DELIVERIES ROUTES - ALL METHODS
// Combines functionality from: deliveries.js, deliveries-new.js, deliveries-refactored.js
// Uses MVC architecture with controllers and services
// ============================================================================

// Get all deliveries (simple list)
router.get('/', deliveriesController.getAllDeliveries);

// Get deliveries with advanced filtering and pagination
router.get('/search', deliveriesController.getDeliveriesWithFilters);

// Get delivery by ID with detailed information
router.get('/:id', deliveriesController.getDeliveryById);

// Create new delivery
router.post('/', deliveriesController.createDelivery);

// Update delivery
router.put('/:id', deliveriesController.updateDelivery);

// Delete delivery
router.delete('/:id', deliveriesController.deleteDelivery);

module.exports = router;