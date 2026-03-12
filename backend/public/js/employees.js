// Utilities are loaded via utils/index.js - no need to redefine common functions

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
    detailsBtn.innerHTML = '<i class="fas fa-chart-line"></i> التفاصيل';
    detailsBtn.onclick = () => window.location.href = `employee-details.html?id=${employee.id}`;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-sm btn-danger';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i> حذف';
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

    // Project assignment info
    const projectsItem = document.createElement('div');
    projectsItem.className = 'info-item';

    console.log('Employee projects data:', {
        all_projects: employee.all_projects,
        assigned_projects: employee.assigned_projects,
        assigned_projects_length: employee.assigned_projects?.length
    });

    if (employee.all_projects) {
        projectsItem.innerHTML = `<span class="info-label">المشاريع:</span> <span class="info-value" style="color: var(--blue-600); font-weight: 500;">جميع المشاريع</span>`;
    } else if (employee.assigned_projects && Array.isArray(employee.assigned_projects) && employee.assigned_projects.length > 0) {
        projectsItem.innerHTML = `<span class="info-label">المشاريع:</span> <span class="info-value">${employee.assigned_projects.length} مشروع مخصص</span>`;
    } else {
        projectsItem.innerHTML = `<span class="info-label">المشاريع:</span> <span class="info-value text-muted">غير مخصص لمشاريع</span>`;
    }
    infoSection.appendChild(projectsItem);

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
    container.innerHTML = '';

    employees.forEach(employee => {
        container.appendChild(createEmployeeCard(employee));
    });
}

async function fetchEmployees() {
    const data = await apiGet('/employees');
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

        const data = await apiDelete(`/employees/${employeeId}`);

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

// Global function to load and render employees
window.loadEmployees = async function () {
    const container = document.getElementById('employeesContainer');
    showInlineLoader('employeesContainer', 'جاري تحميل الموظفين...');
    try {
        const employees = await fetchEmployees();
        renderEmployees(employees);
    } catch (error) {
        console.error('Error loading employees:', error);
        if (container) {
            container.innerHTML = `<div class="error-message">خطأ في تحميل البيانات: ${error.message}</div>`;
        }
    }
};

// Make functions available globally
window.deleteEmployee = deleteEmployee;