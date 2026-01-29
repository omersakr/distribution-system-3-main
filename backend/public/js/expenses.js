const API_BASE = (function () {
    if (window.__API_BASE__) return window.__API_BASE__;
    try {
        const origin = window.location.origin;
        if (!origin || origin === 'null') return 'http://localhost:5000/api';
        return origin.replace(/\/$/, '') + '/api';
    } catch (e) {
        return 'http://localhost:5000/api';
    }
})();

// State
let currentPage = 1;
let currentFilters = {};
let expenseCategories = [];
let projectsData = [];

// Load projects for dropdown
async function loadProjects() {
    try {
        const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/projects`);
        if (!response.ok) {
            throw new Error('فشل في تحميل المشاريع');
        }

        const data = await response.json();
        projectsData = data.projects || data.data || [];
        populateProjectDropdowns();
    } catch (error) {
        console.error('Error loading projects:', error);
    }
}

function populateProjectDropdowns() {
    const selects = ['expenseProject', 'editExpenseProject'];

    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;

        select.innerHTML = '<option value="">اختر المشروع</option>';

        projectsData.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            select.appendChild(option);
        });
    });
}

// Helpers
function formatCurrency(amount) {
    return Number(amount || 0).toLocaleString('ar-EG', {
        style: 'currency',
        currency: 'EGP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function showMessage(elementId, message, type) {
    const msgDiv = document.getElementById(elementId);
    if (msgDiv) {
        msgDiv.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
        setTimeout(() => {
            msgDiv.innerHTML = '';
        }, 5000);
    }
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// API Functions
async function loadExpenses(page = 1, filters = {}) {
    try {
        const params = new URLSearchParams();
        params.set('page', page);
        params.set('limit', 20);

        Object.keys(filters).forEach(key => {
            if (filters[key] && filters[key] !== 'all') {
                params.set(key, filters[key]);
            }
        });

        const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/expenses?${params}`);
        if (!response.ok) {
            throw new Error('فشل في تحميل المصروفات');
        }

        const data = await response.json();

        // Store categories for dropdowns
        if (data.categories) {
            expenseCategories = data.categories;
            populateCategories();
        }

        renderExpenses(data.expenses || data.data || []);
        renderPagination(data.pagination);

        return data;
    } catch (error) {
        console.error('Error loading expenses:', error);
        document.getElementById('expensesContainer').innerHTML = `
            <div class="error">
                <h3>خطأ في تحميل المصروفات</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

async function loadExpenseStats() {
    try {
        console.log('Loading expense stats from:', `${API_BASE}/expenses/stats`);

        const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/expenses/stats`);
        if (!response.ok) {
            throw new Error('فشل في تحميل إحصائيات المصروفات');
        }

        const stats = await response.json();
        console.log('Received stats:', stats);
        console.log('monthlyTrend type:', typeof stats.monthlyTrend);
        console.log('monthlyTrend isArray:', Array.isArray(stats.monthlyTrend));
        console.log('monthlyTrend value:', stats.monthlyTrend);

        renderStats(stats);
    } catch (error) {
        console.error('Error loading expense stats:', error);
        document.getElementById('totalExpensesValue').textContent = 'خطأ';
        document.getElementById('monthlyExpensesValue').textContent = 'خطأ';
        document.getElementById('expensesCountValue').textContent = 'خطأ';
    }
}

async function addExpense(expenseData) {
    const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'فشل في إضافة المصروف');
    }

    return response.json();
}

async function updateExpense(id, expenseData) {
    const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/expenses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'فشل في تحديث المصروف');
    }

    return response.json();
}

