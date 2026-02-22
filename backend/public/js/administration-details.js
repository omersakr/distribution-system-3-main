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
let currentAdministrationId = null;
let currentAdministration = null;
let projectsList = [];

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

// --- Data Loading ---

async function loadAdministrationDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    currentAdministrationId = urlParams.get('id');

    if (!currentAdministrationId) {
        Swal.fire({
            icon: 'error',
            title: 'خطأ',
            text: 'معرف الإدارة غير موجود'
        }).then(() => {
            window.location.href = 'administration.html';
        });
        return;
    }

    try {
        const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/administration/${currentAdministrationId}`);
        if (!response.ok) throw new Error('فشل في تحميل بيانات الإدارة');

        const data = await response.json();
        currentAdministration = data.administration;

        // Store the full data for edit operations
        currentAdministration.capital_injections = data.capital_injections;
        currentAdministration.withdrawals = data.withdrawals;

        displayAdministrationInfo(data.administration);
        displayFinancialSummary(data.totals);
        displayCapitalInjections(data.capital_injections);
        displayWithdrawals(data.withdrawals);
        displayProjectBreakdown(data.capital_injections, data.withdrawals);

        // Load projects for dropdowns
        await loadProjects();

    } catch (error) {
        console.error('Error loading administration details:', error);
        Swal.fire({
            icon: 'error',
            title: 'خطأ',
            text: 'تعذر تحميل بيانات الإدارة'
        });
    }
}

async function loadProjects() {
    try {
        const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/projects`);
        if (!response.ok) throw new Error('فشل في تحميل المشاريع');

        const data = await response.json();
        projectsList = data.projects || [];

        // Populate project dropdowns
        const projectSelects = ['injectionProject', 'withdrawalProject'];
        projectSelects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '<option value="">اختر المشروع</option>' +
                    projectsList.map(project =>
                        `<option value="${project.id}">${project.name}</option>`
                    ).join('');
            }
        });

    } catch (error) {
        console.error('Error loading projects:', error);
        // Show a user-friendly message if projects fail to load
        Swal.fire({
            icon: 'warning',
            title: 'تحذير',
            text: 'تعذر تحميل قائمة المشاريع. يرجى إعادة تحميل الصفحة.',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });
    }
}

function displayAdministrationInfo(administration) {
    document.getElementById('administrationName').textContent = `تفاصيل الإدارة: ${administration.name}`;

    const infoContainer = document.getElementById('administrationInfo');
    infoContainer.innerHTML = `
        <div class="info-item">
            <span class="info-label">الاسم:</span>
            <span class="info-value">${administration.name}</span>
        </div>
        <div class="info-item">
            <span class="info-label">النوع:</span>
            <span class="info-value">${administration.type === 'Partner' ? 'شريك' : 'ممول'}</span>
        </div>
        ${administration.phone_number ? `
        <div class="info-item">
            <span class="info-label">رقم الهاتف:</span>
            <span class="info-value">${administration.phone_number}</span>
        </div>
        ` : ''}
        <div class="info-item">
            <span class="info-label">الحالة:</span>
            <span class="info-value status-${administration.status.toLowerCase()}">${administration.status === 'Active' ? 'نشط' : 'غير نشط'}</span>
        </div>
        ${administration.notes ? `
        <div class="info-item full-width">
            <span class="info-label">ملاحظات:</span>
            <span class="info-value">${administration.notes}</span>
        </div>
        ` : ''}
    `;
}

function displayFinancialSummary(totals) {
    const summaryContainer = document.getElementById('financialSummary');
    const balance = totals.balance || 0;

    summaryContainer.innerHTML = `
       
        <div class="summary-item">
            <div class="summary-value">${formatCurrency(totals.total_capital_injected)}</div>
            <div class="summary-label">إجمالي ضخ رأس المال</div>
        </div>
        <div class="summary-item">
            <div class="summary-value">${formatCurrency(totals.total_withdrawals)}</div>
            <div class="summary-label">إجمالي المسحوبات</div>
        </div>
    `;
}

