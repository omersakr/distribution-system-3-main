const express = require('express');
const expensesController = require('../controllers/expensesController');

const router = express.Router();

// ============================================================================
// CONSOLIDATED EXPENSES ROUTES - ALL METHODS
// Combines functionality from: expenses.js, expenses-new.js, expenses-refactored.js
// Uses MVC architecture with controllers and services
// ============================================================================

// Get expense statistics and analytics
router.get('/stats', expensesController.getExpenseStats);

// Get all expenses (simple list)
router.get('/', expensesController.getAllExpenses);

// Get expenses with advanced filtering and pagination
router.get('/search', expensesController.getExpensesWithFilters);

// Get expense by ID with detailed information
router.get('/:id', expensesController.getExpenseById);

// Create new expense
router.post('/', expensesController.createExpense);

// Update expense
router.put('/:id', expensesController.updateExpense);

// Delete expense
router.delete('/:id', expensesController.deleteExpense);

module.exports = router;