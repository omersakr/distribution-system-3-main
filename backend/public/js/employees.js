// Utilities are loaded via utils/index.js - no need to redefine common functions

/**
 * Creates a single employee card DOM node
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
    detailsBtn.className = 'action-btn-modern view';
    detailsBtn.innerHTML = '<i class="fas fa-chart-line"></i> التفاصيل';
    detailsBtn.title = 'عرض التفاصيل';
    detailsBtn.onclick = () => window.location.href = `employee-details.html?id=${employee.id}`;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'action-btn-modern danger';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.title = 'حذف';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deleteEmployee(employee.id, employee.name);
    };

    actions.appendChild(detailsBtn);
    actions.appendChild(deleteBtn);
    header.appendChild(name);
    header.appendChild(actions);
    card.appendChild(header);

    // Job title and status
    const infoSection = document.createElement('div');
    infoSection.className = 'employee-info';

    if (employee.job_title) {
        const jobTitle = document.createElement('div');
        jobTitle.className = 'info-item';
        jobTitle.innerHTML = `<span class="info-label">المسمى الوظيفي:</span> <span class="info-value">${employee.job_title}</span>`;
        infoSection.appendChild(jobTitle);
    }

    if (employee.phone_number) {
        const phone = document.createElement('div');
        phone.className = 'info-item';
        phone.innerHTML = `<span class="info-label">الهاتف:</span> <span class="info-value">${employee.phone_number}</span>`;
        infoSection.appendChild(phone);
    }

    const status = document.createElement('div');
    status.className = 'info-item';
    const isActive = employee.status === 'Active';
    status.innerHTML = `<span class="info-label">الحالة:</span> <span class="info-value ${isActive ? 'text-success' : 'text-danger'}">${isActive ? 'نشط' : 'غير نشط'}</span>`;
    infoSection.appendChild(status);

    card.appendChild(infoSection);

    // Summary section
    const summary = document.createElement('div');
    summary.className = 'employee-summary';

    const balance = employee.balance || 0;
    const earnedSalary = employee.total_earned_salary || 0;

    const stats = [
        { label: 'أيام العمل', value: employee.total_worked_days || 0 },
        { label: 'الراتب المستحق', value: formatCurrency(earnedSalary) },
        {
            label: 'الرصيد',
            value: formatCurrency(Math.abs(balance)),
            class: balance < 0 ? 'text-danger' : balance > 0 ? 'text-warning' : ''
        }
    ];

    stats.forEach(stat => {
        const statItem = document.createElement('div');
        statItem.className = 'stat-item';
        if (stat.class) statItem.classList.add(stat.class);

        const statLabel = document.createElement('span');
        statLabel.className = 'stat-label';
        statLabel.textContent = stat.label + ':';

        const statValue = document.createElement('span');
        statValue.className = 'stat-value';
        statValue.textContent = stat.value;

        statItem.appendChild(statLabel);
        statItem.appendChild(statValue);
        summary.appendChild(statItem);
    });

    card.appendChild(summary);

    // Click to view details
    card.onclick = () => window.location.href = `employee-details.html?id=${employee.id}`;

    return card;
}

function renderEmployees(employees) {
    const container = document.getElementById('employeesContainer');
    if (!container) return;


    if (!employees || employees.length === 0) {
        container.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon"><i class="fas fa-user-tie"></i></div>
            <div class="empty-text">لا توجد موظفين مسجلين</div>
            <button class="btn-modern btn-primary-modern" onclick="document.getElementById('addEmployeeBtn').click()">
                <i class="fas fa-plus"></i> إضافة موظف جديد
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


// Search functionality
let currentEmployeeSearch = '';

function filterEmployees() {
    const searchTerm = currentEmployeeSearch.toLowerCase().trim();
    
    if (!searchTerm) {
        renderEmployees(employeesData);
        return;
    }
    
    const filtered = employeesData.filter(employee => {
        return employee.name && employee.name.toLowerCase().includes(searchTerm);
    });
    
    renderEmployees(filtered);
}

// Setup search event listeners
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('employeeSearch');
    const searchBtn = document.getElementById('searchBtn');
    const clearBtn = document.getElementById('clearSearchBtn');
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentEmployeeSearch = e.target.value;
            filterEmployees();
        });
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                currentEmployeeSearch = e.target.value;
                filterEmployees();
            }
        });
    }
    
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            currentEmployeeSearch = searchInput.value;
            filterEmployees();
        });
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            currentEmployeeSearch = '';
            if (searchInput) searchInput.value = '';
            filterEmployees();
        });
    }
});