async function deleteExpense(id) {
    const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/expenses/${id}`, {
        method: 'DELETE'
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'فشل في حذف المصروف');
    }

    return response.json();
}

// Render Functions
function renderStats(stats) {
    console.log('Rendering stats:', stats);

    document.getElementById('totalExpensesValue').textContent = formatCurrency(stats.totalExpenses);

    // Ensure monthlyTrend is an array
    const monthlyTrend = Array.isArray(stats.monthlyTrend) ? stats.monthlyTrend : [];
    console.log('Monthly trend data:', monthlyTrend);

    // Calculate current month expenses
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const currentMonthExpenses = monthlyTrend.find(m => m.month === currentMonth);
    document.getElementById('monthlyExpensesValue').textContent =
        formatCurrency(currentMonthExpenses ? currentMonthExpenses.total : 0);

    // Calculate total count
    const totalCount = monthlyTrend.reduce((sum, m) => sum + (m.count || 0), 0);
    document.getElementById('expensesCountValue').textContent = totalCount;
}

function renderExpenses(expenses) {
    const container = document.getElementById('expensesContainer');

    if (!expenses || expenses.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">💰</div>
                <div>لا توجد مصروفات مسجلة</div>
            </div>
        `;
        return;
    }

    const table = document.createElement('table');
    table.className = 'table';

    // Header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = ['التاريخ', 'الوصف', 'المبلغ', 'ملاحظات', 'الإجراءات'];

    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');
    expenses.forEach(expense => {
        const row = document.createElement('tr');

        // Date
        const dateCell = document.createElement('td');
        dateCell.textContent = formatDate(expense.expense_date);
        row.appendChild(dateCell);

        // Description
        const descCell = document.createElement('td');
        descCell.textContent = expense.description;
        row.appendChild(descCell);

        // Amount
        const amountCell = document.createElement('td');
        amountCell.textContent = formatCurrency(expense.amount);
        amountCell.className = 'text-danger';
        row.appendChild(amountCell);

        // Notes
        const notesCell = document.createElement('td');
        notesCell.textContent = expense.notes || '-';
        row.appendChild(notesCell);

        // Actions
        const actionsCell = document.createElement('td');
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-sm btn-secondary';
        editBtn.textContent = 'تعديل';
        editBtn.onclick = () => editExpense(expense);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-sm btn-danger';
        deleteBtn.textContent = 'حذف';
        deleteBtn.onclick = () => confirmDeleteExpense(expense.id);
        deleteBtn.style.marginRight = '8px';

        actionsCell.appendChild(editBtn);
        actionsCell.appendChild(deleteBtn);
        row.appendChild(actionsCell);

        tbody.appendChild(row);
    });
    table.appendChild(tbody);

    container.innerHTML = '';
    container.appendChild(table);
}

function renderPagination(pagination) {
    const container = document.getElementById('paginationContainer');

    if (!pagination || pagination.pages <= 1) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = '';

    // Previous button
    if (pagination.page > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.className = 'pagination-btn';
        prevBtn.textContent = 'السابق';
        prevBtn.onclick = () => {
            currentPage = pagination.page - 1;
            loadExpenses(currentPage, currentFilters);
        };
        container.appendChild(prevBtn);
    }

    // Page info
    const pageInfo = document.createElement('span');
    pageInfo.className = 'pagination-info';
    pageInfo.textContent = `صفحة ${pagination.page} من ${pagination.pages}`;
    container.appendChild(pageInfo);

    // Next button
    if (pagination.page < pagination.pages) {
        const nextBtn = document.createElement('button');
        nextBtn.className = 'pagination-btn';
        nextBtn.textContent = 'التالي';
        nextBtn.onclick = () => {
            currentPage = pagination.page + 1;
            loadExpenses(currentPage, currentFilters);
        };
        container.appendChild(nextBtn);
    }
}

function populateCategories() {
    const selects = ['categoryFilter', 'expenseCategory', 'editExpenseCategory'];

    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;

        // Clear existing options (except first one for filters)
        if (selectId === 'categoryFilter') {
            select.innerHTML = '<option value="all">جميع الفئات</option>';
        } else {
            select.innerHTML = '<option value="">اختر الفئة</option>';
        }

        // Add category options
        expenseCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            select.appendChild(option);
        });
    });
}

