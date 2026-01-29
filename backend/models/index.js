// Export all models for easy importing
const Client = require('./Client');
const Crusher = require('./Crusher');
const Contractor = require('./Contractor');
const Delivery = require('./Delivery');
const Payment = require('./Payment');
const ContractorPayment = require('./ContractorPayment');
const CrusherPayment = require('./CrusherPayment');
const Adjustment = require('./Adjustment');
const Expense = require('./Expense');
const Employee = require('./Employee');
const EmployeePayment = require('./EmployeePayment');
const Attendance = require('./Attendance');
const Administration = require('./Administration');
const CapitalInjection = require('./CapitalInjection');
const Withdrawal = require('./Withdrawal');
const AdministrationPayment = require('./AdministrationPayment');
const Supplier = require('./Supplier');
const User = require('./User');
const AuditLog = require('./AuditLog');
const UserSession = require('./UserSession');

module.exports = {
    Client,
    Crusher,
    Contractor,
    Delivery,
    Payment,
    ContractorPayment,
    CrusherPayment,
    Adjustment,
    Expense,
    Employee,
    EmployeePayment,
    Attendance,
    Administration,
    CapitalInjection,
    Withdrawal,
    AdministrationPayment,
    Supplier,
    User,
    AuditLog,
    UserSession
};