// Utilities are loaded via separate script tags - no need to redefine common functions

// Global variables
let currentClientId = null;
let currentClient = null;
let currentProjectId = null;

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
        const clientData = await apiGet(`/clients/${currentClientId}`);
        currentClient = clientData.client;

        const projectsData = await apiGet(`/projects?client_id=${currentClientId}`);
        const projects = projectsData.projects || [];

        if (projects.length > 0) {
            currentProjectId = projects[0].id;
        }

        await Promise.all([
            displayClientInfo(currentClient),
            displayDetailedFinancialCards(),
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

async function displayDetailedFinancialCards() {
    try {
        const data = await apiGet(`/clients/${currentClientId}`);
        const client = data.client;
        const deliveries = data.deliveries || [];
        const totals = data.totals || {};

        const openingBalance = totals.openingBalance || client.opening_balance || 0;
        const totalAdjustments = totals.totalAdjustments || 0;
        const totalPayments = totals.totalPayments || 0;

        let materialCosts = 0;
        let contractorCosts = 0;
        let totalRevenue = 0;

        deliveries.forEach(delivery => {
            const netQuantity = (delivery.net_quantity || delivery.quantity || 0);
            const quantity = delivery.quantity || 0;
            materialCosts += (delivery.material_price_at_time || 0) * netQuantity;
            contractorCosts += (delivery.contractor_charge_per_meter || 0) * netQuantity;
            totalRevenue += (delivery.price_per_meter || 0) * quantity;
        });

        let totalExpenses = 0;
        let administrativeExpenses = 0;
        let salaries = 0;
        let operationalExpenses = 0;

        try {
            const expensesData = await apiGet(`/expenses?project_id=${currentClientId}`);
            const expenses = expensesData.expenses || [];
            expenses.forEach(expense => {
                const amount = expense.amount || 0;
                totalExpenses += amount;
                const category = (expense.category || '').toLowerCase();
                if (category.includes('إدار') || category.includes('admin')) {
                    administrativeExpenses += amount;
                } else if (category.includes('رواتب') || category.includes('salary')) {
                    salaries += amount;
                } else {
                    operationalExpenses += amount;
                }
            });
        } catch (error) {
            console.error('Error loading expenses:', error);
        }

        let totalCapitalInjections = 0;
        if (currentProjectId) {
            try {
                const injectionsData = await apiGet('/administration/capital-injections');
                const allInjections = injectionsData.capital_injections || injectionsData.capitalInjections || [];
                const projectInjections = allInjections.filter(inj => inj.project_id === currentProjectId);
                totalCapitalInjections = projectInjections.reduce((sum, inj) => sum + (inj.amount || 0), 0);
            } catch (error) {
                console.error('Error loading capital injections:', error);
            }
        }

        const receivables = openingBalance + totalAdjustments;
        const netPosition = totalCapitalInjections - totalExpenses - materialCosts - contractorCosts - receivables;

        document.getElementById('capitalCard').innerHTML = `
            <div class="card-line revenue">
                <span class="card-line-value positive">${formatCurrency(totalCapitalInjections)}</span>
                <span class="card-line-label">إجمالي رأس المال الفعلي:</span>
            </div>
           
            <div class="card-line expense">
                <span class="card-line-value negative">${formatCurrency(totalExpenses)}</span>
                <span class="card-line-label">إجمالي المصروفات/الخصومات:</span>
            </div>
            <div class="card-line expense">
                <span class="card-line-value negative">${formatCurrency(materialCosts)}</span>
                <span class="card-line-label">المواد: إجمالي + مصاريف + مرتبات:</span>
            </div>
            <div class="card-line expense">
                <span class="card-line-value negative">${formatCurrency(contractorCosts)}</span>
                <span class="card-line-label">تشغيلية + مرتبات:</span>
            </div>
            <div class="card-line expense">
                <span class="card-line-value negative">${formatCurrency(receivables)}</span>
                <span class="card-line-label">إجمالي المتبقي (في حالة فترة + تحويل):</span>
            </div>
           
            <div class="card-line total">
                <span class="card-line-value ${netPosition >= 0 ? 'positive' : 'negative'}">${formatCurrency(Math.abs(netPosition))}</span>
                <span class="card-line-label">صافي موقف رأس المال/تحويل: ${netPosition >= 0 ? 'فائض' : 'عجز'}</span>
            </div>
        `;

        const totalCosts = materialCosts + contractorCosts;
        const operatingResult = totalRevenue - totalCosts;

        document.getElementById('operatingResultCard').innerHTML = `
            <div class="card-line revenue">
                <span class="card-line-value positive">${formatCurrency(totalRevenue)}</span>
                <span class="card-line-label">إجمالي الإيرادات/التوريدات:</span>
            </div>
           
            <div class="card-line expense">
                <span class="card-line-value negative">${formatCurrency(materialCosts)}</span>
                <span class="card-line-label">إجمالي تكلفة المواد سعر الكسارة أو المورد:</span>
            </div>
            <div class="card-line expense">
                <span class="card-line-value negative">${formatCurrency(contractorCosts)}</span>
                <span class="card-line-label">إجمالي المقاول (في حالة فترة + تحويل):</span>
            </div>
           
            <div class="card-line total">
                <span class="card-line-value ${operatingResult >= 0 ? 'positive' : 'negative'}">${formatCurrency(Math.abs(operatingResult))}</span>
                <span class="card-line-label">صافي نتيجة التشغيل:</span>
            </div>
        `;

        document.getElementById('generalExpensesCard').innerHTML = `
            <div class="card-line expense">
                <span class="card-line-value negative">${formatCurrency(administrativeExpenses)}</span>
                <span class="card-line-label">إجمالي مصروفات الإدارية:</span>
            </div>
            <div class="card-line expense">
                <span class="card-line-value negative">${formatCurrency(salaries)}</span>
                <span class="card-line-label">إجمالي الرواتب:</span>
            </div>
            <div class="card-line expense">
                <span class="card-line-value negative">${formatCurrency(operationalExpenses)}</span>
                <span class="card-line-label">إجمالي المصروفات التشغيلية:</span>
            </div>
           
            <div class="card-line total">
                <span class="card-line-value negative">${formatCurrency(totalExpenses)}</span>
                <span class="card-line-label">إجمالي المصاريف:</span>
            </div>
        `;

        const netProfitLoss = operatingResult + receivables - totalExpenses;
        const remaining = netProfitLoss - totalPayments;

        document.getElementById('finalResultCard').innerHTML = `
            <div class="card-line revenue">
                <span class="card-line-value ${operatingResult >= 0 ? 'positive' : 'negative'}">${formatCurrency(Math.abs(operatingResult))}</span>
                <span class="card-line-label">صافي نتيجة التشغيل:</span>
            </div>
            <div class="card-line expense">
                <span class="card-line-value negative">${formatCurrency(totalExpenses)}</span>
                <span class="card-line-label">إجمالي المصاريف:</span>
            </div>
           
            <div class="card-line highlight">
                <span class="card-line-value ${netProfitLoss >= 0 ? 'positive' : 'negative'}">${formatCurrency(Math.abs(netProfitLoss))}</span>
                <span class="card-line-label">صافي الربح/الخسارة عند السداد:</span>
            </div>
           
            <div class="card-line expense">
                <span class="card-line-value negative">${formatCurrency(totalPayments)}</span>
                <span class="card-line-label">إجمالي مدفوع:</span>
            </div>
           
            <div class="card-line total">
                <span class="card-line-value ${remaining >= 0 ? 'positive' : 'negative'}">${formatCurrency(Math.abs(remaining))}</span>
                <span class="card-line-label">مستحق:</span>
            </div>
        `;

    } catch (error) {
        console.error('Error loading detailed financial cards:', error);
    }
}

async function loadProjectExpenses() {
    try {
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
        const data = await apiGet('/administration/capital-injections');
        const allInjections = data.capital_injections || data.capitalInjections || [];
        const injections = allInjections.filter(injection => injection.project_id === currentProjectId);
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
        const data = await apiGet('/administration/withdrawals');
        const allWithdrawals = data.withdrawals || [];
        const withdrawals = allWithdrawals.filter(withdrawal => withdrawal.project_id === currentProjectId);
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
        const data = await apiGet('/employees');
        const allEmployees = data.employees || [];
        const assignedEmployees = allEmployees.filter(employee => {
            return employee.all_projects || (employee.assigned_projects && employee.assigned_projects.includes(currentClientId));
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
    loadProjectDetails();
    window.currentClientId = currentClientId;
});