function editExpense(expense) {
    document.getElementById('editExpenseId').value = expense.id;
    document.getElementById('editExpenseProject').value = expense.project_id || '';
    document.getElementById('editExpenseDate').value = expense.expense_date;
    document.getElementById('editExpenseDescription').value = expense.description;
    document.getElementById('editExpenseAmount').value = expense.amount;
    document.getElementById('editExpenseNotes').value = expense.notes || '';

    showModal('editExpenseModal');
}

function confirmDeleteExpense(id) {
    if (confirm('هل أنت متأكد من حذف هذا المصروف؟')) {
        deleteExpenseById(id);
    }
}

async function deleteExpenseById(id) {
    try {
        await deleteExpense(id);
        showMessage('expenseMessage', 'تم حذف المصروف بنجاح', 'success');
        loadExpenses(currentPage, currentFilters);
        loadExpenseStats();
    } catch (error) {
        showMessage('expenseMessage', error.message, 'error');
    }
}

// Event Handlers
function setupEventHandlers() {
    // Add Expense Button
    document.getElementById('addExpenseBtn').addEventListener('click', () => {
        // Set today's date as default
        document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];
        showModal('expenseModal');
    });

    // Add Expense Form
    document.getElementById('expenseForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const expenseData = {
            project_id: document.getElementById('expenseProject').value,
            expense_date: document.getElementById('expenseDate').value,
            description: document.getElementById('expenseDescription').value,
            amount: document.getElementById('expenseAmount').value,
            notes: document.getElementById('expenseNotes').value
        };

        try {
            await addExpense(expenseData);
            showMessage('expenseMessage', 'تم إضافة المصروف بنجاح', 'success');

            // Reset form
            document.getElementById('expenseForm').reset();

            setTimeout(() => {
                closeModal('expenseModal');
                loadExpenses(currentPage, currentFilters);
                loadExpenseStats();
            }, 1000);
        } catch (error) {
            showMessage('expenseMessage', error.message, 'error');
        }
    });

    // Edit Expense Form
    document.getElementById('editExpenseForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('editExpenseId').value;
        const expenseData = {
            project_id: document.getElementById('editExpenseProject').value,
            expense_date: document.getElementById('editExpenseDate').value,
            description: document.getElementById('editExpenseDescription').value,
            amount: document.getElementById('editExpenseAmount').value,
            notes: document.getElementById('editExpenseNotes').value
        };

        try {
            await updateExpense(id, expenseData);
            showMessage('editExpenseMessage', 'تم تحديث المصروف بنجاح', 'success');

            setTimeout(() => {
                closeModal('editExpenseModal');
                loadExpenses(currentPage, currentFilters);
                loadExpenseStats();
            }, 1000);
        } catch (error) {
            showMessage('editExpenseMessage', error.message, 'error');
        }
    });

    // Apply Filters
    document.getElementById('applyFiltersBtn').addEventListener('click', () => {
        currentFilters = {
            category: document.getElementById('categoryFilter').value,
            start_date: document.getElementById('startDateFilter').value,
            end_date: document.getElementById('endDateFilter').value,
            sort: document.getElementById('sortFilter').value
        };

        currentPage = 1;
        loadExpenses(currentPage, currentFilters);
    });

    // Clear Filters
    document.getElementById('clearFiltersBtn').addEventListener('click', () => {
        document.getElementById('categoryFilter').value = 'all';
        document.getElementById('startDateFilter').value = '';
        document.getElementById('endDateFilter').value = '';
        document.getElementById('sortFilter').value = 'date-desc';

        currentFilters = {};
        currentPage = 1;
        loadExpenses(currentPage, currentFilters);
    });

    // Modal close on backdrop click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication first
    if (!authManager.checkAuth()) {
        return;
    }

    setupEventHandlers();
    loadProjects();
    loadExpenses();
    loadExpenseStats();
});

// Make closeModal available globally for onclick handlers
window.closeModal = closeModal;