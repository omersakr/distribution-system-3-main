const express = require('express');
const employeesController = require('../controllers/employeesController');

const router = express.Router();

// ============================================================================
// CONSOLIDATED EMPLOYEES ROUTES - ALL METHODS
// Uses MVC architecture with controllers and services
// ============================================================================

// Get all employees
router.get('/', employeesController.getAllEmployees);

// Get employee by ID with detailed information and related data
router.get('/:id', employeesController.getEmployeeById);

// Create new employee
router.post('/', employeesController.createEmployee);

// Update employee
router.put('/:id', employeesController.updateEmployee);

// Delete employee
router.delete('/:id', employeesController.deleteEmployee);

// ============================================================================
// EMPLOYEE PAYMENTS MANAGEMENT
// ============================================================================

// Get employee payments
router.get('/:id/payments', employeesController.getEmployeePayments);

// Add employee payment
router.post('/:id/payments', employeesController.addEmployeePayment);

// Update employee payment
router.put('/:id/payments/:paymentId', employeesController.updateEmployeePayment);

// Delete employee payment
router.delete('/:id/payments/:paymentId', employeesController.deleteEmployeePayment);

// ============================================================================
// EMPLOYEE ADJUSTMENTS MANAGEMENT
// ============================================================================

// Get employee adjustments
router.get('/:id/adjustments', employeesController.getEmployeeAdjustments);

// Add employee adjustment
router.post('/:id/adjustments', employeesController.addEmployeeAdjustment);

// Update employee adjustment
router.put('/:id/adjustments/:adjustmentId', employeesController.updateEmployeeAdjustment);

// Delete employee adjustment
router.delete('/:id/adjustments/:adjustmentId', employeesController.deleteEmployeeAdjustment);

// ============================================================================
// EMPLOYEE ATTENDANCE MANAGEMENT
// ============================================================================

// Get employee attendance records
router.get('/:id/attendance', employeesController.getEmployeeAttendance);

// Add attendance record
router.post('/:id/attendance', employeesController.addAttendanceRecord);

// Update attendance record
router.put('/:id/attendance/:attendanceId', employeesController.updateAttendanceRecord);

// Delete attendance record
router.delete('/:id/attendance/:attendanceId', employeesController.deleteAttendanceRecord);

// ============================================================================
// EMPLOYEE REPORTS
// ============================================================================

// Get employee account statement (HTML Report)
router.get('/:id/reports/statement', employeesController.getEmployeeAccountStatement);

module.exports = router;