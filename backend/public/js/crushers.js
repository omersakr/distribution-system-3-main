// Use shared API_BASE or create it
if (!window.API_BASE) {
    window.API_BASE = (() => {
        try {
            const origin = window.location.origin;
            if (!origin || origin === 'null') return 'http://localhost:5000/api';
            return origin.replace(/\/$/, '') + '/api';
        } catch (e) {
            return 'http://localhost:5000/api';
        }
    })();
}

// State
let crushersData = [];

// Helpers
function formatCurrency(amount) {
    return Number(amount || 0).toLocaleString('ar-EG', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }) + ' ج.م';
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

    const detailsBtn = document.createElement('button');
    detailsBtn.className = 'action-btn-modern view';
    detailsBtn.innerHTML = '<i class="fas fa-chart-line"></i> التفاصيل';
    detailsBtn.title = 'عرض التفاصيل';
    detailsBtn.onclick = () => window.location.href = `crusher-details.html?id=${crusher.id}`;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'action-btn-modern danger';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.title = 'حذف';
    deleteBtn.onclick = () => deleteCrusher(crusher.id, crusher.name);

    actions.appendChild(detailsBtn);
    actions.appendChild(deleteBtn);
    header.appendChild(name);
    header.appendChild(actions);
    card.appendChild(header);

    // Material prices section
    const pricesSection = document.createElement('div');
    pricesSection.className = 'material-prices';

    const pricesTitle = document.createElement('h4');
    pricesTitle.textContent = 'المواد';
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
        { label: 'عدد المواد', value: 5 },
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
                <div class="empty-icon"><i class="fas fa-industry"></i></div>
                <div class="empty-text">لا توجد كسارات مسجلة</div>
                <button class="btn-modern btn-primary-modern" onclick="showAddCrusherModal()">
                    <i class="fas fa-plus"></i> إضافة كسارة جديدة
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
// Show add crusher modal
function showAddCrusherModal() {
    document.getElementById('addCrusherModal').style.display = 'flex';
    document.getElementById('crusherName').focus();
}

// Close add crusher modal
function closeAddCrusherModal() {
    document.getElementById('addCrusherModal').style.display = 'none';
    document.getElementById('addCrusherForm').reset();
    document.getElementById('crusherOpeningBalancesContainer').innerHTML = '';
    document.getElementById('addCrusherMessage').innerHTML = '';
    crusherOpeningBalanceCounter = 0;
}

// Show edit prices modal
function showEditPricesModal() {
    document.getElementById('editPricesModal').style.display = 'flex';
}

// Close edit prices modal
function closeEditPricesModal() {
    document.getElementById('editPricesModal').style.display = 'none';
    document.getElementById('editPricesForm').reset();
    document.getElementById('editPricesMessage').innerHTML = '';
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
    showEditPricesModal();
}

// API functions
async function fetchCrushers() {
    const response = await authManager.makeAuthenticatedRequest(`${window.API_BASE}/crushers`);
    if (!response.ok) {
        throw new Error('فشل في تحميل بيانات الكسارات');
    }
    const data = await response.json();
    // Handle both old format (direct array) and new format (object with crushers property)
    return data.crushers || data;
}

