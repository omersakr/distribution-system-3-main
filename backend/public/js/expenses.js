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
    showInlineLoader('expensesContainer', 'جاري تحميل المصروفات...');
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

    // Format numbers without currency symbol for display
    const totalExpenses = Number(stats.totalExpenses || 0).toLocaleString('ar-EG', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
    document.getElementById('totalExpensesValue').textContent = totalExpenses;

    // Ensure monthlyTrend is an array
    const monthlyTrend = Array.isArray(stats.monthlyTrend) ? stats.monthlyTrend : [];
    console.log('Monthly trend data:', monthlyTrend);

    // Calculate current month expenses
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const currentMonthExpenses = monthlyTrend.find(m => m.month === currentMonth);
    const monthlyExpensesValue = Number(currentMonthExpenses ? currentMonthExpenses.total : 0).toLocaleString('ar-EG', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
    document.getElementById('monthlyExpensesValue').textContent = monthlyExpensesValue;

    // Calculate total count
    const totalCount = monthlyTrend.reduce((sum, m) => sum + (m.count || 0), 0);
    document.getElementById('expensesCountValue').textContent = totalCount;
}

// Create expense row with new table design
function createExpenseRow(expense) {
    const row = document.createElement('div');
    row.className = 'group bg-surface-container-lowest p-6 rounded-2xl editorial-shadow border border-slate-50 grid grid-cols-12 gap-4 items-center hover:border-primary/20 transition-all duration-300';

    // Date column
    const dateCol = document.createElement('div');
    dateCol.className = 'col-span-1';
    const dateText = document.createElement('p');
    dateText.className = 'text-xs font-bold text-slate-800';
    dateText.textContent = formatDateShort(expense.expense_date);
    dateCol.appendChild(dateText);

    // Amount column
    const amountCol = document.createElement('div');
    amountCol.className = 'col-span-2';
    const amountText = document.createElement('span');
    amountText.className = 'text-lg font-black font-headline text-slate-800';
    amountText.textContent = Number(expense.amount || 0).toLocaleString('ar-EG', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
    amountCol.appendChild(amountText);

    // Project column
    const projectCol = document.createElement('div');
    projectCol.className = 'col-span-2';
    if (expense.project_id) {
        const expenseProjectId = String(expense.project_id);
        const project = projectsData.find(p => {
            const projectId = String(p.id || p._id);
            return projectId === expenseProjectId;
        });

        if (project) {
            const projectName = document.createElement('span');
            projectName.className = 'text-sm font-medium text-slate-700';
            projectName.textContent = project.name || project.client_name || 'مشروع';
            projectCol.appendChild(projectName);
        } else {
            const noProject = document.createElement('span');
            noProject.className = 'text-sm text-slate-400';
            noProject.textContent = '—';
            projectCol.appendChild(noProject);
        }
    } else {
        const noProject = document.createElement('span');
        noProject.className = 'text-sm text-slate-400';
        noProject.textContent = '—';
        projectCol.appendChild(noProject);
    }

    // Description column
    const descCol = document.createElement('div');
    descCol.className = 'col-span-4';
    const descText = document.createElement('p');
    descText.className = 'text-sm font-medium text-slate-800 mb-1';
    descText.textContent = expense.description;
    descCol.appendChild(descText);
    
    if (expense.notes) {
        const notesText = document.createElement('p');
        notesText.className = 'text-xs text-slate-500 line-clamp-1';
        notesText.textContent = expense.notes;
        descCol.appendChild(notesText);
    }

    // Actions column
    const actionsCol = document.createElement('div');
    actionsCol.className = 'col-span-3 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity';

    const editBtn = document.createElement('button');
    editBtn.className = 'w-9 h-9 flex items-center justify-center rounded-lg bg-surface-container-high text-primary hover:bg-primary-container transition-colors';
    editBtn.innerHTML = '<span class="material-symbols-outlined text-lg" data-icon="edit">edit</span>';
    editBtn.onclick = (e) => {
        e.stopPropagation();
        editExpense(expense);
    };

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'w-9 h-9 flex items-center justify-center rounded-lg bg-surface-container-high text-error hover:bg-error-container hover:text-white transition-colors';
    deleteBtn.innerHTML = '<span class="material-symbols-outlined text-lg" data-icon="delete">delete</span>';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        confirmDeleteExpense(expense.id);
    };

    actionsCol.appendChild(editBtn);
    actionsCol.appendChild(deleteBtn);

    // Append all columns
    row.appendChild(dateCol);
    row.appendChild(amountCol);
    row.appendChild(projectCol);
    row.appendChild(descCol);
    row.appendChild(actionsCol);

    return row;
}

function renderExpenses(expenses) {
    const container = document.getElementById('expensesContainer');

    // Keep the header row
    const headerRow = container.querySelector('.px-6.py-3.bg-surface-container-high\\/40');
    
    if (!expenses || expenses.length === 0) {
        container.innerHTML = '';
        if (headerRow) container.appendChild(headerRow);
        
        const emptyState = document.createElement('div');
        emptyState.className = 'bg-surface-container-lowest p-16 rounded-xl shadow-sm border border-dashed border-outline-variant/50 flex flex-col items-center justify-center text-center';
        emptyState.innerHTML = `
            <div class="w-20 h-20 bg-surface-container-low rounded-full flex items-center justify-center mb-4 text-outline-variant">
                <span class="material-symbols-outlined text-4xl">folder_off</span>
            </div>
            <p class="text-on-surface-variant font-medium">لا توجد مصروفات مسجلة</p>
            <p class="text-xs text-outline mt-1">ابدأ بإضافة أول مصروف</p>
        `;
        container.appendChild(emptyState);
        return;
    }

    console.log('Rendering expenses:', expenses);
    console.log('Available projects:', projectsData);

    container.innerHTML = '';
    if (headerRow) container.appendChild(headerRow);
    
    expenses.forEach(expense => {
        container.appendChild(createExpenseRow(expense));
    });
}

function renderPagination(pagination) {
    const container = document.getElementById('paginationContainer');

    if (!pagination || pagination.pages <= 1) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <div class="flex justify-between items-center bg-surface-container-lowest p-4 rounded-xl editorial-shadow">
            <p class="text-xs text-on-surface-variant font-medium">عرض ${pagination.limit} من أصل ${pagination.total} مصروف</p>
            <div class="flex gap-2" id="paginationButtons"></div>
        </div>
    `;

    const buttonsContainer = container.querySelector('#paginationButtons');

    // Previous button
    if (pagination.page > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.className = 'w-8 h-8 flex items-center justify-center rounded-lg bg-surface-container-low text-slate-400 hover:bg-slate-200 transition-colors';
        prevBtn.innerHTML = '<span class="material-symbols-outlined text-sm" data-icon="chevron_right">chevron_right</span>';
        prevBtn.onclick = () => {
            currentPage = pagination.page - 1;
            loadExpenses(currentPage, currentFilters);
        };
        buttonsContainer.appendChild(prevBtn);
    }

    // Page numbers
    const maxPages = Math.min(pagination.pages, 3);
    for (let i = 1; i <= maxPages; i++) {
        const pageBtn = document.createElement('button');
        if (i === pagination.page) {
            pageBtn.className = 'w-8 h-8 flex items-center justify-center rounded-lg bg-primary text-white text-xs font-bold';
        } else {
            pageBtn.className = 'w-8 h-8 flex items-center justify-center rounded-lg bg-surface-container-low text-slate-600 text-xs font-bold hover:bg-slate-200';
        }
        pageBtn.textContent = i;
        pageBtn.onclick = () => {
            currentPage = i;
            loadExpenses(currentPage, currentFilters);
        };
        buttonsContainer.appendChild(pageBtn);
    }

    // Next button
    if (pagination.page < pagination.pages) {
        const nextBtn = document.createElement('button');
        nextBtn.className = 'w-8 h-8 flex items-center justify-center rounded-lg bg-surface-container-low text-slate-400 hover:bg-slate-200 transition-colors';
        nextBtn.innerHTML = '<span class="material-symbols-outlined text-sm" data-icon="chevron_left">chevron_left</span>';
        nextBtn.onclick = () => {
            currentPage = pagination.page + 1;
            loadExpenses(currentPage, currentFilters);
        };
        buttonsContainer.appendChild(nextBtn);
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

async function confirmDeleteExpense(id) {
    const confirmed = await showConfirmDialog(
        'تأكيد الحذف',
        'هل أنت متأكد من حذف هذا المصروف؟',
        'نعم، احذف',
        'إلغاء'
    );
    
    if (confirmed) {
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
            category: 'تشغيلية', // All expenses are operational
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
            category: 'تشغيلية', // All expenses are operational
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