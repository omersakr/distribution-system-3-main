const { Expense } = require('../models');

const toNumber = (v) => Number(v || 0);

// Arabic month names mapping
const arabicMonths = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

// Convert number to Arabic numerals
const toArabicNumerals = (num) => {
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return String(num).split('').map(digit => arabicNumerals[parseInt(digit)] || digit).join('');
};

class ExpenseService {
    static async getExpenseStats() {
        const expenses = await Expense.find({ is_deleted: { $ne: true } });

        // Calculate total expenses
        const totalExpenses = expenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0);

        // Monthly trend (last 12 months)
        const now = new Date();
        const monthlyTrend = [];

        for (let i = 11; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const nextDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

            const monthExpenses = expenses.filter(expense => {
                const expenseDate = new Date(expense.expense_date);
                return expenseDate >= date && expenseDate < nextDate;
            });

            const total = monthExpenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0);
            const count = monthExpenses.length;

            // Format month name properly in Arabic
            const monthName = arabicMonths[date.getMonth()];
            const year = toArabicNumerals(date.getFullYear());

            monthlyTrend.push({
                month: date.toISOString().slice(0, 7), // YYYY-MM format for easier comparison
                monthName: `${monthName} ${year}`,
                total: total,
                count: count
            });
        }

        return {
            totalExpenses,
            monthlyTrend,
            count: expenses.length
        };
    }

    static async getAllExpenses() {
        const expenses = await Expense.find({ is_deleted: { $ne: true } }).sort({ expense_date: -1 });

        const result = expenses.map(expense => ({
            id: expense._id,
            expense_date: expense.expense_date,
            description: expense.description,
            category: expense.category,
            amount: toNumber(expense.amount),
            notes: expense.notes,
            method: expense.method,
            details: expense.details,
            project_id: expense.project_id || null, // Add project_id field
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
            category: expense.category,
            amount: toNumber(expense.amount),
            notes: expense.notes,
            method: expense.method,
            details: expense.details,
            project_id: expense.project_id,
            created_at: expense.created_at,
            updated_at: expense.updated_at
        };
    }

    static async createExpense(data) {
        const { expense_date, description, category, amount, notes, method, details, project_id } = data;

        if (!expense_date || !description || !amount) {
            throw new Error('التاريخ والوصف والمبلغ مطلوبة');
        }

        const expense = new Expense({
            expense_date: new Date(expense_date),
            description: description.trim(),
            category: category || 'أخرى',
            amount: toNumber(amount),
            notes: notes?.trim() || '',
            method: method?.trim() || '',
            details: details?.trim() || '',
            project_id: project_id || null
        });

        await expense.save();

        return {
            id: expense._id,
            expense_date: expense.expense_date,
            description: expense.description,
            category: expense.category,
            amount: toNumber(expense.amount),
            notes: expense.notes,
            method: expense.method,
            details: expense.details,
            project_id: expense.project_id,
            created_at: expense.created_at,
            updated_at: expense.updated_at
        };
    }

    static async updateExpense(id, data) {
        const { expense_date, description, category, amount, notes, method, details, project_id } = data;

        if (!expense_date || !description || !amount) {
            throw new Error('التاريخ والوصف والمبلغ مطلوبة');
        }

        const expense = await Expense.findByIdAndUpdate(
            id,
            {
                expense_date: new Date(expense_date),
                description: description.trim(),
                category: category || 'أخرى',
                amount: toNumber(amount),
                notes: notes?.trim() || '',
                method: method?.trim() || '',
                details: details?.trim() || '',
                project_id: project_id || null
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
            category: expense.category,
            amount: toNumber(expense.amount),
            notes: expense.notes,
            method: expense.method,
            details: expense.details,
            project_id: expense.project_id,
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
            start_date,
            end_date,
            project_id,
            page = 1,
            limit = 50,
            sort = 'expense_date',
            order = 'desc'
        } = query;

        let filter = { is_deleted: { $ne: true } };

        // Filter by project_id if provided
        if (project_id) {
            filter.project_id = project_id;
        }

        // Handle both date filter formats
        const startDate = start_date || from_date;
        const endDate = end_date || to_date;

        if (startDate || endDate) {
            filter.expense_date = {};
            if (startDate) filter.expense_date.$gte = new Date(startDate);
            if (endDate) {
                const toDate = new Date(endDate);
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
            category: expense.category,
            amount: toNumber(expense.amount),
            notes: expense.notes,
            method: expense.method,
            details: expense.details,
            project_id: expense.project_id,
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