async function createCrusher(crusherData) {
    const response = await authManager.makeAuthenticatedRequest(`${window.API_BASE}/crushers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(crusherData)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'فشل في إضافة الكسارة');
    }

    return response.json();
}

async function updateCrusherPrices(crusherId, pricesData) {
    const response = await authManager.makeAuthenticatedRequest(`${window.API_BASE}/crushers/${crusherId}/prices`, {
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
    // Add crusher form
    let isSubmittingCrusher = false;
    const addCrusherForm = document.getElementById('addCrusherForm');
    
    addCrusherForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Prevent double submission
        if (isSubmittingCrusher) {
            console.log('Already submitting, please wait...');
            return;
        }

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

        isSubmittingCrusher = true;
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalButtonText = submitButton ? submitButton.textContent : 'حفظ';
        
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'جاري الإضافة...';
        }

        try {
            await createCrusher(crusherData);
            
            // Show success message
            await Swal.fire({
                title: 'تم بنجاح',
                text: 'تم إضافة الكسارة بنجاح',
                icon: 'success',
                confirmButtonText: 'موافق',
                timer: 2000
            });

            closeAddCrusherModal();
            loadCrushers();
            document.getElementById('crusherOpeningBalancesContainer').innerHTML = '';
            crusherOpeningBalanceCounter = 0;
            
        } catch (error) {
            console.error('Error creating crusher:', error);
            
            // Show error message
            await Swal.fire({
                title: 'خطأ',
                text: error.message || 'فشل في إضافة الكسارة',
                icon: 'error',
                confirmButtonText: 'موافق'
            });
        } finally {
            // Always reset the flag and button state
            isSubmittingCrusher = false;
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        }
    });

    // Edit prices form
    let isSubmittingPrices = false;
    const editPricesForm = document.getElementById('editPricesForm');
    
    editPricesForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Prevent double submission
        if (isSubmittingPrices) {
            console.log('Already submitting, please wait...');
            return;
        }

        const crusherId = document.getElementById('editCrusherId').value;
        const formData = new FormData(e.target);
        const pricesData = {
            sand_price: parseFloat(formData.get('sand_price')) || 0,
            aggregate1_price: parseFloat(formData.get('aggregate1_price')) || 0,
            aggregate2_price: parseFloat(formData.get('aggregate2_price')) || 0,
            aggregate3_price: parseFloat(formData.get('aggregate3_price')) || 0,
            aggregate6_powder_price: parseFloat(formData.get('aggregate6_powder_price')) || 0
        };

        isSubmittingPrices = true;
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalButtonText = submitButton ? submitButton.textContent : 'حفظ';
        
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'جاري التحديث...';
        }

        try {
            await updateCrusherPrices(crusherId, pricesData);
            
            // Show success message
            await Swal.fire({
                title: 'تم بنجاح',
                text: 'تم تحديث الأسعار بنجاح',
                icon: 'success',
                confirmButtonText: 'موافق',
                timer: 2000
            });

            closeEditPricesModal();
            loadCrushers();
            
        } catch (error) {
            console.error('Error updating prices:', error);
            
            // Show error message
            await Swal.fire({
                title: 'خطأ',
                text: error.message || 'فشل في تحديث الأسعار',
                icon: 'error',
                confirmButtonText: 'موافق'
            });
        } finally {
            // Always reset the flag and button state
            isSubmittingPrices = false;
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        }
    });

    // Modal close on backdrop click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                if (modal.id === 'addCrusherModal') {
                    closeAddCrusherModal();
                } else if (modal.id === 'editPricesModal') {
                    closeEditPricesModal();
                }
            }
        });
    });
}

// Load crushers data
async function loadCrushers() {
    showInlineLoader('crushersContainer', 'جاري تحميل الكسارات...');
    try {
        crushersData = await fetchCrushers();
        renderCrushers(crushersData);
    } catch (error) {
        console.error('Error loading crushers:', error);
        const container = document.getElementById('crushersContainer');
        container.innerHTML = `
            <div class="error-state">
                <div class="error-icon"><i class="fas fa-times-circle"></i></div>
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

        const response = await authManager.makeAuthenticatedRequest(`${window.API_BASE}/crushers/${crusherId}`, {
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
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication first
    if (authManager.checkAuth()) {
        // Load projects first
        await loadProjects();
        
        // Add crusher button
        document.getElementById('addCrusherBtn').addEventListener('click', () => {
            showAddCrusherModal();
        });

        // Add opening balance button
        document.getElementById('addCrusherOpeningBalanceBtn').addEventListener('click', addCrusherOpeningBalanceRow);
        
        // Setup other event handlers
        setupEventHandlers();
        
        // Load crushers
        loadCrushers();
    }
});

// Make functions available globally
window.showAddCrusherModal = showAddCrusherModal;
window.closeAddCrusherModal = closeAddCrusherModal;
window.showEditPricesModal = showEditPricesModal;
window.closeEditPricesModal = closeEditPricesModal;
window.deleteCrusher = deleteCrusher;


// Opening balances management for crushers
let crusherOpeningBalanceCounter = 0;
let projectsList = [];

// Load projects for dropdown
async function loadProjects() {
    try {
        const resp = await authManager.makeAuthenticatedRequest(`${window.API_BASE}/clients`);
        if (!resp.ok) throw new Error('Failed to load clients');
        const data = await resp.json();
        console.log('Clients API response:', data);
        projectsList = data.clients || data;
        console.log('Clients loaded:', projectsList.length, 'clients');
    } catch (error) {
        console.error('Error loading clients:', error);
        projectsList = [];
    }
}

// Add opening balance row for crusher
function addCrusherOpeningBalanceRow() {
    console.log('Adding opening balance row, projects available:', projectsList.length);
    
    if (projectsList.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'تنبيه',
            text: 'لا توجد عملاء متاحين. يرجى إضافة عميل أولاً من صفحة العملاء.',
            confirmButtonText: 'حسناً'
        });
        return;
    }
    
    const container = document.getElementById('crusherOpeningBalancesContainer');
    const rowId = `crusherOpeningBalance_${crusherOpeningBalanceCounter++}`;

    const row = document.createElement('div');
    row.className = 'opening-balance-row';
    row.id = rowId;
    row.style.cssText = 'display: grid; grid-template-columns: 2fr 1fr 2fr auto; gap: 0.75rem; align-items: end; padding: 0.75rem; background: #f8fafc; border-radius: 0.5rem; border: 1px solid #e2e8f0;';

    // Project dropdown
    const projectCol = document.createElement('div');
    const projectLabel = document.createElement('label');
    projectLabel.className = 'form-label-modern';
    projectLabel.style.fontSize = '0.75rem';
    projectLabel.textContent = 'العميل';
    const projectSelect = document.createElement('select');
    projectSelect.className = 'form-input-modern crusher-opening-balance-project';
    projectSelect.style.padding = '0.5rem 0.75rem';
    projectSelect.style.fontSize = '0.8125rem';
    projectSelect.required = true;
    projectSelect.innerHTML = '<option value="">اختر العميل</option>';
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
    amountLabel.className = 'form-label-modern';
    amountLabel.style.fontSize = '0.75rem';
    amountLabel.textContent = 'المبلغ';
    const amountInput = document.createElement('input');
    amountInput.type = 'number';
    amountInput.className = 'form-input-modern crusher-opening-balance-amount';
    amountInput.style.padding = '0.5rem 0.75rem';
    amountInput.style.fontSize = '0.8125rem';
    amountInput.step = '0.01';
    amountInput.required = true;
    amountInput.placeholder = '0.00';
    amountCol.appendChild(amountLabel);
    amountCol.appendChild(amountInput);

    // Description input
    const descCol = document.createElement('div');
    const descLabel = document.createElement('label');
    descLabel.className = 'form-label-modern';
    descLabel.style.fontSize = '0.75rem';
    descLabel.textContent = 'الوصف';
    const descInput = document.createElement('input');
    descInput.type = 'text';
    descInput.className = 'form-input-modern crusher-opening-balance-description';
    descInput.style.padding = '0.5rem 0.75rem';
    descInput.style.fontSize = '0.8125rem';
    descInput.placeholder = 'وصف اختياري';
    descInput.maxLength = 500;
    descCol.appendChild(descLabel);
    descCol.appendChild(descInput);

    // Remove button
    const removeCol = document.createElement('div');
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-modern btn-danger-modern';
    removeBtn.style.cssText = 'padding: 0.5rem 0.75rem; font-size: 0.875rem;';
    removeBtn.innerHTML = '<i class="fas fa-trash"></i>';
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
// (Removed - now handled in main DOMContentLoaded)


// ============================================================================
// OPENING BALANCE MANAGEMENT (Project-Based) - ADD FORM
// ============================================================================


// Search functionality
let currentSearch = '';

function filterCrushers() {
    const searchTerm = currentSearch.toLowerCase().trim();
    
    if (!searchTerm) {
        renderCrushers(crushersData);
        return;
    }
    
    const filtered = crushersData.filter(crusher => {
        return crusher.name && crusher.name.toLowerCase().includes(searchTerm);
    });
    
    renderCrushers(filtered);
}

// Setup search event listeners
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('crusherSearch');
    const searchBtn = document.getElementById('searchBtn');
    const clearBtn = document.getElementById('clearSearchBtn');
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearch = e.target.value;
            filterCrushers();
        });
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                currentSearch = e.target.value;
                filterCrushers();
            }
        });
    }
    
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            currentSearch = searchInput.value;
            filterCrushers();
        });
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            currentSearch = '';
            if (searchInput) searchInput.value = '';
            filterCrushers();
        });
    }
});
