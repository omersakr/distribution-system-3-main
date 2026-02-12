// Utilities are loaded via separate script tags - no need to redefine common functions

// Global variables
let currentClientId = null;
let currentClient = null;
let currentProjectId = null; // Add project ID tracking

// --- Helpers ---

function formatDateTime(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleString('ar-EG');
}

// --- Project Data Loading ---

async function loadProjectDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    currentClientId = urlParams.get('client_id');

    if (!currentClientId) {
        Swal.fire({
            icon: 'error',
            title: 'خطأ',
            text: 'معرف المشروع غير موجود'
        }).then(() => {
            window.location.href = 'projects.html';
        });
        return;
    }

    try {
        // Load client details
        const clientData = await apiGet(`/clients/${currentClientId}`);
        currentClient = clientData.client;

        // Load the associated project to get project_id
        const projectsData = await apiGet(`/projects?client_id=${currentClientId}`);
        const projects = projectsData.projects || [];

        if (projects.length > 0) {
            currentProjectId = projects[0].id; // Get the first matching project
        }

        // Load project financial data
        await Promise.all([
            displayClientInfo(currentClient),
            displayFinancialSummary(),
            loadProjectExpenses(),
            loadCapitalInjections(),
            loadWithdrawals(),
            loadAssignedEmployees()
        ]);

    } catch (error) {
        console.error('Error loading project details:', error);
        Swal.fire({
            icon: 'error',
            title: 'خطأ',
            text: 'تعذر تحميل بيانات المشروع'
        });
    }
}

function displayClientInfo(client) {
    document.getElementById('projectName').textContent = `المشروع المالي: ${client.name}`;

    const infoContainer = document.getElementById('clientInfo');
    infoContainer.innerHTML = `
        <div class="info-item">
            <span class="info-label">اسم العميل:</span>
            <span class="info-value">${client.name}</span>
        </div>
        <div class="info-item">
            <span class="info-label">رقم الهاتف:</span>
            <span class="info-value">${client.phone || '—'}</span>
        </div>
        <div class="info-item">
            <span class="info-label">الرصيد الافتتاحي:</span>
            <span class="info-value">${formatCurrency(client.opening_balance || 0)}</span>
        </div>
        <div class="info-item">
            <span class="info-label">تاريخ الإنشاء:</span>
            <span class="info-value">${formatDate(client.created_at)}</span>
        </div>
    `;
}

