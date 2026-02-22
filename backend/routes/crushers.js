const express = require('express');
const crushersController = require('../controllers/crushersController');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// ============================================================================
// CONSOLIDATED CRUSHERS ROUTES - ALL METHODS
// Combines functionality from: crushers.js, crushers-new.js, crushers-refactored.js
// Uses MVC architecture with controllers and services
// ============================================================================

// Get all crushers with pricing information (Both roles)
router.get('/', crushersController.getAllCrushers);

// Get crusher by ID with detailed information and related data (Both roles)
router.get('/:id', crushersController.getCrusherById);

// Create new crusher (Manager only)
router.post('/', requireRole(['manager']), crushersController.createCrusher);

// Update crusher (Manager only)
router.put('/:id', requireRole(['manager']), crushersController.updateCrusher);

// Update crusher prices only (Manager only)
router.put('/:id/prices', requireRole(['manager']), crushersController.updateCrusherPrices);

// Delete crusher (Manager only)
router.delete('/:id', requireRole(['manager']), crushersController.deleteCrusher);

// ============================================================================
// CRUSHER PAYMENTS MANAGEMENT
// ============================================================================

// Get crusher payments (Both roles)
router.get('/:id/payments', crushersController.getCrusherPayments);

// Add crusher payment (Both roles)
router.post('/:id/payments', crushersController.addCrusherPayment);

// Update crusher payment (Manager only)
router.put('/:id/payments/:paymentId', requireRole(['manager']), crushersController.updateCrusherPayment);

// Delete crusher payment (Manager only)
router.delete('/:id/payments/:paymentId', requireRole(['manager']), crushersController.deleteCrusherPayment);

// ============================================================================
// CRUSHER ADJUSTMENTS MANAGEMENT
// ============================================================================

// Get crusher adjustments (Both roles)
router.get('/:id/adjustments', crushersController.getCrusherAdjustments);

// Add crusher adjustment (Both roles)
router.post('/:id/adjustments', crushersController.addCrusherAdjustment);

// Update crusher adjustment (Manager only)
router.put('/:id/adjustments/:adjustmentId', requireRole(['manager']), crushersController.updateCrusherAdjustment);

// Delete crusher adjustment (Manager only)
router.delete('/:id/adjustments/:adjustmentId', requireRole(['manager']), crushersController.deleteCrusherAdjustment);

// ============================================================================
// CRUSHER REPORTS AND ANALYTICS
// ============================================================================

// Get crusher deliveries report with date filtering (HTML Report)
router.get('/:id/reports/deliveries', crushersController.getCrusherDeliveriesReport);

// Get crusher account statement (HTML Report)
router.get('/:id/reports/statement', crushersController.getCrusherAccountStatement);

module.exports = router;