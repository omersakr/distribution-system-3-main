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
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }) + ' ج.م';
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

    // Show loaders in each section
    showInlineLoader('financialSummary', 'جاري تحميل الملخص المالي...');
    showInlineLoader('capitalInjectionsTableBody', 'جاري تحميل ضخ رأس المال...');
    showInlineLoader('withdrawalsTableBody', 'جاري تحميل المسحوبات...');
    showInlineLoader('projectBreakdownContainer', 'جاري تحميل تفاصيل المشاريع...');

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
        const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/clients`);
        if (!response.ok) throw new Error('فشل في تحميل المشاريع');

        const data = await response.json();
        projectsList = data.clients || [];

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
    // Update page title only (no administrationName element in new design)
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        pageTitle.textContent = `تفاصيل الإدارة: ${administration.name}`;
    }

    const infoContainer = document.getElementById('administrationInfo');
    if (!infoContainer) return;

    const statusClass = administration.status === 'Active' ? 'bg-tertiary/10 text-tertiary' : 'bg-error/10 text-error';
    const statusText = administration.status === 'Active' ? 'نشط' : 'غير نشط';
    const typeText = administration.type === 'Partner' ? 'شريك' : 'ممول';

    infoContainer.innerHTML = `
        <div class="flex flex-col gap-1">
            <span class="text-xs text-on-surface-variant font-medium">الاسم</span>
            <span class="text-base font-bold text-on-surface">${administration.name}</span>
        </div>
        <div class="flex flex-col gap-1">
            <span class="text-xs text-on-surface-variant font-medium">النوع</span>
            <span class="text-base font-bold text-on-surface">${typeText}</span>
        </div>
        <div class="flex flex-col gap-1">
            <span class="text-xs text-on-surface-variant font-medium">الحالة</span>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}">${statusText}</span>
        </div>
    `;
}

function displayFinancialSummary(totals) {
    const summaryContainer = document.getElementById('financialSummary');
    const balance = totals.balance || 0;
    const netCapital = (totals.total_capital_injected || 0) - (totals.total_withdrawals || 0);

    summaryContainer.innerHTML = `
        <!-- Card 1 -->
        <div class="bg-surface-container-lowest p-5 rounded-xl border-r-4 border-primary shadow-sm hover:translate-y-[-2px] transition-transform">
            <p class="text-on-surface-variant text-xs font-medium mb-1">إجمالي ضخ رأس المال</p>
            <div class="flex items-baseline gap-2">
                <span class="text-2xl font-extrabold text-primary font-headline">${Number(totals.total_capital_injected || 0).toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                <span class="text-xs text-on-surface-variant">ج.م</span>
            </div>
        </div>
        <!-- Card 2 -->
        <div class="bg-surface-container-lowest p-5 rounded-xl border-r-4 border-error shadow-sm hover:translate-y-[-2px] transition-transform">
            <p class="text-on-surface-variant text-xs font-medium mb-1">إجمالي المسحوبات</p>
            <div class="flex items-baseline gap-2">
                <span class="text-2xl font-extrabold text-error font-headline">${Number(totals.total_withdrawals || 0).toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                <span class="text-xs text-on-surface-variant">ج.م</span>
            </div>
        </div>
        <!-- Card 3 -->
        <div class="bg-surface-container-lowest p-5 rounded-xl border-r-4 border-tertiary shadow-sm hover:translate-y-[-2px] transition-transform">
            <p class="text-on-surface-variant text-xs font-medium mb-1">إجمالي ضخ رأس المال - متوازن</p>
            <div class="flex items-baseline gap-2">
                <span class="text-2xl font-extrabold text-tertiary font-headline">${Number(netCapital).toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                <span class="text-xs text-on-surface-variant">ج.م</span>
            </div>
        </div>
        <!-- Card 4 -->
        <div class="bg-surface-container-lowest p-5 rounded-xl border-r-4 border-secondary shadow-sm hover:translate-y-[-2px] transition-transform">
            <p class="text-on-surface-variant text-xs font-medium mb-1">الرصيد الصافي</p>
            <div class="flex items-baseline gap-2">
                <span class="text-2xl font-extrabold text-secondary font-headline">${Number(Math.abs(balance)).toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                <span class="text-xs text-on-surface-variant">ج.م</span>
            </div>
        </div>
    `;
}

function displayCapitalInjections(injections) {
    const tbody = document.getElementById('capitalInjectionsTableBody');

    if (!injections || injections.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-16 text-center">
                    <div class="flex flex-col items-center justify-center text-center">
                        <div class="w-20 h-20 bg-surface-container-low rounded-full flex items-center justify-center mb-4 text-outline-variant">
                            <span class="material-symbols-outlined text-4xl">folder_off</span>
                        </div>
                        <p class="text-on-surface-variant font-medium">لا توجد سجلات ضخ رأس مال</p>
                        <p class="text-xs text-outline mt-1">ابدأ بإضافة بيانات ضخ رأس المال لعرضها هنا</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = injections.map(injection => `
        <tr class="hover:bg-surface-container-low/50 transition-colors">
            <td class="px-6 py-4 text-sm font-manrope">${formatDate(injection.date)}</td>
            <td class="px-6 py-4 text-sm font-bold text-tertiary font-manrope">${Number(injection.amount || 0).toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ج.م</td>
            <td class="px-6 py-4 text-sm">${injection.project_name || 'مشروع محذوف'}</td>
            <td class="px-6 py-4 text-sm text-on-surface-variant">${injection.notes || '—'}</td>
            <td class="px-6 py-4">
                <div class="flex justify-center gap-2">
                    <button onclick="editCapitalInjection('${injection.id}')" class="p-1.5 hover:bg-surface-container-low rounded-lg text-primary transition-colors">
                        <span class="material-symbols-outlined text-lg">edit</span>
                    </button>
                    <button onclick="deleteCapitalInjection('${injection.id}')" class="p-1.5 hover:bg-error/5 rounded-lg text-error transition-colors">
                        <span class="material-symbols-outlined text-lg">delete</span>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function displayWithdrawals(withdrawals) {
    const tbody = document.getElementById('withdrawalsTableBody');

    if (!withdrawals || withdrawals.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-16 text-center">
                    <div class="flex flex-col items-center justify-center text-center">
                        <div class="w-20 h-20 bg-surface-container-low rounded-full flex items-center justify-center mb-4 text-outline-variant">
                            <span class="material-symbols-outlined text-4xl">folder_off</span>
                        </div>
                        <p class="text-on-surface-variant font-medium">لا توجد مسحوبات</p>
                        <p class="text-xs text-outline mt-1">ابدأ بإضافة بيانات المسحوبات لعرضها هنا</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = withdrawals.map(withdrawal => `
        <tr class="hover:bg-surface-container-low/50 transition-colors">
            <td class="px-6 py-4 text-sm font-manrope">${formatDate(withdrawal.date)}</td>
            <td class="px-6 py-4 text-sm font-bold text-error font-manrope">${Number(withdrawal.amount || 0).toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ج.م</td>
            <td class="px-6 py-4 text-sm">${withdrawal.project_name || 'مشروع محذوف'}</td>
            <td class="px-6 py-4 text-sm text-on-surface-variant">${withdrawal.notes || '—'}</td>
            <td class="px-6 py-4">
                <div class="flex justify-center gap-2">
                    <button onclick="editWithdrawal('${withdrawal.id}')" class="p-1.5 hover:bg-surface-container-low rounded-lg text-primary transition-colors">
                        <span class="material-symbols-outlined text-lg">edit</span>
                    </button>
                    <button onclick="deleteWithdrawal('${withdrawal.id}')" class="p-1.5 hover:bg-error/5 rounded-lg text-error transition-colors">
                        <span class="material-symbols-outlined text-lg">delete</span>
                    </button>
                </div>
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
            const projectName = injection.project_name || 'مشروع محذوف';

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
            const projectName = withdrawal.project_name || 'مشروع محذوف';

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
            <div class="bg-surface-container-lowest p-16 rounded-xl shadow-sm border border-dashed border-outline-variant/50 flex flex-col items-center justify-center text-center">
                <div class="w-20 h-20 bg-surface-container-low rounded-full flex items-center justify-center mb-4 text-outline-variant">
                    <span class="material-symbols-outlined text-4xl">folder_off</span>
                </div>
                <p class="text-on-surface-variant font-medium">لا توجد بيانات لعرضها</p>
                <p class="text-xs text-outline mt-1">ابدأ بإضافة بيانات المشاريع لعرض التحليل هنا</p>>
            </div>
        `;
        return;
    }

    // Generate cards for each project
    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${Object.entries(projectData).map(([projectId, data]) => {
                const netBalance = data.totalCapital - data.totalWithdrawals;
                const balanceClass = netBalance >= 0 ? 'text-tertiary' : 'text-error';

                return `
                    <div class="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-surface-container-high">
                        <h4 class="text-lg font-semibold text-on-surface mb-4 pb-3 border-b-2 border-primary">${data.name}</h4>
                        <div class="grid grid-cols-2 gap-4 mb-4">
                            <div class="bg-surface-container-low rounded-lg p-4 text-center">
                                <p class="text-xs text-on-surface-variant mb-2">إجمالي ضخ رأس المال</p>
                                <p class="text-xl font-bold text-tertiary">${Number(data.totalCapital).toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ج.م</p>
                            </div>
                            <div class="bg-surface-container-low rounded-lg p-4 text-center">
                                <p class="text-xs text-on-surface-variant mb-2">إجمالي المسحوبات</p>
                                <p class="text-xl font-bold text-error">${Number(data.totalWithdrawals).toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ج.م</p>
                            </div>
                        </div>
                        <div class="pt-4 border-t border-surface-container-high text-center">
                            <p class="text-xs text-on-surface-variant mb-2">الصافي</p>
                            <p class="text-2xl font-bold ${balanceClass}">${Number(Math.abs(netBalance)).toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ج.م</p>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
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
        openEditAdministrationModal();
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


// Edit Administration Modal Functions
function openEditAdministrationModal() {
    const modal = document.getElementById('editAdministrationModal');
    
    // Fill form with current data
    document.getElementById('editAdminName').value = currentAdministration.name || '';
    document.getElementById('editAdminType').value = currentAdministration.type || 'Partner';
    document.getElementById('editAdminStatus').value = currentAdministration.status || 'نشط';
    
    modal.style.display = 'block';
}

function closeEditAdministrationModal() {
    document.getElementById('editAdministrationModal').style.display = 'none';
    document.getElementById('editAdministrationForm').reset();
}

// Handle edit administration form submission
document.getElementById('editAdministrationForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        name: formData.get('name'),
        type: formData.get('type'),
        status: formData.get('status')
    };
    
    try {
        const response = await fetch(`/api/administration/${currentAdministrationId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) throw new Error('فشل في تحديث البيانات');
        
        await Swal.fire({
            icon: 'success',
            title: 'تم التحديث بنجاح',
            showConfirmButton: false,
            timer: 1500
        });
        
        closeEditAdministrationModal();
        loadAdministrationDetails();
    } catch (error) {
        console.error('Error updating administration:', error);
        Swal.fire({
            icon: 'error',
            title: 'خطأ',
            text: error.message
        });
    }
});