async function displayFinancialSummary() {
    try {
        // Get client financial summary
        const data = await apiGet(`/clients/${currentClientId}`);
        const client = data.client;
        const totals = data.totals || {};

        // Get totals from the response
        const totalDeliveries = totals.totalDeliveries || 0;
        const totalPayments = totals.totalPayments || 0;
        const totalAdjustments = totals.totalAdjustments || 0;
        const openingBalance = totals.openingBalance || client.opening_balance || 0;
        const balance = totals.balance || 0;

        // Get project-specific financial data
        let totalExpenses = 0;
        let totalCapitalInjections = 0;
        let totalWithdrawals = 0;

        // Load expenses for this project
        try {
            const expensesData = await apiGet(`/expenses?project_id=${currentClientId}`);
            const expenses = expensesData.expenses || [];
            totalExpenses = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
        } catch (error) {
            console.error('Error loading expenses for summary:', error);
        }

        // Load capital injections for this project
        if (currentProjectId) {
            try {
                const injectionsData = await apiGet('/administration/capital-injections');
                const allInjections = injectionsData.capital_injections || injectionsData.capitalInjections || [];
                const projectInjections = allInjections.filter(inj => inj.project_id === currentProjectId);
                totalCapitalInjections = projectInjections.reduce((sum, inj) => sum + (inj.amount || 0), 0);
            } catch (error) {
                console.error('Error loading capital injections for summary:', error);
            }

            // Load withdrawals for this project
            try {
                const withdrawalsData = await apiGet('/administration/withdrawals');
                const allWithdrawals = withdrawalsData.withdrawals || [];
                const projectWithdrawals = allWithdrawals.filter(w => w.project_id === currentProjectId);
                totalWithdrawals = projectWithdrawals.reduce((sum, w) => sum + (w.amount || 0), 0);
            } catch (error) {
                console.error('Error loading withdrawals for summary:', error);
            }
        }

        const summaryContainer = document.getElementById('financialSummary');

        // Calculate capital difference
        // Capital injections should cover: deliveries + withdrawals + expenses
        const totalUsage = totalDeliveries + totalWithdrawals + totalExpenses + openingBalance + totalAdjustments;
        const capitalDifference = totalCapitalInjections - totalUsage;

        // Calculate net profit including opening balance and adjustments
        // Net profit = payments - (deliveries + withdrawals + expenses + opening_balance + adjustments)
        const netProfit = totalPayments - (totalUsage);

        summaryContainer.innerHTML = `
        <div class="summary-item">
            <div class="summary-value">${formatCurrency(totalCapitalInjections)}</div>
            <div class="summary-label">رأس المال </div>
        </div>
            <div class="summary-item">
                <div class="summary-value">${formatCurrency(totalDeliveries)}</div>
                <div class="summary-label">إجمالي التسليمات</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${formatCurrency(totalPayments)}</div>
                <div class="summary-label">إجمالي المدفوعات</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${formatCurrency(totalExpenses)}</div>
                <div class="summary-label">المصروفات المرتبطة</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${formatCurrency(totalWithdrawals)}</div>
                <div class="summary-label">المسحوبات</div>
            </div>
           
            <div class="summary-item">
                <div class="summary-value" style="color: ${capitalDifference < 0 ? '#dc2626' : '#16a34a'}">
                    ${capitalDifference === 0 ? 'متوازن' : formatCurrency(Math.abs(capitalDifference))}
                </div>
                <div class="summary-label">
                    ${capitalDifference === 0 ? 'رصيد رأس المال' : (capitalDifference > 0 ? 'فائض رأس المال' : 'عجز رأس المال')}
                </div>
            </div>
            <div class="summary-item">
                <div class="summary-value" style="color: ${netProfit < 0 ? '#dc2626' : '#16a34a'}">
                    ${formatCurrency(Math.abs(netProfit))}
                </div>
                <div class="summary-label">
                    ${netProfit >= 0 ? 'صافي الربح' : 'صافي الخسارة'}
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading financial summary:', error);
    }
}

async function loadProjectExpenses() {
    try {
        // Load expenses related to this project (client)
        const data = await apiGet(`/expenses?project_id=${currentClientId}`);
        const expenses = data.expenses || [];

        displayExpenses(expenses);
    } catch (error) {
        console.error('Error loading project expenses:', error);
        displayExpenses([]);
    }
}

function displayExpenses(expenses) {
    const tbody = document.getElementById('expensesTableBody');

    if (!expenses || expenses.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-state">لا توجد مصروفات مرتبطة بهذا المشروع</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = expenses.map(expense => `
        <tr>
            <td>${formatDateShort(expense.expense_date || expense.date)}</td>
            <td>${expense.description || '—'}</td>
            <td>${formatCurrency(expense.amount)}</td>
            <td>${expense.notes || '—'}</td>
        </tr>
    `).join('');
}

async function loadCapitalInjections() {
    try {
        // Load capital injections (from administration)
        const data = await apiGet('/administration/capital-injections');
        const allInjections = data.capital_injections || data.capitalInjections || [];

        // Filter by current project (not client)
        const injections = allInjections.filter(injection =>
            injection.project_id === currentProjectId
        );

        displayCapitalInjections(injections);
    } catch (error) {
        console.error('Error loading capital injections:', error);
        displayCapitalInjections([]);
    }
}

function displayCapitalInjections(injections) {
    const tbody = document.getElementById('capitalInjectionsTableBody');

    if (!injections || injections.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-state">لا توجد حقن رأسمالية</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = injections.map(injection => `
        <tr>
            <td>${formatCurrency(injection.amount)}</td>
            <td>${injection.administration_name || '—'}</td>
            <td>${formatDate(injection.date)}</td>
            <td>${injection.notes || '—'}</td>
        </tr>
    `).join('');
}

async function loadWithdrawals() {
    try {
        // Load withdrawals (from administration)
        const data = await apiGet('/administration/withdrawals');
        const allWithdrawals = data.withdrawals || [];

        // Filter by current project (not client)
        const withdrawals = allWithdrawals.filter(withdrawal =>
            withdrawal.project_id === currentProjectId
        );

        displayWithdrawals(withdrawals);
    } catch (error) {
        console.error('Error loading withdrawals:', error);
        displayWithdrawals([]);
    }
}

function displayWithdrawals(withdrawals) {
    const tbody = document.getElementById('withdrawalsTableBody');

    if (!withdrawals || withdrawals.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-state">لا توجد سحوبات</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = withdrawals.map(withdrawal => `
        <tr>
            <td>${formatCurrency(withdrawal.amount)}</td>
            <td>${withdrawal.administration_name || '—'}</td>
            <td>${formatDate(withdrawal.date)}</td>
            <td>${withdrawal.notes || '—'}</td>
        </tr>
    `).join('');
}

async function loadAssignedEmployees() {
    try {
        // Load employees assigned to this project (client)
        const data = await apiGet('/employees');
        const allEmployees = data.employees || [];

        // Filter employees assigned to this project
        const assignedEmployees = allEmployees.filter(employee => {
            return employee.all_projects ||
                (employee.assigned_projects && employee.assigned_projects.includes(currentClientId));
        });

        displayAssignedEmployees(assignedEmployees);
    } catch (error) {
        console.error('Error loading assigned employees:', error);
        displayAssignedEmployees([]);
    }
}

function displayAssignedEmployees(employees) {
    const tbody = document.getElementById('employeesTableBody');

    if (!employees || employees.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">لا توجد موظفين مخصصين لهذا المشروع</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = employees.map(employee => `
        <tr>
            <td>
                <a href="employee-details.html?id=${employee.id}" class="link">
                    ${employee.name}
                </a>
            </td>
            <td>${employee.job_title || '—'}</td>
            <td>${employee.all_projects ? 'جميع المشاريع' : 'مشاريع محددة'}</td>
            <td>${employee.basic_salary || employee.base_salary ? formatCurrency(employee.basic_salary || employee.base_salary) : '—'}</td>
            <td>
                <span class="status-${employee.status.toLowerCase()}">
                    ${employee.status === 'Active' ? 'نشط' : 'غير نشط'}
                </span>
            </td>
        </tr>
    `).join('');
}

// --- Event Listeners ---

document.addEventListener('DOMContentLoaded', function () {
    // Load project details on page load
    loadProjectDetails();

    // Make currentClientId available globally for onclick handlers
    window.currentClientId = currentClientId;
});