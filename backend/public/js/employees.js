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

/**
 * Creates a single employee card DOM node using unified CSS classes
 * @param {object} employee - employee object (id, name, balance, ...future fields)
 * @returns {HTMLElement}
 */
function createEmployeeCard(employee) {
    const card = document.createElement('div');
    card.className = 'employee-card';

    // Header with name and actions
    const header = document.createElement('div');
    header.className = 'employee-header';

    const name = document.createElement('h3');
    name.className = 'employee-name';
    name.textContent = employee.name || "—";

    const actions = document.createElement('div');
    actions.className = 'employee-actions';

    const detailsBtn = document.createElement('button');
    detailsBtn.className = 'btn btn-sm btn-primary';
    detailsBtn.innerHTML = '📊 التفاصيل';
    detailsBtn.onclick = () => window.location.href = `employee-details.html?id=${employee.id}`;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-sm btn-danger';
    deleteBtn.innerHTML = '🗑️ حذف';
    deleteBtn.onclick = () => deleteEmployee(employee.id, employee.name);

    actions.appendChild(detailsBtn);
    actions.appendChild(deleteBtn);
    header.appendChild(name);
    header.appendChild(actions);
    card.appendChild(header);

    // Employee info section
    const infoSection = document.createElement('div');
    infoSection.className = 'employee-info';

    if (employee.job_title) {
        const jobTitleItem = document.createElement('div');
        jobTitleItem.className = 'info-item';
        jobTitleItem.innerHTML = `<span class="info-label">المسمى الوظيفي:</span> <span class="info-value">${employee.job_title}</span>`;
        infoSection.appendChild(jobTitleItem);
    }

    if (employee.phone_number) {
        const phoneItem = document.createElement('div');
        phoneItem.className = 'info-item';
        phoneItem.innerHTML = `<span class="info-label">الهاتف:</span> <span class="info-value">${employee.phone_number}</span>`;
        infoSection.appendChild(phoneItem);
    }

    const statusItem = document.createElement('div');
    statusItem.className = 'info-item';
    const statusClass = employee.status === 'Active' ? 'status-active' : 'status-inactive';
    const statusText = employee.status === 'Active' ? 'نشط' : 'غير نشط';
    statusItem.innerHTML = `<span class="info-label">الحالة:</span> <span class="info-value ${statusClass}">${statusText}</span>`;
    infoSection.appendChild(statusItem);

    const startDateItem = document.createElement('div');
    startDateItem.className = 'info-item';
    startDateItem.innerHTML = `<span class="info-label">تاريخ بداية العمل:</span> <span class="info-value">${formatDate(employee.start_working_date)}</span>`;
    infoSection.appendChild(startDateItem);

    card.appendChild(infoSection);

    // Financial summary section
    const financialSection = document.createElement('div');
    financialSection.className = 'employee-financial';

    const balanceItem = document.createElement('div');
    balanceItem.className = 'financial-item';

    const balanceLabel = document.createElement('span');
    balanceLabel.className = 'financial-label';
    balanceLabel.textContent = 'الرصيد الحالي:';

    const balanceValue = document.createElement('span');
    balanceValue.className = 'financial-value employee-balance';
    const balance = employee.balance || 0;
    const earnedSalary = employee.total_earned_salary || 0;
    
    // SAFETY GUARD: If no earned salary, show neutral balance
    if (earnedSalary === 0) {
        balanceValue.classList.add('text-muted');
        balanceValue.textContent = formatCurrency(0);
        balanceItem.appendChild(balanceLabel);
        balanceItem.appendChild(document.createTextNode(' '));
        balanceItem.appendChild(balanceValue);
        balanceItem.appendChild(document.createTextNode(' (متوازن)'));
    } else {
        balanceValue.textContent = formatCurrency(Math.abs(balance));
        
        if (balance > 0) {
            balanceValue.classList.add('positive');
            balanceItem.appendChild(balanceLabel);
            balanceItem.appendChild(document.createTextNode(' '));
            balanceItem.appendChild(balanceValue);
            balanceItem.appendChild(document.createTextNode(' (مدفوع زائد)'));
        } else if (balance < 0) {
            balanceValue.classList.add('negative');
            balanceItem.appendChild(balanceLabel);
            balanceItem.appendChild(document.createTextNode(' '));
            balanceItem.appendChild(balanceValue);
            balanceItem.appendChild(document.createTextNode(' (مستحق للموظف)'));
        } else {
            balanceValue.classList.add('text-muted');
            balanceItem.appendChild(balanceLabel);
            balanceItem.appendChild(document.createTextNode(' '));
            balanceItem.appendChild(balanceValue);
            balanceItem.appendChild(document.createTextNode(' (متوازن)'));
        }
    }

    financialSection.appendChild(balanceItem);
    card.appendChild(financialSection);

    // Stats section - إضافة إجمالي الراتب المستحق وأيام العمل
    const stats = document.createElement('div');
    stats.className = 'employee-stats';

    const statsItems = [
        { label: 'أيام العمل', value: employee.total_worked_days || 0 },
        { label: 'إجمالي الراتب المستحق', value: formatCurrency(employee.total_earned_salary || 0) }
    ];

    statsItems.forEach(stat => {
        const statItem = document.createElement('div');
        statItem.className = 'stat-item';

        const statLabel = document.createElement('span');
        statLabel.className = 'stat-label';
        statLabel.textContent = stat.label + ':';

        const statValue = document.createElement('span');
        statValue.className = 'stat-value';
        statValue.textContent = typeof stat.value === 'number' ? stat.value : stat.value;

        statItem.appendChild(statLabel);
        statItem.appendChild(statValue);
        stats.appendChild(statItem);
    });

    card.appendChild(stats);
    return card;
}

