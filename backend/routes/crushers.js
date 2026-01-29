const express = require('express');
const crushersController = require('../controllers/crushersController');

const router = express.Router();

// ============================================================================
// CONSOLIDATED CRUSHERS ROUTES - ALL METHODS
// Combines functionality from: crushers.js, crushers-new.js, crushers-refactored.js
// Uses MVC architecture with controllers and services
// ============================================================================

// Get all crushers with pricing information
router.get('/', crushersController.getAllCrushers);

// Get crusher by ID with detailed information and related data
router.get('/:id', crushersController.getCrusherById);

// Create new crusher
router.post('/', crushersController.createCrusher);

// Update crusher
router.put('/:id', crushersController.updateCrusher);

// Update crusher prices only
router.put('/:id/prices', crushersController.updateCrusherPrices);

// Delete crusher
router.delete('/:id', crushersController.deleteCrusher);

// ============================================================================
// CRUSHER PAYMENTS MANAGEMENT
// ============================================================================

// Get crusher payments
router.get('/:id/payments', crushersController.getCrusherPayments);

// Add crusher payment
router.post('/:id/payments', crushersController.addCrusherPayment);

// Update crusher payment
router.put('/:id/payments/:paymentId', crushersController.updateCrusherPayment);

// Delete crusher payment
router.delete('/:id/payments/:paymentId', crushersController.deleteCrusherPayment);

// ============================================================================
// CRUSHER ADJUSTMENTS MANAGEMENT
// ============================================================================

// Get crusher adjustments
router.get('/:id/adjustments', crushersController.getCrusherAdjustments);

// Add crusher adjustment
router.post('/:id/adjustments', crushersController.addCrusherAdjustment);

// Update crusher adjustment
router.put('/:id/adjustments/:adjustmentId', crushersController.updateCrusherAdjustment);

// Delete crusher adjustment
router.delete('/:id/adjustments/:adjustmentId', crushersController.deleteCrusherAdjustment);

// ============================================================================
// CRUSHER REPORTS AND ANALYTICS
// ============================================================================

// Get crusher deliveries report with date filtering (HTML Report)
router.get('/:id/reports/deliveries', crushersController.getCrusherDeliveriesReport);

// Get crusher account statement (HTML Report)
router.get('/:id/reports/statement', crushersController.getCrusherAccountStatement);

module.exports = router;