function displayCapitalInjections(injections) {
    const tbody = document.getElementById('capitalInjectionsTableBody');

    if (!injections || injections.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">لا توجد سجلات ضخ رأس مال</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = injections.map(injection => `
        <tr>
            <td>${formatDate(injection.date)}</td>
            <td class="amount-positive">${formatCurrency(injection.amount)}</td>
            <td>${injection.project_name}</td>
            <td>${injection.notes || '—'}</td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="editCapitalInjection('${injection.id}')">تعديل</button>
                <button class="btn btn-sm btn-danger" onclick="deleteCapitalInjection('${injection.id}')">حذف</button>
            </td>
        </tr>
    `).join('');
}

function displayWithdrawals(withdrawals) {
    const tbody = document.getElementById('withdrawalsTableBody');

    if (!withdrawals || withdrawals.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">لا توجد مسحوبات</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = withdrawals.map(withdrawal => `
        <tr>
            <td>${formatDate(withdrawal.date)}</td>
            <td class="amount-negative">${formatCurrency(withdrawal.amount)}</td>
            <td>${withdrawal.project_name}</td>
            <td>${withdrawal.notes || '—'}</td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="editWithdrawal('${withdrawal.id}')">تعديل</button>
                <button class="btn btn-sm btn-danger" onclick="deleteWithdrawal('${withdrawal.id}')">حذف</button>
            </td>
        </tr>
    `).join('');
}

function displayProjectBreakdown(capitalInjections, withdrawals) {
    const container = document.getElementById('projectBreakdownContainer');

    // Group data by project
    const projectData = {};

    // Process capital injections
    if (capitalInjections && capitalInjections.length > 0) {
        capitalInjections.forEach(injection => {
            const projectId = injection.project_id;
            const projectName = injection.project_name;

            if (!projectData[projectId]) {
                projectData[projectId] = {
                    name: projectName,
                    totalCapital: 0,
                    totalWithdrawals: 0
                };
            }

            projectData[projectId].totalCapital += parseFloat(injection.amount || 0);
        });
    }

    // Process withdrawals
    if (withdrawals && withdrawals.length > 0) {
        withdrawals.forEach(withdrawal => {
            const projectId = withdrawal.project_id;
            const projectName = withdrawal.project_name;

            if (!projectData[projectId]) {
                projectData[projectId] = {
                    name: projectName,
                    totalCapital: 0,
                    totalWithdrawals: 0
                };
            }

            projectData[projectId].totalWithdrawals += parseFloat(withdrawal.amount || 0);
        });
    }

    // Check if there's any data
    if (Object.keys(projectData).length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: var(--space-8); color: var(--gray-500);">
                لا توجد بيانات لعرضها
            </div>
        `;
        return;
    }

    // Generate cards for each project
    container.innerHTML = Object.entries(projectData).map(([projectId, data]) => {
        const netBalance = data.totalCapital - data.totalWithdrawals;
        const balanceClass = netBalance >= 0 ? 'positive' : 'negative';

        return `
            <div class="project-breakdown-card">
                <div class="project-breakdown-header">
                    ${data.name}
                </div>
                <div class="project-breakdown-stats">
                    <div class="project-stat-box">
                        <div class="project-stat-label">إجمالي ضخ رأس المال</div>
                        <div class="project-stat-value capital">${formatCurrency(data.totalCapital)}</div>
                    </div>
                    <div class="project-stat-box">
                        <div class="project-stat-label">إجمالي المسحوبات</div>
                        <div class="project-stat-value withdrawal">${formatCurrency(data.totalWithdrawals)}</div>
                    </div>
                </div>
                <div class="project-net-balance">
                    <div class="project-net-label">الصافي</div>
                    <div class="project-net-value ${balanceClass}">${formatCurrency(Math.abs(netBalance))}</div>
                </div>
            </div>
        `;
    }).join('');
}

// --- Modal Management ---