function renderEmployees(employees) {
    const container = document.getElementById('employeesContainer');
    if (!container) return;

    container.innerHTML = '';

    if (!employees || employees.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">👷</div>
                <div class="empty-text">لا توجد موظفين مسجلين</div>
                <button class="btn btn-primary" onclick="document.getElementById('addEmployeeBtn').click()">
                    إضافة موظف جديد
                </button>
            </div>
        `;
        return;
    }

    employees.forEach(employee => {
        container.appendChild(createEmployeeCard(employee));
    });
}

async function fetchEmployees() {
    const resp = await authManager.makeAuthenticatedRequest(`${API_BASE}/employees`);
    if (!resp.ok) throw new Error('تعذر تحميل الموظفين');
    const data = await resp.json();
    // Handle both old format (direct array) and new format (object with employees property)
    return data.employees || data;
}

// Delete employee function
async function deleteEmployee(employeeId, employeeName) {
    try {
        // Show confirmation dialog
        const result = await Swal.fire({
            title: 'تأكيد الحذف',
            text: `هل أنت متأكد من حذف الموظف "${employeeName}"؟`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'نعم، احذف',
            cancelButtonText: 'إلغاء',
            reverseButtons: true
        });

        if (!result.isConfirmed) {
            return;
        }

        // Show loading
        Swal.fire({
            title: 'جاري الحذف...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/employees/${employeeId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'فشل في حذف الموظف');
        }

        // Show success message
        await Swal.fire({
            title: 'تم الحذف بنجاح',
            text: data.message,
            icon: 'success',
            confirmButtonText: 'موافق'
        });

        // Reload employees list
        location.reload();

    } catch (error) {
        console.error('Delete employee error:', error);

        // Show error message
        Swal.fire({
            title: 'خطأ في الحذف',
            text: error.message,
            icon: 'error',
            confirmButtonText: 'موافق'
        });
    }
}

// --- Initialization on DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', function () {
    // Check authentication first
    if (!authManager.checkAuth()) {
        return;
    }

    loadEmployees();
});

// Global function to load and render employees
window.loadEmployees = async function() {
    try {
        const employees = await fetchEmployees();
        renderEmployees(employees);
    } catch (error) {
        console.error('Error loading employees:', error);
        const container = document.getElementById('employeesContainer');
        if (container) {
            container.innerHTML = `<div class="error-message">خطأ في تحميل البيانات: ${error.message}</div>`;
        }
    }
};

// Make functions available globally
window.deleteEmployee = deleteEmployee;