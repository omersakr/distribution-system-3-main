// Utilities are loaded via utils/index.js - no need to redefine common functions

// State
let currentPage = 1;
let currentFilters = {};
let expenseCategories = [];
let projectsData = [];

// Load projects for dropdown
async function loadProjects() {
    try {
        console.log('Loading projects from API');
        projectsData = await loadProjectsData();
        console.log('Processed projects data:', projectsData);

        populateProjectDropdowns();
    } catch (error) {
        console.error('Error loading projects:', error);
        // Show user-friendly message
        showMessage('expenseMessage', 'تعذر تحميل قائمة المشاريع. يرجى المحاولة مرة أخرى.', 'error');
    }
}

function populateProjectDropdowns() {
    const selects = ['expenseProject', 'editExpenseProject'];

    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;

        select.innerHTML = '<option value="">اختر المشروع (اختياري)</option>';

        if (projectsData && projectsData.length > 0) {
            projectsData.forEach(project => {
                const option = document.createElement('option');
                option.value = project.id || project._id;
                option.textContent = project.name || project.client_name || `مشروع ${project.id}`;
                select.appendChild(option);
            });
        } else {
            console.warn('No projects data available');
        }
    });
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

        console.log('Loading expenses with params:', params.toString());
        const data = await apiGet(`/expenses?${params}`);
        console.log('Expenses data received:', data);

        // Store categories for dropdowns if available
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
                <button class="btn btn-primary" onclick="loadExpenses()">إعادة المحاولة</button>
            </div>
        `;
    }
}

async function loadExpenseStats() {
    try {
        console.log('Loading expense stats from API');

        const stats = await apiGet('/expenses/stats');
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
    return await apiPost('/expenses', expenseData);
}

async function updateExpense(id, expenseData) {
    return await apiPut(`/expenses/${id}`, expenseData);
}

async function deleteExpense(id) {
    return await apiDelete(`/expenses/${id}`);
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
                <button class="btn btn-primary" onclick="document.getElementById('addExpenseBtn').click()">إضافة أول مصروف</button>
            </div>
        `;
        return;
    }

    console.log('Rendering expenses:', expenses);
    console.log('Available projects:', projectsData);

    const table = document.createElement('table');
    table.className = 'table';

    // Header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = ['التاريخ', 'المشروع', 'الوصف', 'المبلغ', 'ملاحظات', 'الإجراءات'];

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
        dateCell.textContent = formatDateShort(expense.expense_date);
        row.appendChild(dateCell);

        // Project
        const projectCell = document.createElement('td');
        if (expense.project_id) {
            // Convert both IDs to strings for comparison
            const expenseProjectId = String(expense.project_id);
            const project = projectsData.find(p => {
                const projectId = String(p.id || p._id);
                return projectId === expenseProjectId;
            });

            if (project) {
                projectCell.textContent = project.name || project.client_name || 'مشروع بدون اسم';
            } else {
                projectCell.textContent = 'مشروع محذوف';
                console.warn('Project not found for expense:', expense.id, 'project_id:', expense.project_id);
            }
        } else {
            projectCell.textContent = 'غير محدد';
            projectCell.className = 'text-muted';
        }
        row.appendChild(projectCell);

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

    // Convert date to YYYY-MM-DD format for date input
    const expenseDate = expense.expense_date ? new Date(expense.expense_date).toISOString().split('T')[0] : '';
    document.getElementById('editExpenseDate').value = expenseDate;

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

        const projectValue = document.getElementById('expenseProject').value;
        const expenseData = {
            project_id: projectValue || null, // Allow null for no project
            expense_date: document.getElementById('expenseDate').value,
            description: document.getElementById('expenseDescription').value,
            amount: document.getElementById('expenseAmount').value,
            notes: document.getElementById('expenseNotes').value
        };

        console.log('Submitting expense data:', expenseData);

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
            console.error('Error adding expense:', error);
            showMessage('expenseMessage', error.message, 'error');
        }
    });

    // Edit Expense Form
    document.getElementById('editExpenseForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('editExpenseId').value;
        const projectValue = document.getElementById('editExpenseProject').value;
        const expenseData = {
            project_id: projectValue || null, // Allow null for no project
            expense_date: document.getElementById('editExpenseDate').value,
            description: document.getElementById('editExpenseDescription').value,
            amount: document.getElementById('editExpenseAmount').value,
            notes: document.getElementById('editExpenseNotes').value
        };

        console.log('Updating expense data:', expenseData);

        try {
            await updateExpense(id, expenseData);
            showMessage('editExpenseMessage', 'تم تحديث المصروف بنجاح', 'success');

            setTimeout(() => {
                closeModal('editExpenseModal');
                loadExpenses(currentPage, currentFilters);
                loadExpenseStats();
            }, 1000);
        } catch (error) {
            console.error('Error updating expense:', error);
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
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Expenses page initializing...');

    // Check authentication first
    if (!authManager.checkAuth()) {
        console.log('Authentication failed, redirecting...');
        return;
    }

    console.log('Authentication successful, setting up page...');

    try {
        setupEventHandlers();
        console.log('Event handlers set up');

        // Load projects first, then load expenses and stats in parallel
        await loadProjects();
        console.log('Projects loaded, now loading expenses and stats');

        await Promise.all([
            loadExpenses(),
            loadExpenseStats()
        ]);

        console.log('All data loaded successfully');
    } catch (error) {
        console.error('Error during initialization:', error);
        showMessage('expenseMessage', 'حدث خطأ أثناء تحميل الصفحة. يرجى إعادة تحميل الصفحة.', 'error');
    }
});

// Make closeModal available globally for onclick handlers
window.closeModal = closeModal;