function closeCapitalInjectionModal() {
    document.getElementById('capitalInjectionModal').style.display = 'none';
    document.getElementById('capitalInjectionForm').reset();
    delete document.getElementById('capitalInjectionForm').dataset.injectionId;
    document.getElementById('capitalInjectionModalTitle').textContent = 'إضافة ضخ رأس مال';
}

function closeWithdrawalModal() {
    document.getElementById('withdrawalModal').style.display = 'none';
    document.getElementById('withdrawalForm').reset();
    delete document.getElementById('withdrawalForm').dataset.withdrawalId;
    document.getElementById('withdrawalModalTitle').textContent = 'إضافة مسحوبات';
}

// --- CRUD Operations ---

// Capital Injection CRUD
async function handleCapitalInjectionSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const injectionData = Object.fromEntries(formData.entries());

    const injectionId = form.dataset.injectionId;
    const isEdit = !!injectionId;

    try {
        const url = isEdit
            ? `${API_BASE}/administration/${currentAdministrationId}/capital-injections/${injectionId}`
            : `${API_BASE}/administration/${currentAdministrationId}/capital-injections`;
        const method = isEdit ? 'PUT' : 'POST';

        const response = await authManager.makeAuthenticatedRequest(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(injectionData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'فشل في حفظ ضخ رأس المال');
        }

        await Swal.fire({
            icon: 'success',
            title: 'تم الحفظ',
            text: isEdit ? 'تم تحديث ضخ رأس المال بنجاح' : 'تم إضافة ضخ رأس المال بنجاح'
        });

        closeCapitalInjectionModal();
        loadAdministrationDetails();
    } catch (error) {
        console.error('Error saving capital injection:', error);
        Swal.fire({
            icon: 'error',
            title: 'خطأ',
            text: error.message || 'تعذر حفظ ضخ رأس المال'
        });
    }
}

// Similar functions for withdrawals and payments would follow the same pattern...
// For brevity, I'll include the key functions and event listeners

// --- Event Listeners ---

