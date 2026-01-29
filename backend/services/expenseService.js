const { Expense } = require('../models');

const toNumber = (v) => Number(v || 0);

class ExpenseService {
    static async getExpenseStats() {
        const expenses = await Expense.find();

        // Calculate total expenses
        const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

        // Monthly trend (last 12 months)
        const now = new Date();
        const monthlyTrend = [];

        for (let i = 11; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const nextDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

            const monthExpenses = expenses.filter(expense =>
                expense.expense_date >= date && expense.expense_date < nextDate
            );

            const total = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);

            monthlyTrend.push({
                month: date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' }),
                total: total
            });
        }

        return {
            totalExpenses,
            monthlyTrend,
            count: expenses.length
        };
    }

    static async getAllExpenses() {
        const expenses = await Expense.find().sort({ expense_date: -1 });

        const result = expenses.map(expense => ({
            id: expense._id,
            expense_date: expense.expense_date,
            description: expense.description,
            amount: expense.amount,
            notes: expense.notes,
            method: expense.method,
            details: expense.details,
            created_at: expense.created_at,
            updated_at: expense.updated_at
        }));

        return { expenses: result };
    }

    static async getExpenseById(id) {
        const expense = await Expense.findById(id);

        if (!expense) {
            return null;
        }

        return {
            id: expense._id,
            expense_date: expense.expense_date,
            description: expense.description,
            amount: expense.amount,
            notes: expense.notes,
            method: expense.method,
            details: expense.details,
            created_at: expense.created_at,
            updated_at: expense.updated_at
        };
    }

    static async createExpense(data) {
        const { expense_date, description, amount, notes, method, details } = data;

        if (!expense_date || !description || !amount) {
            throw new Error('التاريخ والوصف والمبلغ مطلوبة');
        }

        const expense = new Expense({
            expense_date: new Date(expense_date),
            description: description.trim(),
            amount: toNumber(amount),
            notes: notes?.trim() || '',
            method: method?.trim() || '',
            details: details?.trim() || ''
        });

        await expense.save();

        return {
            id: expense._id,
            expense_date: expense.expense_date,
            description: expense.description,
            amount: expense.amount,
            notes: expense.notes,
            method: expense.method,
            details: expense.details,
            created_at: expense.created_at,
            updated_at: expense.updated_at
        };
    }

    static async updateExpense(id, data) {
        const { expense_date, description, amount, notes, method, details } = data;

        if (!expense_date || !description || !amount) {
            throw new Error('التاريخ والوصف والمبلغ مطلوبة');
        }

        const expense = await Expense.findByIdAndUpdate(
            id,
            {
                expense_date: new Date(expense_date),
                description: description.trim(),
                amount: toNumber(amount),
                notes: notes?.trim() || '',
                method: method?.trim() || '',
                details: details?.trim() || ''
            },
            { new: true }
        );

        if (!expense) {
            return null;
        }

        return {
            id: expense._id,
            expense_date: expense.expense_date,
            description: expense.description,
            amount: expense.amount,
            notes: expense.notes,
            method: expense.method,
            details: expense.details,
            created_at: expense.created_at,
            updated_at: expense.updated_at
        };
    }

    static async deleteExpense(id) {
        return await Expense.findByIdAndDelete(id);
    }

    // Get expenses with filtering and pagination
    static async getExpensesWithFilters(query = {}) {
        const {
            from_date,
            to_date,
            page = 1,
            limit = 50,
            sort = 'expense_date',
            order = 'desc'
        } = query;

        let filter = {};

        if (from_date || to_date) {
            filter.expense_date = {};
            if (from_date) filter.expense_date.$gte = new Date(from_date);
            if (to_date) {
                const toDate = new Date(to_date);
                toDate.setDate(toDate.getDate() + 1);
                filter.expense_date.$lt = toDate;
            }
        }

        const sortOrder = order === 'desc' ? -1 : 1;
        const skip = (page - 1) * limit;

        const expenses = await Expense.find(filter)
            .sort({ [sort]: sortOrder })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Expense.countDocuments(filter);

        const result = expenses.map(expense => ({
            id: expense._id,
            expense_date: expense.expense_date,
            description: expense.description,
            amount: expense.amount,
            notes: expense.notes,
            method: expense.method,
            details: expense.details,
            created_at: expense.created_at,
            updated_at: expense.updated_at
        }));

        return {
            expenses: result,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }
}

module.exports = ExpenseService;