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

// Global variables
let currentClientId = null;
let currentClient = null;

// --- Helpers ---

function formatCurrency(amount) {
    return Number(amount || 0).toLocaleString('ar-EG', {
        style: 'currency',
        currency: 'EGP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

function formatDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG');
}

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
        const clientResponse = await authManager.makeAuthenticatedRequest(`${API_BASE}/clients/${currentClientId}`);
        if (!clientResponse.ok) throw new Error('فشل في تحميل بيانات العميل');
        
        const clientData = await clientResponse.json();
        currentClient = clientData.client;
        
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
        const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/clients/${currentClientId}`);
        const data = await response.json();
        const client = data.client;
        
        const summaryContainer = document.getElementById('financialSummary');
        const balance = client.balance || 0;
        
        summaryContainer.innerHTML = `
            <div class="summary-item">
                <div class="summary-value ${balance >= 0 ? 'text-danger' : 'text-success'}">
                    ${formatCurrency(Math.abs(balance))}
                </div>
                <div class="summary-label">${balance >= 0 ? 'مدين لنا' : 'دائن لدينا'}</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${formatCurrency(client.totalDeliveries || 0)}</div>
                <div class="summary-label">إجمالي التسليمات</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${formatCurrency(client.totalPayments || 0)}</div>
                <div class="summary-label">إجمالي المدفوعات</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${formatCurrency(0)}</div>
                <div class="summary-label">المصروفات المرتبطة</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${formatCurrency(0)}</div>
                <div class="summary-label">الحقن الرأسمالية</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${formatCurrency(0)}</div>
                <div class="summary-label">السحوبات</div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading financial summary:', error);
    }
}

async function loadProjectExpenses() {
    try {
        // Load expenses related to this project (client)
        const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/expenses?project_id=${currentClientId}`);
        const data = await response.json();
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
                <td colspan="5" class="empty-state">لا توجد مصروفات مرتبطة بهذا المشروع</td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = expenses.map(expense => `
        <tr>
            <td>${formatCurrency(expense.amount)}</td>
            <td>${expense.description || '—'}</td>
            <td>${expense.category || '—'}</td>
            <td>${formatDate(expense.date)}</td>
            <td>${expense.notes || '—'}</td>
        </tr>
    `).join('');
}

async function loadCapitalInjections() {
    try {
        // Load capital injections (from administration)
        const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/administration/capital-injections`);
        const data = await response.json();
        const injections = data.capitalInjections || [];
        
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
            <td>${injection.source || '—'}</td>
            <td>${formatDate(injection.date)}</td>
            <td>${injection.notes || '—'}</td>
        </tr>
    `).join('');
}

async function loadWithdrawals() {
    try {
        // Load withdrawals (from administration)
        const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/administration/withdrawals`);
        const data = await response.json();
        const withdrawals = data.withdrawals || [];
        
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
            <td>${withdrawal.purpose || '—'}</td>
            <td>${formatDate(withdrawal.date)}</td>
            <td>${withdrawal.notes || '—'}</td>
        </tr>
    `).join('');
}

async function loadAssignedEmployees() {
    try {
        // Load employees assigned to this project (client)
        const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/employees`);
        const data = await response.json();
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

document.addEventListener('DOMContentLoaded', function() {
    // Load project details on page load
    loadProjectDetails();
    
    // Make currentClientId available globally for onclick handlers
    window.currentClientId = currentClientId;
});