document.addEventListener('DOMContentLoaded', function () {
    // Load administration details on page load
    loadAdministrationDetails();

    // Set default dates to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('injectionDate').value = today;
    document.getElementById('withdrawalDate').value = today;

    // Modal buttons
    document.getElementById('addCapitalInjectionBtn').addEventListener('click', function () {
        document.getElementById('capitalInjectionModal').style.display = 'block';
    });

    document.getElementById('addWithdrawalBtn').addEventListener('click', function () {
        document.getElementById('withdrawalModal').style.display = 'block';
    });

    // Form submissions
    document.getElementById('capitalInjectionForm').addEventListener('submit', handleCapitalInjectionSubmit);
    document.getElementById('withdrawalForm').addEventListener('submit', handleWithdrawalSubmit);

    // Edit administration button
    document.getElementById('editAdministrationBtn').addEventListener('click', function () {
        window.location.href = `administration.html?edit=${currentAdministrationId}`;
    });

    // Close modals when clicking outside
    window.addEventListener('click', function (event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
});

// Placeholder functions for edit/delete operations
function editCapitalInjection(id) {
    const injection = currentAdministration?.capital_injections?.find(inj => inj.id === id);
    if (!injection) return;

    document.getElementById('capitalInjectionModalTitle').textContent = 'تعديل ضخ رأس المال';
    document.getElementById('injectionAmount').value = injection.amount;
    document.getElementById('injectionProject').value = injection.project_id;
    document.getElementById('injectionDate').value = injection.date?.split('T')[0];
    document.getElementById('injectionNotes').value = injection.notes || '';
    document.getElementById('capitalInjectionForm').dataset.injectionId = id;
    document.getElementById('capitalInjectionModal').style.display = 'block';
}

async function deleteCapitalInjection(id) {
    const result = await Swal.fire({
        title: 'هل أنت متأكد؟',
        text: 'سيتم حذف سجل ضخ رأس المال نهائياً',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'نعم، احذف',
        cancelButtonText: 'إلغاء'
    });

    if (!result.isConfirmed) return;

    try {
        const response = await authManager.makeAuthenticatedRequest(
            `${API_BASE}/administration/${currentAdministrationId}/capital-injections/${id}`,
            { method: 'DELETE' }
        );

        if (!response.ok) throw new Error('فشل في حذف ضخ رأس المال');

        await Swal.fire({
            icon: 'success',
            title: 'تم الحذف',
            text: 'تم حذف ضخ رأس المال بنجاح'
        });

        loadAdministrationDetails();
    } catch (error) {
        console.error('Error deleting capital injection:', error);
        Swal.fire({
            icon: 'error',
            title: 'خطأ',
            text: 'تعذر حذف ضخ رأس المال'
        });
    }
}

// Withdrawal CRUD
async function handleWithdrawalSubmit(event) {
    event.preventDefault();
    console.log('Withdrawal form submitted');

    const form = event.target;
    const formData = new FormData(form);
    const withdrawalData = Object.fromEntries(formData.entries());

    console.log('Withdrawal data:', withdrawalData);
    console.log('Current administration ID:', currentAdministrationId);

    const withdrawalId = form.dataset.withdrawalId;
    const isEdit = !!withdrawalId;

    try {
        const url = isEdit
            ? `${API_BASE}/administration/${currentAdministrationId}/withdrawals/${withdrawalId}`
            : `${API_BASE}/administration/${currentAdministrationId}/withdrawals`;
        const method = isEdit ? 'PUT' : 'POST';

        console.log('Sending request to:', url);
        console.log('Method:', method);

        const response = await authManager.makeAuthenticatedRequest(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(withdrawalData)
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error response:', errorData);
            throw new Error(errorData.message || 'فشل في حفظ المسحوبات');
        }

        await Swal.fire({
            icon: 'success',
            title: 'تم الحفظ',
            text: isEdit ? 'تم تحديث المسحوبات بنجاح' : 'تم إضافة المسحوبات بنجاح'
        });

        closeWithdrawalModal();
        loadAdministrationDetails();
    } catch (error) {
        console.error('Error saving withdrawal:', error);
        Swal.fire({
            icon: 'error',
            title: 'خطأ',
            text: error.message || 'تعذر حفظ المسحوبات'
        });
    }
}

function editWithdrawal(id) {
    const withdrawal = currentAdministration?.withdrawals?.find(w => w.id === id);
    if (!withdrawal) return;

    document.getElementById('withdrawalModalTitle').textContent = 'تعديل المسحوبات';
    document.getElementById('withdrawalAmount').value = withdrawal.amount;
    document.getElementById('withdrawalProject').value = withdrawal.project_id;
    document.getElementById('withdrawalDate').value = withdrawal.date?.split('T')[0];
    document.getElementById('withdrawalNotes').value = withdrawal.notes || '';
    document.getElementById('withdrawalForm').dataset.withdrawalId = id;
    document.getElementById('withdrawalModal').style.display = 'block';
}

async function deleteWithdrawal(id) {
    const result = await Swal.fire({
        title: 'هل أنت متأكد؟',
        text: 'سيتم حذف سجل المسحوبات نهائياً',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'نعم، احذف',
        cancelButtonText: 'إلغاء'
    });

    if (!result.isConfirmed) return;

    try {
        const response = await authManager.makeAuthenticatedRequest(
            `${API_BASE}/administration/${currentAdministrationId}/withdrawals/${id}`,
            { method: 'DELETE' }
        );

        if (!response.ok) throw new Error('فشل في حذف المسحوبات');

        await Swal.fire({
            icon: 'success',
            title: 'تم الحذف',
            text: 'تم حذف المسحوبات بنجاح'
        });

        loadAdministrationDetails();
    } catch (error) {
        console.error('Error deleting withdrawal:', error);
        Swal.fire({
            icon: 'error',
            title: 'خطأ',
            text: 'تعذر حذف المسحوبات'
        });
    }
}