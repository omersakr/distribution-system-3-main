const express = require('express');
const supplierController = require('../controllers/supplierController');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// ============================================================================
// SUPPLIERS ROUTES - ALL METHODS
// Uses MVC architecture with controllers and services
// ============================================================================

// Get all suppliers (Both roles)
router.get('/', supplierController.getAllSuppliers);

// Get supplier by ID with detailed information and related data (Both roles)
router.get('/:id', supplierController.getSupplierById);

// Create new supplier (Manager only)
router.post('/', requireRole(['manager']), supplierController.createSupplier);

// Update supplier (Manager only)
router.put('/:id', requireRole(['manager']), supplierController.updateSupplier);

// Delete supplier (Manager only)
router.delete('/:id', requireRole(['manager']), supplierController.deleteSupplier);

// ============================================================================
// SUPPLIER MATERIALS MANAGEMENT
// ============================================================================

// Add material to supplier (Manager only)
router.post('/:id/materials', requireRole(['manager']), supplierController.addSupplierMaterial);

// Update supplier material (Manager only)
router.put('/:id/materials/:materialId', requireRole(['manager']), supplierController.updateSupplierMaterial);

// Delete supplier material (Manager only)
router.delete('/:id/materials/:materialId', requireRole(['manager']), supplierController.deleteSupplierMaterial);

// ============================================================================
// SUPPLIER PAYMENTS MANAGEMENT
// ============================================================================

// Add supplier payment (Both roles)
router.post('/:id/payments', supplierController.addSupplierPayment);

// Update supplier payment (Manager only)
router.put('/:id/payments/:paymentId', requireRole(['manager']), supplierController.updateSupplierPayment);

// Delete supplier payment (Manager only)
router.delete('/:id/payments/:paymentId', requireRole(['manager']), supplierController.deleteSupplierPayment);

// ============================================================================
// SUPPLIER ADJUSTMENTS MANAGEMENT
// ============================================================================

// Get supplier adjustments (Both roles)
router.get('/:id/adjustments', supplierController.getSupplierAdjustments);

// Add supplier adjustment (Both roles)
router.post('/:id/adjustments', supplierController.addSupplierAdjustment);

// Update supplier adjustment (Manager only)
router.put('/:id/adjustments/:adjustmentId', requireRole(['manager']), supplierController.updateSupplierAdjustment);

// Delete supplier adjustment (Manager only)
router.delete('/:id/adjustments/:adjustmentId', requireRole(['manager']), supplierController.deleteSupplierAdjustment);

// ============================================================================
// SUPPLIER REPORTS
// ============================================================================

// Generate deliveries report (GET and POST)
router.get('/:id/reports/deliveries', supplierController.generateDeliveriesReport);
router.post('/:id/reports/deliveries', supplierController.generateDeliveriesReport);

// Generate account statement (GET and POST)
router.get('/:id/reports/statement', supplierController.generateAccountStatement);
router.post('/:id/reports/statement', supplierController.generateAccountStatement);

module.exports = router;