// Aggregator: re-export split controllers for backward compatibility

const clients = require('./clientsController');
const deliveries = require('./deliveriesController');
const crushers = require('./crushersController');
const contractors = require('./contractorsController');
const dashboard = require('./dashboardController');

module.exports = {
    // Dashboard
    dashboard: dashboard.dashboard,

    // Clients
    clientsIndex: clients.clientsIndex,
    clientDetails: clients.clientDetails,
    createClient: clients.createClient,
    addClientPayment: clients.addClientPayment,
    addClientAdjustment: clients.addClientAdjustment,

    // Deliveries
    newDeliveryForm: deliveries.newDeliveryForm,
    createDelivery: deliveries.createDelivery,

    // Crushers
    crushersIndex: crushers.crushersIndex,
    crusherDetails: crushers.crusherDetails,

    // Contractors
    contractorsIndex: contractors.contractorsIndex,
    contractorDetails: contractors.contractorDetails
    ,
    createContractor: contractors.createContractor
};
