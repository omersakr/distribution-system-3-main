const expenseService = require('../services/expenseService');

class ExpensesController {
    // Get expense statistics
    async getExpenseStats(req, res, next) {
        try {
            const stats = await expenseService.getExpenseStats();
            res.json(stats);
        } catch (err) {
            next(err);
        }
    }

    // Get all expenses
    async getAllExpenses(req, res, next) {
        try {
            const result = await expenseService.getAllExpenses();
            res.json(result);
        } catch (err) {
            next(err);
        }
    }

    // Get expenses with filters and pagination
    async getExpensesWithFilters(req, res, next) {
        try {
            const result = await expenseService.getExpensesWithFilters(req.query);
            res.json(result);
        } catch (err) {
            next(err);
        }
    }

    // Get expense by ID
    async getExpenseById(req, res, next) {
        try {
            const expense = await expenseService.getExpenseById(req.params.id);

            if (!expense) {
                return res.status(404).json({ message: 'المصروف غير موجود' });
            }

            res.json(expense);
        } catch (err) {
            next(err);
        }
    }

    // Create new expense
    async createExpense(req, res, next) {
        try {
            const expense = await expenseService.createExpense(req.body);
            res.status(201).json(expense);
        } catch (err) {
            if (err.message === 'التاريخ والوصف والمبلغ مطلوبة') {
                return res.status(400).json({ message: err.message });
            }
            next(err);
        }
    }

    // Update expense
    async updateExpense(req, res, next) {
        try {
            const expense = await expenseService.updateExpense(req.params.id, req.body);

            if (!expense) {
                return res.status(404).json({ message: 'المصروف غير موجود' });
            }

            res.json(expense);
        } catch (err) {
            if (err.message === 'التاريخ والوصف والمبلغ مطلوبة') {
                return res.status(400).json({ message: err.message });
            }
            next(err);
        }
    }

    // Delete expense
    async deleteExpense(req, res, next) {
        try {
            const expense = await expenseService.deleteExpense(req.params.id);

            if (!expense) {
                return res.status(404).json({ message: 'المصروف غير موجود' });
            }

            res.json({ message: 'تم حذف المصروف بنجاح' });
        } catch (err) {
            next(err);
        }
    }
}

module.exports = new ExpensesController();