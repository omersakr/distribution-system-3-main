const express = require('express');
const controller = require('../controllers/webController');

const router = express.Router();

router.get('/', controller.dashboard);

// Clients
router.get('/clients', controller.clientsIndex);
router.get('/clients/:id', controller.clientDetails);
router.post('/clients', controller.createClient);
router.post('/clients/:id/payments', controller.addClientPayment);
router.post('/clients/:id/adjustments', controller.addClientAdjustment);

// Deliveries
router.get('/deliveries/new', controller.newDeliveryForm);
router.post('/deliveries', controller.createDelivery);

// Crushers
router.get('/crushers', controller.crushersIndex);
router.get('/crushers/:id', controller.crusherDetails);

// Contractors
router.get('/contractors', controller.contractorsIndex);
router.get('/contractors/:id', controller.contractorDetails);

module.exports = router;