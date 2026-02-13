const express = require('express');
const clientsController = require('../controllers/clientsController');
const suppliersController = require('../controllers/supplierController');
const crushersController = require('../controllers/crushersController');
const contractorsController = require('../controllers/contractorsController');
const employeesController = require('../controllers/employeesController');

const router = express.Router();

// ============================================================================
// PUBLIC REPORT ROUTES - NO AUTHENTICATION REQUIRED
// ============================================================================

// Client reports
router.get('/clients/:id/reports/deliveries', (req, res, next) => clientsController.getClientDeliveriesReport(req, res, next));
router.post('/clients/:id/reports/deliveries', (req, res, next) => clientsController.getClientDeliveriesReport(req, res, next));
router.get('/clients/:id/reports/statement', (req, res, next) => clientsController.getClientAccountStatement(req, res, next));
router.post('/clients/:id/reports/statement', (req, res, next) => clientsController.getClientAccountStatement(req, res, next));

// Supplier reports
router.get('/suppliers/:id/reports/deliveries', (req, res, next) => suppliersController.generateDeliveriesReport(req, res, next));
router.post('/suppliers/:id/reports/deliveries', (req, res, next) => suppliersController.generateDeliveriesReport(req, res, next));
router.get('/suppliers/:id/reports/statement', (req, res, next) => suppliersController.generateAccountStatement(req, res, next));
router.post('/suppliers/:id/reports/statement', (req, res, next) => suppliersController.generateAccountStatement(req, res, next));

// Crusher reports
router.get('/crushers/:id/reports/deliveries', (req, res, next) => crushersController.getCrusherDeliveriesReport(req, res, next));
router.post('/crushers/:id/reports/deliveries', (req, res, next) => crushersController.getCrusherDeliveriesReport(req, res, next));
router.get('/crushers/:id/reports/statement', (req, res, next) => crushersController.getCrusherAccountStatement(req, res, next));
router.post('/crushers/:id/reports/statement', (req, res, next) => crushersController.getCrusherAccountStatement(req, res, next));

// Contractor reports
router.get('/contractors/:id/reports/deliveries', (req, res, next) => contractorsController.generateDeliveriesReport(req, res, next));
router.post('/contractors/:id/reports/deliveries', (req, res, next) => contractorsController.generateDeliveriesReport(req, res, next));
router.get('/contractors/:id/reports/statement', (req, res, next) => contractorsController.generateAccountStatement(req, res, next));
router.post('/contractors/:id/reports/statement', (req, res, next) => contractorsController.generateAccountStatement(req, res, next));

// Employee reports
router.get('/employees/:id/reports/statement', (req, res, next) => employeesController.getEmployeeAccountStatement(req, res, next));
router.post('/employees/:id/reports/statement', (req, res, next) => employeesController.getEmployeeAccountStatement(req, res, next));

module.exports = router;