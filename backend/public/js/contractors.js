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

/**
 * Creates a single contractor card DOM node using unified CSS classes
 * @param {object} contractor - object (id, name, balance, ...future fields)
 * @returns {HTMLElement}
 */
function createContractorCard(contractor) {
    const card = document.createElement('div');
    card.className = 'contractor-card';

    // Header with name and actions
    const header = document.createElement('div');
    header.className = 'contractor-header';

    const name = document.createElement('h3');
    name.className = 'contractor-name';
    name.textContent = contractor.name || "—";

    const actions = document.createElement('div');
    actions.className = 'contractor-actions';

    const detailsBtn = document.createElement('button');
    detailsBtn.className = 'btn btn-sm btn-primary';
    detailsBtn.innerHTML = '📊 التفاصيل';
    detailsBtn.onclick = () => window.location.href = `contractor-details.html?id=${contractor.id}`;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-sm btn-danger';
    deleteBtn.innerHTML = '🗑️ حذف';
    deleteBtn.onclick = () => deleteContractor(contractor.id, contractor.name);

    actions.appendChild(detailsBtn);
    actions.appendChild(deleteBtn);
    header.appendChild(name);
    header.appendChild(actions);
    card.appendChild(header);

    // Financial summary section
    const financialSection = document.createElement('div');
    financialSection.className = 'contractor-financial';

    const balanceItem = document.createElement('div');
    balanceItem.className = 'financial-item';

    const balanceLabel = document.createElement('span');
    balanceLabel.className = 'financial-label';
    balanceLabel.textContent = 'الرصيد الحالي:';

    const balanceValue = document.createElement('span');
    balanceValue.className = 'financial-value contractor-balance';
    const balance = contractor.balance || 0;
    balanceValue.textContent = formatCurrency(Math.abs(balance));

    if (balance > 0) {
        balanceValue.classList.add('positive');
        balanceItem.appendChild(balanceLabel);
        balanceItem.appendChild(document.createTextNode(' '));
        balanceItem.appendChild(balanceValue);
        balanceItem.appendChild(document.createTextNode(' (مستحق للمقاول)'));
    } else if (balance < 0) {
        balanceValue.classList.add('negative');
        balanceItem.appendChild(balanceLabel);
        balanceItem.appendChild(document.createTextNode(' '));
        balanceItem.appendChild(balanceValue);
        balanceItem.appendChild(document.createTextNode(' (مستحق لنا)'));
    } else {
        balanceValue.classList.add('text-muted');
        balanceItem.appendChild(balanceLabel);
        balanceItem.appendChild(document.createTextNode(' '));
        balanceItem.appendChild(balanceValue);
        balanceItem.appendChild(document.createTextNode(' (متوازن)'));
    }

    financialSection.appendChild(balanceItem);
    card.appendChild(financialSection);

    // Stats section - إضافة إجمالي التسليمات والمستحقات
    const stats = document.createElement('div');
    stats.className = 'contractor-stats';

    const statsItems = [
        { label: 'عدد التسليمات', value: contractor.deliveriesCount || 0 },
        { label: 'إجمالي المستحق', value: formatCurrency(contractor.totalTrips || contractor.totalEarnings || 0) }
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

function renderContractors(contractors) {
    const container = document.getElementById('contractorsContainer');
    if (!container) return;

    container.innerHTML = '';

    if (!contractors || contractors.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">👷</div>
                <div class="empty-text">لا توجد مقاولين مسجلين</div>
                <button class="btn btn-primary" onclick="document.getElementById('addContractorBtn').click()">
                    إضافة مقاول جديد
                </button>
            </div>
        `;
        return;
    }

    contractors.forEach(contractor => {
        container.appendChild(createContractorCard(contractor));
    });
}

async function fetchContractors() {
    const resp = await authManager.makeAuthenticatedRequest(`${API_BASE}/contractors`);
    if (!resp.ok) throw new Error('تعذر تحميل المقاولين');
    const data = await resp.json();
    // Handle both old format (direct array) and new format (object with contractors property)
    return data.contractors || data;
}

// Delete contractor function
async function deleteContractor(contractorId, contractorName) {
    try {
        // Show confirmation dialog
        const result = await Swal.fire({
            title: 'تأكيد الحذف',
            text: `هل أنت متأكد من حذف المقاول "${contractorName}"؟`,
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

        const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/contractors/${contractorId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'فشل في حذف المقاول');
        }

        // Show success message
        await Swal.fire({
            title: 'تم الحذف بنجاح',
            text: data.message,
            icon: 'success',
            confirmButtonText: 'موافق'
        });

        // Reload contractors list
        location.reload();

    } catch (error) {
        console.error('Delete contractor error:', error);

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
    if (authManager.checkAuth()) {
        fetchContractors()
            .then(renderContractors)
            .catch(err => {
                console.error(err);
                const container = document.getElementById('contractorsContainer');
                if (container) {
                    container.innerHTML = `
                        <div class="error-state">
                            <div class="error-icon">❌</div>
                            <div class="error-text">خطأ في تحميل بيانات المقاولين</div>
                            <div class="error-details">${err.message}</div>
                            <button class="btn btn-primary" onclick="location.reload()">إعادة المحاولة</button>
                        </div>
                    `;
                }
            });
    }
});

// Make functions available globally
window.deleteContractor = deleteContractor;

// Opening balances management
let openingBalanceCounter = 0;
let projectsList = [];

// Load projects for dropdown
async function loadProjects() {
    try {
        const resp = await authManager.makeAuthenticatedRequest(`${API_BASE}/projects`);
        if (!resp.ok) throw new Error('Failed to load projects');
        const data = await resp.json();
        projectsList = data.projects || data;
    } catch (error) {
        console.error('Error loading projects:', error);
        projectsList = [];
    }
}

// Add opening balance row
function addOpeningBalanceRow() {
    const container = document.getElementById('openingBalancesContainer');
    const rowId = `openingBalance_${openingBalanceCounter++}`;

    const row = document.createElement('div');
    row.className = 'opening-balance-row';
    row.id = rowId;
    row.style.cssText = 'display: grid; grid-template-columns: 2fr 1fr 2fr auto; gap: 10px; margin-bottom: 10px; align-items: start; padding: 15px; background: var(--gray-50); border-radius: var(--radius); border: 1px solid var(--gray-200);';

    // Project dropdown
    const projectCol = document.createElement('div');
    const projectLabel = document.createElement('label');
    projectLabel.textContent = 'المشروع';
    projectLabel.style.cssText = 'display: block; margin-bottom: 5px; font-size: 0.9rem; font-weight: 500;';
    const projectSelect = document.createElement('select');
    projectSelect.className = 'form-input opening-balance-project';
    projectSelect.required = true;
    projectSelect.innerHTML = '<option value="">اختر المشروع</option>';
    projectsList.forEach(project => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.name;
        projectSelect.appendChild(option);
    });
    projectCol.appendChild(projectLabel);
    projectCol.appendChild(projectSelect);

    // Amount input
    const amountCol = document.createElement('div');
    const amountLabel = document.createElement('label');
    amountLabel.textContent = 'المبلغ';
    amountLabel.style.cssText = 'display: block; margin-bottom: 5px; font-size: 0.9rem; font-weight: 500;';
    const amountInput = document.createElement('input');
    amountInput.type = 'number';
    amountInput.className = 'form-input opening-balance-amount';
    amountInput.step = '0.01';
    amountInput.required = true;
    amountInput.placeholder = '0.00';
    amountCol.appendChild(amountLabel);
    amountCol.appendChild(amountInput);

    // Description input
    const descCol = document.createElement('div');
    const descLabel = document.createElement('label');
    descLabel.textContent = 'الوصف';
    descLabel.style.cssText = 'display: block; margin-bottom: 5px; font-size: 0.9rem; font-weight: 500;';
    const descInput = document.createElement('input');
    descInput.type = 'text';
    descInput.className = 'form-input opening-balance-description';
    descInput.placeholder = 'وصف اختياري';
    descInput.maxLength = 500;
    descCol.appendChild(descLabel);
    descCol.appendChild(descInput);

    // Remove button
    const removeCol = document.createElement('div');
    removeCol.style.cssText = 'padding-top: 28px;';
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn btn-sm btn-danger';
    removeBtn.innerHTML = '🗑️';
    removeBtn.onclick = () => document.getElementById(rowId).remove();
    removeCol.appendChild(removeBtn);

    row.appendChild(projectCol);
    row.appendChild(amountCol);
    row.appendChild(descCol);
    row.appendChild(removeCol);

    container.appendChild(row);
}

// Get opening balances from form
function getOpeningBalances() {
    const rows = document.querySelectorAll('.opening-balance-row');
    const balances = [];

    rows.forEach(row => {
        const project = row.querySelector('.opening-balance-project').value;
        const amount = parseFloat(row.querySelector('.opening-balance-amount').value);
        const description = row.querySelector('.opening-balance-description').value;

        if (project && amount) {
            balances.push({
                project_id: project,
                amount: amount,
                description: description || ''
            });
        }
    });

    return balances;
}

// Show add contractor modal
function showAddContractorModal() {
    document.getElementById('addContractorModal').style.display = 'flex';
    document.getElementById('contractorName').focus();
}

// Close add contractor modal
function closeAddContractorModal() {
    document.getElementById('addContractorModal').style.display = 'none';
    document.getElementById('addContractorForm').reset();
    document.getElementById('openingBalancesContainer').innerHTML = '';
    document.getElementById('addContractorMessage').innerHTML = '';
    openingBalanceCounter = 0;
}

// Handle add contractor form submission
async function handleAddContractor(e) {
    e.preventDefault();

    const name = document.getElementById('contractorName').value.trim();
    const openingBalances = getOpeningBalances();

    if (!name) {
        document.getElementById('addContractorMessage').innerHTML =
            '<div class="alert alert-danger">يرجى إدخال اسم المقاول</div>';
        return;
    }

    try {
        const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/contractors`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: name,
                opening_balances: openingBalances
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'فشل في إضافة المقاول');
        }

        await Swal.fire({
            icon: 'success',
            title: 'تم الحفظ',
            text: 'تم إضافة المقاول بنجاح',
            confirmButtonText: 'موافق'
        });

        closeAddContractorModal();
        location.reload();

    } catch (error) {
        console.error('Error adding contractor:', error);
        document.getElementById('addContractorMessage').innerHTML =
            `<div class="alert alert-danger">${error.message}</div>`;
    }
}

// Initialize modal handlers
document.addEventListener('DOMContentLoaded', async function () {
    // Load projects first
    await loadProjects();

    // Add contractor button
    document.getElementById('addContractorBtn').addEventListener('click', showAddContractorModal);

    // Add opening balance button
    document.getElementById('addOpeningBalanceBtn').addEventListener('click', addOpeningBalanceRow);

    // Form submission
    document.getElementById('addContractorForm').addEventListener('submit', handleAddContractor);
});

// Make functions globally available
window.closeAddContractorModal = closeAddContractorModal;