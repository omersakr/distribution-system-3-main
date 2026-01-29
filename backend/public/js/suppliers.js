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
let suppliersData = [];

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
    detailsBtn.className = 'btn btn-sm btn-primary';
    detailsBtn.innerHTML = '📊 التفاصيل';
    detailsBtn.onclick = () => window.location.href = `supplier-details.html?id=${supplier.id}`;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-sm btn-danger';
    deleteBtn.innerHTML = '🗑️ حذف';
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
        { label: 'عدد التسليمات', value: supplier.deliveries_count || 0 }, // Fixed: use deliveries_count from backend
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
                <div class="empty-icon">🏭</div>
                <div class="empty-text">لا توجد موردين مسجلين</div>
                <button class="btn btn-primary" onclick="showModal('addSupplierModal')">
                    إضافة مورد جديد
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

// Material management functions
function addMaterial() {
    const container = document.getElementById('materialsContainer');
    const materialItem = document.createElement('div');
    materialItem.className = 'material-item';
    materialItem.innerHTML = `
        <div class="form-group">
            <label>اسم المادة</label>
            <input type="text" name="material_name" placeholder="اسم المادة" required>
        </div>
        <div class="form-group">
            <label>السعر (جنيه/وحدة)</label>
            <input type="number" name="material_price" step="0.01" min="0" placeholder="0.00" required>
        </div>
        <button type="button" class="btn btn-sm btn-danger" onclick="removeMaterial(this)">حذف</button>
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
    const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/suppliers`);
    if (!response.ok) {
        throw new Error('فشل في تحميل بيانات الموردين');
    }
    const data = await response.json();
    return data.suppliers || data;
}

async function createSupplier(supplierData) {
    const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/suppliers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supplierData)
    });

    if (!response.ok) {
        throw new Error('فشل في إضافة المورد');
    }

    return response.json();
}

// Event handlers
function setupEventHandlers() {
    // Add supplier button
    document.getElementById('addSupplierBtn').addEventListener('click', () => {
        showModal('addSupplierModal');
    });

    // Add supplier form
    document.getElementById('addSupplierForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(e.target);
        const materials = [];

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
            phone: formData.get('phone'),
            materials: materials,
            status: 'Active'
        };

        try {
            await createSupplier(supplierData);
            showMessage('addSupplierMessage', 'تم إضافة المورد بنجاح', 'success');

            setTimeout(() => {
                closeModal('addSupplierModal');
                loadSuppliers();
                e.target.reset();
                // Reset materials container
                const container = document.getElementById('materialsContainer');
                container.innerHTML = `
                    <div class="material-item">
                        <div class="form-group">
                            <label>اسم المادة</label>
                            <input type="text" name="material_name" placeholder="اسم المادة" required>
                        </div>
                        <div class="form-group">
                            <label>السعر (جنيه/وحدة)</label>
                            <input type="number" name="material_price" step="0.01" min="0" placeholder="0.00" required>
                        </div>
                        <button type="button" class="btn btn-sm btn-danger" onclick="removeMaterial(this)">حذف</button>
                    </div>
                `;
            }, 1000);
        } catch (error) {
            showMessage('addSupplierMessage', error.message, 'error');
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

// Load suppliers data
async function loadSuppliers() {
    try {
        suppliersData = await fetchSuppliers();
        renderSuppliers(suppliersData);
    } catch (error) {
        console.error('Error loading suppliers:', error);
        const container = document.getElementById('suppliersContainer');
        container.innerHTML = `
            <div class="error-state">
                <div class="error-icon">❌</div>
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

        const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/suppliers/${supplierId}`, {
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
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication first
    if (authManager.checkAuth()) {
        setupEventHandlers();
        loadSuppliers();
    }
});

// Make functions available globally
window.showModal = showModal;
window.closeModal = closeModal;
window.deleteSupplier = deleteSupplier;
window.addMaterial = addMaterial;
window.removeMaterial = removeMaterial;