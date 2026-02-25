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

// State
let crushersData = [];

// Helpers
function formatCurrency(amount) {
    return Number(amount || 0).toLocaleString('ar-EG', {
        style: 'currency',
        currency: 'EGP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

function formatQuantity(qty) {
    return Number(qty || 0).toLocaleString('ar-EG', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    });
}

// Create crusher card with material pricing display
function createCrusherCard(crusher) {
    const card = document.createElement('div');
    card.className = 'crusher-card';

    // Header with name and actions
    const header = document.createElement('div');
    header.className = 'crusher-header';

    const name = document.createElement('h3');
    name.className = 'crusher-name';
    name.textContent = crusher.name;

    const actions = document.createElement('div');
    actions.className = 'crusher-actions';

    const editPricesBtn = document.createElement('button');
    editPricesBtn.className = 'btn btn-sm btn-secondary';
    editPricesBtn.innerHTML = '💰 تعديل الأسعار';
    editPricesBtn.onclick = () => openEditPricesModal(crusher);

    const detailsBtn = document.createElement('button');
    detailsBtn.className = 'btn btn-sm btn-primary';
    detailsBtn.innerHTML = '📊 التفاصيل';
    detailsBtn.onclick = () => window.location.href = `crusher-details.html?id=${crusher.id}`;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-sm btn-danger';
    deleteBtn.innerHTML = '🗑️ حذف';
    deleteBtn.onclick = () => deleteCrusher(crusher.id, crusher.name);

    actions.appendChild(editPricesBtn);
    actions.appendChild(detailsBtn);
    actions.appendChild(deleteBtn);
    header.appendChild(name);
    header.appendChild(actions);
    card.appendChild(header);

    // Material prices section
    const pricesSection = document.createElement('div');
    pricesSection.className = 'material-prices';

    const pricesTitle = document.createElement('h4');
    pricesTitle.textContent = 'أسعار المواد (جنيه/م³)';
    pricesSection.appendChild(pricesTitle);

    const pricesGrid = document.createElement('div');
    pricesGrid.className = 'prices-grid';

    const materials = [
        { key: 'sand_price', label: 'رمل', value: crusher.sand_price },
        { key: 'aggregate1_price', label: 'سن 1', value: crusher.aggregate1_price },
        { key: 'aggregate2_price', label: 'سن 2', value: crusher.aggregate2_price },
        { key: 'aggregate3_price', label: 'سن 3', value: crusher.aggregate3_price },
        { key: 'aggregate6_powder_price', label: 'سن 6 بودرة', value: crusher.aggregate6_powder_price }
    ];

    materials.forEach(material => {
        const priceItem = document.createElement('div');
        priceItem.className = 'price-item';

        const label = document.createElement('span');
        label.className = 'price-label';
        label.textContent = material.label;

        const value = document.createElement('span');
        value.className = 'price-value';
        value.textContent = material.value > 0 ? formatCurrency(material.value) : 'غير محدد';
        if (material.value <= 0) value.classList.add('not-set');

        priceItem.appendChild(label);
        priceItem.appendChild(value);
        pricesGrid.appendChild(priceItem);
    });

    pricesSection.appendChild(pricesGrid);
    card.appendChild(pricesSection);

    // Summary section
    const summary = document.createElement('div');
    summary.className = 'crusher-summary';

    const stats = [
        { label: 'إجمالي الكمية', value: formatQuantity(crusher.totalVolume) + ' م³' },
        { label: 'عدد التسليمات', value: crusher.deliveriesCount || 0 },
        {
            label: 'الرصيد', value: formatCurrency(Math.abs(crusher.net || 0)),
            class: crusher.net > 0 ? 'text-danger' : crusher.net < 0 ? 'text-success' : ''
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
    return card;
}

// Render crushers grid
function renderCrushers(crushers) {
    const container = document.getElementById('crushersContainer');
    if (!container) return;

    container.innerHTML = '';

    if (!crushers || crushers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🏭</div>
                <div class="empty-text">لا توجد كسارات مسجلة</div>
                <button class="btn btn-primary" onclick="showModal('addCrusherModal')">
                    إضافة كسارة جديدة
                </button>
            </div>
        `;
        return;
    }

    crushers.forEach(crusher => {
        container.appendChild(createCrusherCard(crusher));
    });
}

// Modal functions
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

function showMessage(elementId, message, type) {
    const msgDiv = document.getElementById(elementId);
    if (msgDiv) {
        msgDiv.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
        setTimeout(() => msgDiv.innerHTML = '', 5000);
    }
}

// Open edit prices modal
function openEditPricesModal(crusher) {
    document.getElementById('editCrusherId').value = crusher.id;
    document.getElementById('editCrusherName').textContent = `أسعار المواد - ${crusher.name}`;
    document.getElementById('editSandPrice').value = crusher.sand_price || '';
    document.getElementById('editAggregate1Price').value = crusher.aggregate1_price || '';
    document.getElementById('editAggregate2Price').value = crusher.aggregate2_price || '';
    document.getElementById('editAggregate3Price').value = crusher.aggregate3_price || '';
    document.getElementById('editAggregate6PowderPrice').value = crusher.aggregate6_powder_price || '';
    showModal('editPricesModal');
}

// API functions
async function fetchCrushers() {
    const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/crushers`);
    if (!response.ok) {
        throw new Error('فشل في تحميل بيانات الكسارات');
    }
    const data = await response.json();
    // Handle both old format (direct array) and new format (object with crushers property)
    return data.crushers || data;
}

async function createCrusher(crusherData) {
    const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/crushers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(crusherData)
    });

    if (!response.ok) {
        throw new Error('فشل في إضافة الكسارة');
    }

    return response.json();
}

async function updateCrusherPrices(crusherId, pricesData) {
    const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/crushers/${crusherId}/prices`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pricesData)
    });

    if (!response.ok) {
        throw new Error('فشل في تحديث الأسعار');
    }

    return response.json();
}

// Event handlers
function setupEventHandlers() {
    // Add crusher button
    document.getElementById('addCrusherBtn').addEventListener('click', () => {
        showModal('addCrusherModal');
    });

    // Add crusher form
    document.getElementById('addCrusherForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(e.target);
        const openingBalances = getCrusherOpeningBalances();

        const crusherData = {
            name: formData.get('name'),
            sand_price: parseFloat(formData.get('sand_price')) || 0,
            aggregate1_price: parseFloat(formData.get('aggregate1_price')) || 0,
            aggregate2_price: parseFloat(formData.get('aggregate2_price')) || 0,
            aggregate3_price: parseFloat(formData.get('aggregate3_price')) || 0,
            aggregate6_powder_price: parseFloat(formData.get('aggregate6_powder_price')) || 0,
            opening_balances: openingBalances
        };

        try {
            await createCrusher(crusherData);
            showMessage('addCrusherMessage', 'تم إضافة الكسارة بنجاح', 'success');

            setTimeout(() => {
                closeModal('addCrusherModal');
                loadCrushers();
                e.target.reset();
                document.getElementById('crusherOpeningBalancesContainer').innerHTML = '';
                crusherOpeningBalanceCounter = 0;
            }, 1000);
        } catch (error) {
            showMessage('addCrusherMessage', error.message, 'error');
        }
    });

    // Edit prices form
    document.getElementById('editPricesForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const crusherId = document.getElementById('editCrusherId').value;
        const formData = new FormData(e.target);
        const pricesData = {
            sand_price: parseFloat(formData.get('sand_price')) || 0,
            aggregate1_price: parseFloat(formData.get('aggregate1_price')) || 0,
            aggregate2_price: parseFloat(formData.get('aggregate2_price')) || 0,
            aggregate3_price: parseFloat(formData.get('aggregate3_price')) || 0,
            aggregate6_powder_price: parseFloat(formData.get('aggregate6_powder_price')) || 0
        };

        try {
            await updateCrusherPrices(crusherId, pricesData);
            showMessage('editPricesMessage', 'تم تحديث الأسعار بنجاح', 'success');

            setTimeout(() => {
                closeModal('editPricesModal');
                loadCrushers();
            }, 1000);
        } catch (error) {
            showMessage('editPricesMessage', error.message, 'error');
        }
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

// Load crushers data
async function loadCrushers() {
    try {
        crushersData = await fetchCrushers();
        renderCrushers(crushersData);
    } catch (error) {
        console.error('Error loading crushers:', error);
        const container = document.getElementById('crushersContainer');
        container.innerHTML = `
            <div class="error-state">
                <div class="error-icon">❌</div>
                <div class="error-text">خطأ في تحميل بيانات الكسارات</div>
                <div class="error-details">${error.message}</div>
                <button class="btn btn-primary" onclick="loadCrushers()">إعادة المحاولة</button>
            </div>
        `;
    }
}

// Delete crusher function
async function deleteCrusher(crusherId, crusherName) {
    try {
        // Show confirmation dialog
        const result = await Swal.fire({
            title: 'تأكيد الحذف',
            text: `هل أنت متأكد من حذف الكسارة "${crusherName}"؟`,
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

        const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/crushers/${crusherId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'فشل في حذف الكسارة');
        }

        // Show success message
        await Swal.fire({
            title: 'تم الحذف بنجاح',
            text: data.message,
            icon: 'success',
            confirmButtonText: 'موافق'
        });

        // Reload crushers list
        loadCrushers();

    } catch (error) {
        console.error('Delete crusher error:', error);

        // Show error message
        Swal.fire({
            title: 'خطأ في الحذف',
            text: error.message,
            icon: 'error',
            confirmButtonText: 'موافق'
        });
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication first
    if (authManager.checkAuth()) {
        setupEventHandlers();
        loadCrushers();
    }
});

// Make functions available globally
window.showModal = showModal;
window.closeModal = closeModal;
window.deleteCrusher = deleteCrusher;


// Opening balances management for crushers
let crusherOpeningBalanceCounter = 0;
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

// Add opening balance row for crusher
function addCrusherOpeningBalanceRow() {
    const container = document.getElementById('crusherOpeningBalancesContainer');
    const rowId = `crusherOpeningBalance_${crusherOpeningBalanceCounter++}`;

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
    projectSelect.className = 'form-input crusher-opening-balance-project';
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
    amountInput.className = 'form-input crusher-opening-balance-amount';
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
    descInput.className = 'form-input crusher-opening-balance-description';
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

// Get opening balances from crusher form
function getCrusherOpeningBalances() {
    const rows = document.querySelectorAll('.opening-balance-row');
    const balances = [];

    rows.forEach(row => {
        const project = row.querySelector('.crusher-opening-balance-project')?.value;
        const amountInput = row.querySelector('.crusher-opening-balance-amount');
        const amount = amountInput ? parseFloat(amountInput.value) : null;
        const description = row.querySelector('.crusher-opening-balance-description')?.value;

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

// Initialize opening balance button for crushers
document.addEventListener('DOMContentLoaded', async function () {
    // Load projects first
    await loadProjects();

    // Add opening balance button
    const addBtn = document.getElementById('addCrusherOpeningBalanceBtn');
    if (addBtn) {
        addBtn.addEventListener('click', addCrusherOpeningBalanceRow);
    }
});
