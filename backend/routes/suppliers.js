const express = require('express');
const supplierController = require('../controllers/supplierController');

const router = express.Router();

// ============================================================================
// SUPPLIERS ROUTES - ALL METHODS
// Uses MVC architecture with controllers and services
// ============================================================================

// Get all suppliers
router.get('/', supplierController.getAllSuppliers);

// Get supplier by ID with detailed information and related data
router.get('/:id', supplierController.getSupplierById);

// Create new supplier
router.post('/', supplierController.createSupplier);

// Update supplier
router.put('/:id', supplierController.updateSupplier);

// Delete supplier
router.delete('/:id', supplierController.deleteSupplier);

// ============================================================================
// SUPPLIER PAYMENTS MANAGEMENT
// ============================================================================

// Add supplier payment
router.post('/:id/payments', supplierController.addSupplierPayment);

// Update supplier payment
router.put('/:id/payments/:paymentId', supplierController.updateSupplierPayment);

// Delete supplier payment
router.delete('/:id/payments/:paymentId', supplierController.deleteSupplierPayment);

module.exports = router;