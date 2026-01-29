const express = require('express');
const administrationController = require('../controllers/administrationController');

const router = express.Router();

// ============================================================================
// ADMINISTRATION ROUTES - ALL METHODS
// Uses MVC architecture with controllers and services
// ============================================================================

// Get all administration entities
router.get('/', administrationController.getAllAdministration);

// Get administration by ID with detailed information and related data
router.get('/:id', administrationController.getAdministrationById);

// Create new administration
router.post('/', administrationController.createAdministration);

// Update administration
router.put('/:id', administrationController.updateAdministration);

// Delete administration
router.delete('/:id', administrationController.deleteAdministration);

// ============================================================================
// ADMINISTRATION PAYMENTS MANAGEMENT
// ============================================================================

// Add administration payment
router.post('/:id/payments', administrationController.addAdministrationPayment);

// Update administration payment
router.put('/:id/payments/:paymentId', administrationController.updateAdministrationPayment);

// Delete administration payment
router.delete('/:id/payments/:paymentId', administrationController.deleteAdministrationPayment);

// ============================================================================
// CAPITAL INJECTION MANAGEMENT
// ============================================================================

// Add capital injection
router.post('/:id/capital-injections', administrationController.addCapitalInjection);

// Update capital injection
router.put('/:id/capital-injections/:injectionId', administrationController.updateCapitalInjection);

// Delete capital injection
router.delete('/:id/capital-injections/:injectionId', administrationController.deleteCapitalInjection);

// ============================================================================
// WITHDRAWAL MANAGEMENT
// ============================================================================

// Add withdrawal
router.post('/:id/withdrawals', administrationController.addWithdrawal);

// Update withdrawal
router.put('/:id/withdrawals/:withdrawalId', administrationController.updateWithdrawal);

// Delete withdrawal
router.delete('/:id/withdrawals/:withdrawalId', administrationController.deleteWithdrawal);

module.exports = router;