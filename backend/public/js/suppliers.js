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
let suppliersData = [];

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

// Create supplier card with material pricing display
function createSupplierCard(supplier) {
    const card = document.createElement('div');
    card.className = 'crusher-card';

    // Header with name and actions
    const header = document.createElement('div');
    header.className = 'crusher-header';

    const name = document.createElement('h3');
    name.className = 'crusher-name';
    name.textContent = supplier.name;

    const actions = document.createElement('div');
    actions.className = 'crusher-actions';

    const detailsBtn = document.createElement('button');
    detailsBtn.className = 'action-btn-modern view';
    detailsBtn.innerHTML = '<i class="fas fa-chart-line"></i> التفاصيل';
    detailsBtn.title = 'عرض التفاصيل';
    detailsBtn.onclick = () => window.location.href = `supplier-details.html?id=${supplier.id}`;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'action-btn-modern danger';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.title = 'حذف';
    deleteBtn.onclick = () => deleteSupplier(supplier.id, supplier.name);

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

    if (supplier.materials && supplier.materials.length > 0) {
        supplier.materials.forEach(material => {
            const priceItem = document.createElement('div');
            priceItem.className = 'price-item';

            const label = document.createElement('span');
            label.className = 'price-label';
            label.textContent = material.name;

            const value = document.createElement('span');
            value.className = 'price-value';
            value.textContent = material.price_per_unit > 0 ? formatCurrency(material.price_per_unit) : 'غير محدد';
            if (material.price_per_unit <= 0) value.classList.add('not-set');

            priceItem.appendChild(label);
            priceItem.appendChild(value);
            pricesGrid.appendChild(priceItem);
        });
    } else {
        const noMaterials = document.createElement('div');
        noMaterials.className = 'no-materials';
        noMaterials.textContent = 'لا توجد مواد محددة';
        pricesGrid.appendChild(noMaterials);
    }

    pricesSection.appendChild(pricesGrid);
    card.appendChild(pricesSection);

    // Summary section
    const summary = document.createElement('div');
    summary.className = 'crusher-summary';

    const stats = [
        { label: 'عدد المواد', value: supplier.materials?.length || 0 },
        { label: 'عدد التسليمات', value: supplier.deliveries_count || 0 },
        {
            label: 'الرصيد', value: formatCurrency(Math.abs(supplier.balance || 0)),
            class: supplier.balance > 0 ? 'text-danger' : supplier.balance < 0 ? 'text-success' : ''
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

// Render suppliers grid
function renderSuppliers(suppliers) {
    const container = document.getElementById('suppliersContainer');
    if (!container) return;

    container.innerHTML = '';

    if (!suppliers || suppliers.length === 0) {
        container.innerHTML = `
             <div class="empty-state">
                <div class="empty-icon"><i class="fas fa-warehouse"></i></div>
                <div class="empty-text">لا توجد موردين مسجلين</div>
                <button class="btn-modern btn-primary-modern" onclick="showAddSupplierModal()">
                    <i class="fas fa-plus"></i> إضافة مورد جديد
                </button>
            </div>
        `;
        return;
    }

    suppliers.forEach(supplier => {
        container.appendChild(createSupplierCard(supplier));
    });
}

// Modal functions
// Show add supplier modal
function showAddSupplierModal() {
    document.getElementById('addSupplierModal').style.display = 'flex';
    document.getElementById('supplierName').focus();
}

// Close add supplier modal
function closeAddSupplierModal() {
    document.getElementById('addSupplierModal').style.display = 'none';
    document.getElementById('addSupplierForm').reset();
    document.getElementById('supplierOpeningBalancesContainer').innerHTML = '';
    document.getElementById('addSupplierMessage').innerHTML = '';
    supplierOpeningBalanceCounter = 0;
    
    // Reset materials container
    const container = document.getElementById('materialsContainer');
    container.innerHTML = `
        <div class="material-item">
            <div class="form-group-modern" style="margin-bottom: 0;">
                <label class="form-label-modern" style="font-size: 0.75rem;">اسم المادة</label>
                <input type="text" class="form-input-modern" name="material_name" placeholder="اسم المادة" style="padding: 0.5rem 0.75rem; font-size: 0.8125rem;" required>
            </div>
            <div class="form-group-modern" style="margin-bottom: 0;">
                <label class="form-label-modern" style="font-size: 0.75rem;">السعر (جنيه/وحدة)</label>
                <input type="number" class="form-input-modern" name="material_price" step="0.01" min="0" placeholder="0.00" style="padding: 0.5rem 0.75rem; font-size: 0.8125rem;" required>
            </div>
            <div>
                <button type="button" class="btn-modern btn-danger-modern" style="padding: 0.5rem 0.75rem; font-size: 0.875rem;" onclick="removeMaterial(this)"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `;
}

function showMessage(elementId, message, type) {
    const msgDiv = document.getElementById(elementId);
    if (msgDiv) {
        msgDiv.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
        setTimeout(() => msgDiv.innerHTML = '', 5000);
    }
}

// Material management functions
function addMaterial() {
    const container = document.getElementById('materialsContainer');
    const materialItem = document.createElement('div');
    materialItem.className = 'material-item';
    materialItem.innerHTML = `
        <div class="form-group-modern" style="margin-bottom: 0;">
            <label class="form-label-modern" style="font-size: 0.75rem;">اسم المادة</label>
            <input type="text" class="form-input-modern" name="material_name" placeholder="اسم المادة" style="padding: 0.5rem 0.75rem; font-size: 0.8125rem;" required>
        </div>
        <div class="form-group-modern" style="margin-bottom: 0;">
            <label class="form-label-modern" style="font-size: 0.75rem;">السعر (جنيه/وحدة)</label>
            <input type="number" class="form-input-modern" name="material_price" step="0.01" min="0" placeholder="0.00" style="padding: 0.5rem 0.75rem; font-size: 0.8125rem;" required>
        </div>
        <div>
            <button type="button" class="btn-modern btn-danger-modern" style="padding: 0.5rem 0.75rem; font-size: 0.875rem;" onclick="removeMaterial(this)"><i class="fas fa-trash"></i></button>
        </div>
    `;
    container.appendChild(materialItem);
}

function removeMaterial(button) {
    const container = document.getElementById('materialsContainer');
    if (container.children.length > 1) {
        button.parentElement.remove();
    }
}

// API functions
async function fetchSuppliers() {
    const response = await authManager.makeAuthenticatedRequest(`${window.API_BASE}/suppliers`);
    if (!response.ok) {
        throw new Error('فشل في تحميل بيانات الموردين');
    }

    const data = await response.json();
    console.log(data);
    return data.suppliers || data;
}

async function createSupplier(supplierData) {
    const response = await authManager.makeAuthenticatedRequest(`${window.API_BASE}/suppliers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supplierData)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'فشل في إضافة المورد');
    }

    return response.json();
}

// Event handlers
function setupEventHandlers() {
    // Add supplier form
    let isSubmittingSupplier = false;
    const addSupplierForm = document.getElementById('addSupplierForm');
    
    addSupplierForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Prevent double submission
        if (isSubmittingSupplier) {
            console.log('Already submitting, please wait...');
            return;
        }

        const formData = new FormData(e.target);
        const materials = [];
        const openingBalances = getSupplierOpeningBalances();

        // Collect materials
        const materialItems = document.querySelectorAll('#materialsContainer .material-item');
        materialItems.forEach(item => {
            const name = item.querySelector('input[name="material_name"]').value;
            const price = parseFloat(item.querySelector('input[name="material_price"]').value);
            if (name && price > 0) {
                materials.push({ name, price_per_unit: price });
            }
        });

        const supplierData = {
            name: formData.get('name'),
            phone_number: formData.get('phone'),
            materials: materials,
            status: 'Active',
            opening_balances: openingBalances
        };

        isSubmittingSupplier = true;
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalButtonText = submitButton ? submitButton.textContent : 'حفظ';
        
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'جاري الإضافة...';
        }

        try {
            await createSupplier(supplierData);
            
            // Show success message
            await Swal.fire({
                title: 'تم بنجاح',
                text: 'تم إضافة المورد بنجاح',
                icon: 'success',
                confirmButtonText: 'موافق',
                timer: 2000
            });

            closeAddSupplierModal();
            loadSuppliers();
            
        } catch (error) {
            console.error('Error creating supplier:', error);
            
            // Show error message
            await Swal.fire({
                title: 'خطأ',
                text: error.message || 'فشل في إضافة المورد',
                icon: 'error',
                confirmButtonText: 'موافق'
            });
        } finally {
            // Always reset the flag and button state
            isSubmittingSupplier = false;
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
                if (modal.id === 'addSupplierModal') {
                    closeAddSupplierModal();
                }
            }
        });
    });
}

// Load suppliers data
async function loadSuppliers() {
    showInlineLoader('suppliersContainer', 'جاري تحميل الموردين...');
    try {
        suppliersData = await fetchSuppliers();
        renderSuppliers(suppliersData);
    } catch (error) {
        console.error('Error loading suppliers:', error);
        const container = document.getElementById('suppliersContainer');
        container.innerHTML = `
            <div class="error-state">
                <div class="error-icon"><i class="fas fa-times-circle"></i></div>
                <div class="error-text">خطأ في تحميل بيانات الموردين</div>
                <div class="error-details">${error.message}</div>
                <button class="btn btn-primary" onclick="loadSuppliers()">إعادة المحاولة</button>
            </div>
        `;
    }
}

// Delete supplier function
async function deleteSupplier(supplierId, supplierName) {
    try {
        const result = await Swal.fire({
            title: 'تأكيد الحذف',
            text: `هل أنت متأكد من حذف المورد "${supplierName}"؟`,
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

        Swal.fire({
            title: 'جاري الحذف...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const response = await authManager.makeAuthenticatedRequest(`${window.API_BASE}/suppliers/${supplierId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'فشل في حذف المورد');
        }

        await Swal.fire({
            title: 'تم الحذف بنجاح',
            text: data.message,
            icon: 'success',
            confirmButtonText: 'موافق'
        });

        loadSuppliers();

    } catch (error) {
        console.error('Delete supplier error:', error);

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
        await loadSupplierProjects();
        
        // Add supplier button
        document.getElementById('addSupplierBtn').addEventListener('click', () => {
            showAddSupplierModal();
        });

        // Add opening balance button
        document.getElementById('addSupplierOpeningBalanceBtn').addEventListener('click', addSupplierOpeningBalanceRow);
        
        // Setup other event handlers
        setupEventHandlers();
        
        // Load suppliers
        loadSuppliers();
    }
});

// Make functions available globally
window.showAddSupplierModal = showAddSupplierModal;
window.closeAddSupplierModal = closeAddSupplierModal;
window.deleteSupplier = deleteSupplier;
window.addMaterial = addMaterial;
window.removeMaterial = removeMaterial;


// Opening balances management for suppliers
let supplierOpeningBalanceCounter = 0;
let supplierProjectsList = [];

// Load projects for dropdown
async function loadSupplierProjects() {
    try {
        const resp = await authManager.makeAuthenticatedRequest(`${window.API_BASE}/clients`);
        if (!resp.ok) throw new Error('Failed to load clients');
        const data = await resp.json();
        console.log('Supplier clients API response:', data);
        supplierProjectsList = data.clients || data;
        console.log('Supplier clients loaded:', supplierProjectsList.length, 'clients');
    } catch (error) {
        console.error('Error loading clients:', error);
        supplierProjectsList = [];
    }
}

// Add opening balance row for supplier
function addSupplierOpeningBalanceRow() {
    console.log('Adding supplier opening balance row, projects available:', supplierProjectsList.length);
    
    if (supplierProjectsList.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'تنبيه',
            text: 'لا توجد عملاء متاحين. يرجى إضافة عميل أولاً من صفحة العملاء.',
            confirmButtonText: 'حسناً'
        });
        return;
    }
    
    const container = document.getElementById('supplierOpeningBalancesContainer');
    const rowId = `supplierOpeningBalance_${supplierOpeningBalanceCounter++}`;

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
    projectSelect.className = 'form-input-modern supplier-opening-balance-project';
    projectSelect.style.padding = '0.5rem 0.75rem';
    projectSelect.style.fontSize = '0.8125rem';
    projectSelect.required = true;
    projectSelect.innerHTML = '<option value="">اختر العميل</option>';
    supplierProjectsList.forEach(project => {
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
    amountInput.className = 'form-input-modern supplier-opening-balance-amount';
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
    descInput.className = 'form-input-modern supplier-opening-balance-description';
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

// Get opening balances from supplier form
function getSupplierOpeningBalances() {
    const rows = document.querySelectorAll('.opening-balance-row');
    const balances = [];

    rows.forEach(row => {
        const project = row.querySelector('.supplier-opening-balance-project')?.value;
        const amountInput = row.querySelector('.supplier-opening-balance-amount');
        const amount = amountInput ? parseFloat(amountInput.value) : null;
        const description = row.querySelector('.supplier-opening-balance-description')?.value;

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

// Initialize opening balance button for suppliers
// (Removed - now handled in main DOMContentLoaded)




// Search functionality
let currentSupplierSearch = '';

function filterSuppliers() {
    const searchTerm = currentSupplierSearch.toLowerCase().trim();
    
    if (!searchTerm) {
        renderSuppliers(suppliersData);
        return;
    }
    
    const filtered = suppliersData.filter(supplier => {
        return supplier.name && supplier.name.toLowerCase().includes(searchTerm);
    });
    
    renderSuppliers(filtered);
}

// Setup search event listeners
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('supplierSearch');
    const searchBtn = document.getElementById('searchBtn');
    const clearBtn = document.getElementById('clearSearchBtn');
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSupplierSearch = e.target.value;
            filterSuppliers();
        });
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                currentSupplierSearch = e.target.value;
                filterSuppliers();
            }
        });
    }
    
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            currentSupplierSearch = searchInput.value;
            filterSuppliers();
        });
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            currentSupplierSearch = '';
            if (searchInput) searchInput.value = '';
            filterSuppliers();
        });
    }
});
