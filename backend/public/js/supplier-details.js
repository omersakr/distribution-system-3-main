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
let supplierData = null;
let allDeliveries = [];
let allPayments = [];
let allAdjustments = [];

// Helpers
function getSupplierIdFromURL() {
    return new URLSearchParams(window.location.search).get('id');
}

function formatCurrency(amount) {
    return Number(amount || 0).toLocaleString('ar-EG', {
        style: 'currency',
        currency: 'EGP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatQuantity(amount) {
    return Number(amount || 0).toLocaleString('ar-EG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Render Functions
function renderSummary(totals) {
    const container = document.getElementById('summaryGrid');
    const balance = totals.balance || 0;

    // Balance logic for suppliers: Positive = we owe them (مستحق للمورد), Negative = they owe us (مدفوع زائد)
    const balanceClass = balance > 0 ? 'text-danger' : balance < 0 ? 'text-success' : '';
    const balanceLabel = balance > 0 ? '(مستحق للمورد)' : balance < 0 ? '(مدفوع زائد)' : '';

    container.innerHTML = `
        <div class="summary-item">
            <div class="summary-value text-danger">${formatCurrency(totals.total_due || 0)}</div>
            <div class="summary-label">إجمالي المستحق</div>
        </div>
        <div class="summary-item">
            <div class="summary-value text-success">${formatCurrency(totals.total_paid || 0)}</div>
            <div class="summary-label">إجمالي المدفوع</div>
        </div>
        <div class="summary-item">
            <div class="summary-value">${totals.deliveries_count || 0}</div>
            <div class="summary-label">عدد التسليمات</div>
        </div>
        <div class="summary-item">
            <div class="summary-value ${balanceClass}">${formatCurrency(Math.abs(balance))} <small style="font-size: 0.75rem;">${balanceLabel}</small></div>
            <div class="summary-label">الرصيد الصافي</div>
        </div>
    `;
}

function renderMaterials(materials) {
    const container = document.getElementById('materialsContainer');

    if (!materials || materials.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📦</div>
                <div>لا توجد مواد</div>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    materials.forEach(material => {
        const card = document.createElement('div');
        card.className = 'material-card';
        card.style.position = 'relative';
        card.innerHTML = `
            <div class="material-title">${material.name}</div>
            <div class="material-stat">
                <span>السعر لكل وحدة:</span>
                <strong>${formatCurrency(material.price_per_unit)}</strong>
            </div>
            <div style="margin-top: 12px; display: flex; gap: 8px; justify-content: flex-end;">
                <button class="btn btn-sm btn-secondary crud-btn" data-action="edit" data-type="material" data-id="${material.id}" title="تعديل">✏️</button>
                <button class="btn btn-sm btn-danger crud-btn" data-action="delete" data-type="material" data-id="${material.id}" title="حذف">🗑️</button>
            </div>
        `;
        container.appendChild(card);
    });
}

function renderDeliveries(deliveries) {
    const container = document.getElementById('deliveriesContainer');

    if (!deliveries || deliveries.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🚚</div>
                <div>لا توجد تسليمات مسجلة</div>
            </div>
        `;
        return;
    }

    const table = document.createElement('table');
    table.className = 'table';

    // Header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = ['التاريخ', 'العميل', 'المادة', 'الكمية', 'السعر', 'الإجمالي'];

    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');
    deliveries.forEach(delivery => {
        const row = document.createElement('tr');

        const cells = [
            formatDate(delivery.delivery_date),
            delivery.client_name || '-',
            delivery.material_type || '-',
            formatQuantity(delivery.net_quantity) + ' م³',
            formatCurrency(delivery.material_price_at_time),
            formatCurrency(delivery.total_cost)
        ];

        cells.forEach(cellText => {
            const td = document.createElement('td');
            td.textContent = cellText;
            row.appendChild(td);
        });

        tbody.appendChild(row);
    });
    table.appendChild(tbody);

    container.innerHTML = '';
    container.appendChild(table);
}

function renderPayments(payments) {
    const container = document.getElementById('paymentsContainer');

    if (!payments || payments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">💰</div>
                <div>لا توجد مدفوعات مسجلة</div>
            </div>
        `;
        return;
    }

    const table = document.createElement('table');
    table.className = 'table';

    // Header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = ['التاريخ', 'المبلغ', 'طريقة الدفع', 'التفاصيل', 'ملاحظات', 'الصورة', 'إجراءات'];

    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');
    payments.forEach(payment => {
        const row = document.createElement('tr');

        const cells = [
            formatDate(payment.paid_at),
            formatCurrency(payment.amount),
            payment.method || '-',
            payment.details || '-',
            payment.note || '-'
        ];

        cells.forEach(cellText => {
            const td = document.createElement('td');
            td.textContent = cellText;
            row.appendChild(td);
        });

        // Image cell
        const imageCell = document.createElement('td');
        if (payment.payment_image) {
            imageCell.innerHTML = `
                <button class="btn btn-sm btn-secondary" data-image="${payment.payment_image}" onclick="showImageModal(this.getAttribute('data-image'))" title="عرض الصورة">
                    🖼️ عرض
                </button>
            `;
        } else {
            imageCell.textContent = '-';
        }
        row.appendChild(imageCell);

        // Actions cell
        const actionsCell = document.createElement('td');
        actionsCell.innerHTML = `
            <button class="btn btn-sm btn-secondary crud-btn" data-action="view" data-type="payment" data-id="${payment.id}" title="عرض التفاصيل">👁️</button>
            <button class="btn btn-sm btn-secondary crud-btn" data-action="edit" data-type="payment" data-id="${payment.id}" title="تعديل">✏️</button>
            <button class="btn btn-sm btn-danger crud-btn" data-action="delete" data-type="payment" data-id="${payment.id}" title="حذف">🗑️</button>
        `;
        row.appendChild(actionsCell);

        tbody.appendChild(row);
    });
    table.appendChild(tbody);

    container.innerHTML = '';
    container.appendChild(table);
}

function renderAdjustments(adjustments) {
    const container = document.getElementById('adjustmentsContainer');

    if (!adjustments || adjustments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚖️</div>
                <div>لا توجد تسويات مسجلة</div>
            </div>
        `;
        return;
    }

    const table = document.createElement('table');
    table.className = 'table';

    // Header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = ['التاريخ', 'المبلغ', 'طريقة التسوية', 'التفاصيل', 'السبب', 'الصورة', 'إجراءات'];

    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');
    adjustments.forEach(adjustment => {
        const row = document.createElement('tr');

        const amountCell = document.createElement('td');
        const amount = adjustment.amount || 0;

        // For suppliers: Positive adjustment = we owe them more (مستحق للمورد), Negative adjustment = they owe us (مدفوع زائد)
        amountCell.className = amount > 0 ? 'text-danger' : amount < 0 ? 'text-success' : '';
        const label = amount > 0 ? '(مستحق للمورد)' : amount < 0 ? '(مدفوع زائد)' : '';
        amountCell.innerHTML = `${formatCurrency(Math.abs(amount))} <small style="font-size: 0.75rem;">${label}</small>`;

        const cells = [
            formatDate(adjustment.created_at),
            amountCell,
            adjustment.method || '-',
            adjustment.details || '-',
            adjustment.reason || '-'
        ];

        cells.forEach((cell, index) => {
            if (index === 1) {
                row.appendChild(cell);
            } else {
                const td = document.createElement('td');
                td.textContent = cell;
                row.appendChild(td);
            }
        });

        // Image cell
        const imageCell = document.createElement('td');
        if (adjustment.payment_image) {
            imageCell.innerHTML = `
                <button class="btn btn-sm btn-secondary" data-image="${adjustment.payment_image}" onclick="showImageModal(this.getAttribute('data-image'))" title="عرض الصورة">
                    🖼️ عرض
                </button>
            `;
        } else {
            imageCell.textContent = '-';
        }
        row.appendChild(imageCell);

        // Actions cell
        const actionsCell = document.createElement('td');
        actionsCell.innerHTML = `
            <button class="btn btn-sm btn-secondary crud-btn" data-action="view" data-type="adjustment" data-id="${adjustment.id}" title="عرض التفاصيل">👁️</button>
            <button class="btn btn-sm btn-secondary crud-btn" data-action="edit" data-type="adjustment" data-id="${adjustment.id}" title="تعديل">✏️</button>
            <button class="btn btn-sm btn-danger crud-btn" data-action="delete" data-type="adjustment" data-id="${adjustment.id}" title="حذف">🗑️</button>
        `;
        row.appendChild(actionsCell);

        tbody.appendChild(row);
    });
    table.appendChild(tbody);

    container.innerHTML = '';
    container.appendChild(table);
}

// Modal Functions
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';

        // Clear any previous messages
        const messageElements = modal.querySelectorAll('[id$="Message"]');
        messageElements.forEach(el => el.innerHTML = '');

        // Reset form to add mode if not already in edit mode
        if (modalId === 'paymentModal') {
            const form = document.getElementById('addPaymentForm');
            if (!form.dataset.editId) {
                resetPaymentForm();
            }
        } else if (modalId === 'adjustmentModal') {
            const form = document.getElementById('adjustmentForm');
            if (!form.dataset.editId) {
                resetAdjustmentForm();
            }
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';

        // Clear messages when closing
        const messageElements = modal.querySelectorAll('[id$="Message"]');
        messageElements.forEach(el => el.innerHTML = '');

        // Always reset forms when closing
        if (modalId === 'addPaymentModal') {
            resetPaymentForm();
        } else if (modalId === 'adjustmentModal') {
            resetAdjustmentForm();
        } else if (modalId === 'addMaterialModal') {
            resetMaterialForm();
        }
    }
}

function resetPaymentForm() {
    const form = document.getElementById('addPaymentForm');
    form.reset();
    delete form.dataset.editId;

    // Set default date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('paymentDate').value = today;
}

function resetAdjustmentForm() {
    const form = document.getElementById('adjustmentForm');
    form.reset();
    delete form.dataset.editId;
}

function showMessage(elementId, message, type) {
    const msgDiv = document.getElementById(elementId);
    if (msgDiv) {
        msgDiv.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
    }
}

// Material CRUD Functions
async function addMaterial(materialData) {
    try {
        const supplierId = getSupplierIdFromURL();
        const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/suppliers/${supplierId}/materials`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(materialData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'فشل في إضافة المادة');
        }

        return await response.json();
    } catch (error) {
        console.error('Error adding material:', error);
        throw error;
    }
}

async function editMaterial(materialId) {
    try {
        // Find material in current data
        const material = supplierData.supplier.materials.find(m => m.id === materialId);
        if (!material) {
            alert('لم يتم العثور على المادة');
            return;
        }

        // Populate form with existing data
        document.getElementById('materialName').value = material.name;
        document.getElementById('materialPrice').value = material.price_per_unit;

        // Change form to edit mode
        const form = document.getElementById('addMaterialForm');
        form.dataset.editId = materialId;

        // Update modal title
        document.querySelector('#addMaterialModal .modal-header h2').textContent = 'تعديل المادة';

        showModal('addMaterialModal');
    } catch (error) {
        console.error('Error editing material:', error);
        alert('حدث خطأ في تحميل بيانات المادة');
    }
}

async function updateMaterial(materialId, materialData) {
    try {
        const supplierId = getSupplierIdFromURL();
        const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/suppliers/${supplierId}/materials/${materialId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(materialData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'فشل في تحديث المادة');
        }

        return await response.json();
    } catch (error) {
        console.error('Error updating material:', error);
        throw error;
    }
}

async function deleteMaterial(materialId) {
    if (!confirm('هل أنت متأكد من حذف هذه المادة؟ سيتم حذف جميع التسليمات المرتبطة بها.')) {
        return;
    }

    try {
        const supplierId = getSupplierIdFromURL();
        const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/suppliers/${supplierId}/materials/${materialId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'فشل في حذف المادة');
        }

        alert('تم حذف المادة بنجاح');
        loadSupplierDetails(); // Reload data
    } catch (error) {
        console.error('Error deleting material:', error);
        alert('حدث خطأ في حذف المادة: ' + error.message);
    }
}

function resetMaterialForm() {
    const form = document.getElementById('addMaterialForm');
    form.reset();
    delete form.dataset.editId;

    // Reset modal title
    document.querySelector('#addMaterialModal .modal-header h2').textContent = 'إضافة مادة جديدة';
}

// CRUD Functions
async function editPayment(paymentId) {
    try {
        // Find payment in current data
        const payment = allPayments.find(p => p.id === paymentId);
        if (!payment) {
            alert('لم يتم العثور على الدفعة');
            return;
        }

        // Populate form with existing data
        document.getElementById('paymentAmount').value = payment.amount;
        document.getElementById('paymentMethod').value = payment.method || '';
        document.getElementById('paymentDetails').value = payment.details || '';
        document.getElementById('paymentDate').value = payment.paid_at ? payment.paid_at.split('T')[0] : '';
        document.getElementById('paymentNotes').value = payment.note || '';

        // Change form to edit mode
        const form = document.getElementById('addPaymentForm');
        form.dataset.editId = paymentId;

        showModal('addPaymentModal');
    } catch (error) {
        console.error('Error editing payment:', error);
        alert('حدث خطأ في تحميل بيانات الدفعة');
    }
}

async function deletePayment(paymentId) {
    if (!confirm('هل أنت متأكد من حذف هذه الدفعة؟')) {
        return;
    }

    try {
        const supplierId = getSupplierIdFromURL();
        const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/suppliers/${supplierId}/payments/${paymentId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('فشل في حذف الدفعة');
        }

        alert('تم حذف الدفعة بنجاح');
        loadSupplierDetails(); // Reload data
    } catch (error) {
        console.error('Error deleting payment:', error);
        alert('حدث خطأ في حذف الدفعة');
    }
}

// View adjustment details
async function showAdjustmentDetails(adjustmentId) {
    try {
        // Find adjustment in current data
        const adjustment = allAdjustments.find(a => a.id === adjustmentId);
        if (!adjustment) {
            alert('لم يتم العثور على التسوية');
            return;
        }

        // Create details content
        const amount = adjustment.amount || 0;
        const amountClass = amount > 0 ? 'text-danger' : amount < 0 ? 'text-success' : '';
        const amountLabel = amount > 0 ? '(مستحق للمورد)' : amount < 0 ? '(مدفوع زائد)' : '';

        let detailsHTML = `
            <div style="display: grid; gap: 15px;">
                <div class="detail-row">
                    <strong>التاريخ:</strong>
                    <span>${formatDate(adjustment.created_at)}</span>
                </div>
                <div class="detail-row">
                    <strong>المبلغ:</strong>
                    <span class="${amountClass}">${formatCurrency(Math.abs(amount))} <small>${amountLabel}</small></span>
                </div>
                <div class="detail-row">
                    <strong>طريقة التسوية:</strong>
                    <span>${adjustment.method || 'غير محدد'}</span>
                </div>
                <div class="detail-row">
                    <strong>التفاصيل:</strong>
                    <span>${adjustment.details || 'لا توجد تفاصيل'}</span>
                </div>
                <div class="detail-row">
                    <strong>السبب:</strong>
                    <span>${adjustment.reason || 'غير محدد'}</span>
                </div>
        `;

        // Add image if exists
        if (adjustment.payment_image) {
            detailsHTML += `
                <div class="detail-row">
                    <strong>الصورة:</strong>
                    <div>
                        <button class="btn btn-sm btn-secondary" onclick="showImageModal('${adjustment.payment_image}')" style="margin-top: 5px;">
                            🖼️ عرض الصورة
                        </button>
                    </div>
                </div>
            `;
        }

        detailsHTML += `</div>`;

        // Populate modal content
        document.getElementById('adjustmentDetailsContent').innerHTML = detailsHTML;

        // Show modal
        showModal('adjustmentDetailsModal');
    } catch (error) {
        console.error('Error viewing adjustment:', error);
        alert('حدث خطأ في عرض تفاصيل التسوية');
    }
}

// View payment details
async function showPaymentDetails(paymentId) {
    try {
        // Find payment in current data
        const payment = allPayments.find(p => p.id === paymentId);
        if (!payment) {
            alert('لم يتم العثور على الدفعة');
            return;
        }

        // Create details content
        let detailsHTML = `
            <div style="display: grid; gap: 15px;">
                <div class="detail-row">
                    <strong>التاريخ:</strong>
                    <span>${formatDate(payment.paid_at)}</span>
                </div>
                <div class="detail-row">
                    <strong>المبلغ:</strong>
                    <span class="text-success">${formatCurrency(payment.amount)}</span>
                </div>
                <div class="detail-row">
                    <strong>طريقة الدفع:</strong>
                    <span>${payment.method || 'غير محدد'}</span>
                </div>
        `;

        // Add details if exists
        if (payment.details) {
            detailsHTML += `
                <div class="detail-row">
                    <strong>التفاصيل:</strong>
                    <span>${payment.details}</span>
                </div>
            `;
        }

        // Add notes if exists
        if (payment.note) {
            detailsHTML += `
                <div class="detail-row">
                    <strong>الملاحظات:</strong>
                    <span>${payment.note}</span>
                </div>
            `;
        }

        // Add image if exists
        if (payment.payment_image) {
            detailsHTML += `
                <div class="detail-row">
                    <strong>الصورة:</strong>
                    <div>
                        <button class="btn btn-sm btn-secondary" onclick="showImageModal('${payment.payment_image}')" style="margin-top: 5px;">
                            🖼️ عرض الصورة
                        </button>
                    </div>
                </div>
            `;
        }

        detailsHTML += `</div>`;

        // Populate modal content
        document.getElementById('paymentDetailsContent').innerHTML = detailsHTML;

        // Show modal
        showModal('paymentDetailsModal');
    } catch (error) {
        console.error('Error viewing payment:', error);
        alert('حدث خطأ في عرض تفاصيل الدفعة');
    }
}

async function editAdjustment(adjustmentId) {
    try {
        // Find adjustment in current data
        const adjustment = allAdjustments.find(a => a.id === adjustmentId);
        if (!adjustment) {
            alert('لم يتم العثور على التسوية');
            return;
        }

        // Populate form with existing data
        document.getElementById('adjustmentAmount').value = adjustment.amount;
        document.getElementById('adjustmentReason').value = adjustment.reason || '';

        // Change form to edit mode
        const form = document.getElementById('adjustmentForm');
        form.dataset.editId = adjustmentId;

        showModal('adjustmentModal');
    } catch (error) {
        console.error('Error editing adjustment:', error);
        alert('حدث خطأ في تحميل بيانات التسوية');
    }
}

async function deleteAdjustment(adjustmentId) {
    if (!confirm('هل أنت متأكد من حذف هذه التسوية؟')) {
        return;
    }

    try {
        const supplierId = getSupplierIdFromURL();
        const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/suppliers/${supplierId}/adjustments/${adjustmentId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('فشل في حذف التسوية');
        }

        alert('تم حذف التسوية بنجاح');
        loadSupplierDetails(); // Reload data
    } catch (error) {
        console.error('Error deleting adjustment:', error);
        alert('حدث خطأ في حذف التسوية');
    }
}

// Main Load Function
async function loadSupplierDetails() {
    const supplierId = getSupplierIdFromURL();

    if (!supplierId) {
        document.querySelector('.main-content').innerHTML = `
            <div class="error">
                <h2>خطأ</h2>
                <p>لم يتم تحديد المورد</p>
                <a href="suppliers.html" class="btn btn-primary">العودة للموردين</a>
            </div>
        `;
        return;
    }

    try {
        const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/suppliers/${supplierId}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: فشل في تحميل بيانات المورد`);
        }

        const data = await response.json();
        supplierData = data;

        // Store data for filtering
        allDeliveries = data.deliveries || [];
        allPayments = data.payments || [];
        allAdjustments = []; // No adjustments in supplier API yet

        // Update page title
        document.getElementById('supplierName').textContent = `تفاصيل المورد: ${data.supplier.name}`;

        // Render all sections
        renderSummary(data.totals || {});
        renderMaterials(data.supplier.materials || []);
        renderDeliveries(allDeliveries);
        renderPayments(allPayments);
        renderAdjustments(allAdjustments);

    } catch (error) {
        console.error('Error loading supplier details:', error);
        document.querySelector('.main-content').innerHTML = `
            <div class="error">
                <h2>خطأ في تحميل البيانات</h2>
                <p>${error.message}</p>
                <a href="suppliers.html" class="btn btn-primary">العودة للموردين</a>
            </div>
        `;
    }
}

// Event Handlers
function setupEventHandlers() {
    // Add Material
    document.getElementById('addMaterialBtn').addEventListener('click', () => {
        resetMaterialForm();
        showModal('addMaterialModal');
    });

    // Add Material Form
    document.getElementById('addMaterialForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(e.target);
        const materialData = {
            name: formData.get('name'),
            price_per_unit: parseFloat(formData.get('price_per_unit'))
        };

        try {
            const form = e.target;
            const editId = form.dataset.editId;

            if (editId) {
                // Update existing material
                await updateMaterial(editId, materialData);
                alert('تم تحديث المادة بنجاح');
            } else {
                // Add new material
                await addMaterial(materialData);
                alert('تم إضافة المادة بنجاح');
            }

            closeModal('addMaterialModal');
            resetMaterialForm();
            loadSupplierDetails();
        } catch (error) {
            alert('خطأ: ' + error.message);
        }
    });

    // Edit Supplier
    document.getElementById('editSupplierBtn').addEventListener('click', () => {
        if (supplierData) {
            document.getElementById('editSupplierName').value = supplierData.supplier.name || '';
            document.getElementById('editSupplierPhone').value = supplierData.supplier.phone_number || '';
            document.getElementById('editSupplierNotes').value = supplierData.supplier.notes || '';
            showModal('editSupplierModal');
        }
    });

    // Edit Supplier Form
    document.getElementById('editSupplierForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(e.target);
        const supplierUpdateData = Object.fromEntries(formData);

        try {
            const supplierId = getSupplierIdFromURL();
            const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/suppliers/${supplierId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(supplierUpdateData)
            });

            if (response.ok) {
                alert('تم تحديث بيانات المورد بنجاح');
                closeModal('editSupplierModal');
                loadSupplierDetails();
            } else {
                throw new Error('فشل في تحديث البيانات');
            }
        } catch (error) {
            alert('خطأ: ' + error.message);
        }
    });

    // Add Payment
    document.getElementById('addPaymentBtn').addEventListener('click', () => {
        document.getElementById('paymentDate').value = new Date().toISOString().split('T')[0];
        showModal('addPaymentModal');
    });

    // Add Payment Form
    document.getElementById('addPaymentForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(e.target);
        const paymentData = Object.fromEntries(formData);

        try {
            const supplierId = getSupplierIdFromURL();
            const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/suppliers/${supplierId}/payments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(paymentData)
            });

            if (response.ok) {
                alert('تم إضافة الدفعة بنجاح');
                closeModal('addPaymentModal');
                document.getElementById('addPaymentForm').reset();
                loadSupplierDetails();
            } else {
                throw new Error('فشل في إضافة الدفعة');
            }
        } catch (error) {
            alert('خطأ: ' + error.message);
        }
    });

    // Add Adjustment
    document.getElementById('addAdjustmentBtn').addEventListener('click', () => {
        showModal('adjustmentModal');
    });

    // Add Adjustment Form
    document.getElementById('adjustmentForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(e.target);
        const adjustmentData = Object.fromEntries(formData);

        try {
            const supplierId = getSupplierIdFromURL();
            const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/suppliers/${supplierId}/adjustments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(adjustmentData)
            });

            if (response.ok) {
                alert('تم إضافة التسوية بنجاح');
                closeModal('adjustmentModal');
                document.getElementById('adjustmentForm').reset();
                loadSupplierDetails();
            } else {
                throw new Error('فشل في إضافة التسوية');
            }
        } catch (error) {
            alert('خطأ: ' + error.message);
        }
    });

    // Modal close buttons
    document.querySelectorAll('.modal-close, .btn-secondary').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const modal = btn.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });

    // Close modal when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

// Initialize page
document.addEventListener('DOMContentLoaded', function () {
    // Check authentication
    if (!authManager.checkAuth()) {
        return;
    }

    // Get supplier ID from URL
    const supplierId = getSupplierIdFromURL();
    if (!supplierId) {
        alert('معرف المورد غير صحيح');
        window.location.href = 'suppliers.html';
        return;
    }

    // Setup event handlers
    setupEventHandlers();

    // Load supplier details
    loadSupplierDetails();

    // Setup report button handlers
    document.getElementById('generateDeliveriesReportBtn').addEventListener('click', generateDeliveriesReport);
    document.getElementById('generateAccountStatementBtn').addEventListener('click', generateAccountStatement);
    document.getElementById('useCustomDateRange').addEventListener('change', toggleDateRange);
});

// Event delegation for CSP compliance
document.addEventListener('click', function (e) {
    // Handle modal close buttons
    if (e.target.classList.contains('modal-close')) {
        const modal = e.target.closest('.modal');
        if (modal) {
            closeModal(modal.id);
        }
    }

    // Handle cancel buttons in modals
    if (e.target.textContent === 'إلغاء' && e.target.classList.contains('btn-secondary')) {
        const modal = e.target.closest('.modal');
        if (modal) {
            closeModal(modal.id);
        }
    }

    // Handle CRUD operations for dynamically created buttons
    if (e.target.classList.contains('crud-btn')) {
        e.preventDefault();
        e.stopPropagation();

        const action = e.target.getAttribute('data-action');
        const type = e.target.getAttribute('data-type');
        const id = e.target.getAttribute('data-id');

        if (!action || !type || !id) {
            console.error('Missing required attributes:', { action, type, id });
            return;
        }

        try {
            if (type === 'material') {
                if (action === 'edit') {
                    editMaterial(id);
                } else if (action === 'delete') {
                    deleteMaterial(id);
                }
            } else if (action === 'view' && type === 'payment') {
                showPaymentDetails(id);
            } else if (action === 'edit' && type === 'payment') {
                editPayment(id);
            } else if (action === 'delete' && type === 'payment') {
                deletePayment(id);
            } else if (action === 'view' && type === 'adjustment') {
                showAdjustmentDetails(id);
            } else if (action === 'edit' && type === 'adjustment') {
                editAdjustment(id);
            } else if (action === 'delete' && type === 'adjustment') {
                deleteAdjustment(id);
            }
        } catch (error) {
            console.error('Error executing CRUD operation:', error);
        }

        return;
    }
});

// Global functions for onclick handlers
window.closeModal = closeModal;
window.showImageModal = function (imageData) {
    const modalImage = document.getElementById('modalImage');

    if (!imageData || imageData === 'null' || imageData === 'undefined' || imageData.trim() === '') {
        alert('لا توجد صورة لعرضها');
        return;
    }

    modalImage.onerror = null;
    modalImage.onload = null;

    modalImage.onerror = function () {
        alert('فشل في تحميل الصورة - البيانات قد تكون تالفة أو كبيرة جداً');
        closeModal('imageModal');
    };

    try {
        let imageSrc = '';

        if (imageData.startsWith('data:image/')) {
            imageSrc = imageData;
        } else if (imageData.startsWith('http')) {
            imageSrc = imageData;
        } else {
            let imageFormat = 'png';
            if (imageData.startsWith('/9j')) {
                imageFormat = 'jpeg';
            } else if (imageData.startsWith('iVBORw0KGgo')) {
                imageFormat = 'png';
            } else if (imageData.startsWith('R0lGOD')) {
                imageFormat = 'gif';
            }
            imageSrc = `data:image/${imageFormat};base64,${imageData}`;
        }

        if (imageSrc.startsWith('data:image/')) {
            const base64Part = imageSrc.split(',')[1];
            if (!base64Part || base64Part.length < 10) {
                throw new Error('Invalid base64 data');
            }
        }

        modalImage.src = imageSrc;
        showModal('imageModal');

    } catch (error) {
        console.error('Error processing image data:', error);
        alert('خطأ في معالجة بيانات الصورة: ' + error.message);
    }
};

// PDF Report Functions
window.generateDeliveriesReport = async function () {
    const supplierId = getSupplierIdFromURL();
    const fromDate = document.getElementById('deliveriesFromDate').value;
    const toDate = document.getElementById('deliveriesToDate').value;

    if (!fromDate || !toDate) {
        alert('يرجى تحديد تاريخ البداية والنهاية');
        return;
    }

    try {
        // Use simple GET request since reports are now public (no auth required)
        const url = `${API_BASE}/suppliers/${supplierId}/reports/deliveries?from=${fromDate}&to=${toDate}`;

        // Open the report directly in a new window
        window.open(url, '_blank');

    } catch (error) {
        console.error('Error generating deliveries report:', error);
        alert('حدث خطأ في إنشاء التقرير');
    }
};

window.generateAccountStatement = async function () {
    const supplierId = getSupplierIdFromURL();
    const useCustomRange = document.getElementById('useCustomDateRange').checked;

    let url = `${API_BASE}/suppliers/${supplierId}/reports/statement`;

    if (useCustomRange) {
        const fromDate = document.getElementById('statementFromDate').value;
        const toDate = document.getElementById('statementToDate').value;

        if (!fromDate || !toDate) {
            alert('يرجى تحديد تاريخ البداية والنهاية');
            return;
        }

        url += `?from=${fromDate}&to=${toDate}`;
    }

    try {
        // Open the report directly in a new window (no auth required)
        window.open(url, '_blank');

    } catch (error) {
        console.error('Error generating account statement:', error);
        alert('حدث خطأ في إنشاء كشف الحساب');
    }
};

// Toggle date range inputs
window.toggleDateRange = function () {
    const checkbox = document.getElementById('useCustomDateRange');
    const dateInputs = document.getElementById('dateRangeInputs');

    if (checkbox.checked) {
        dateInputs.style.display = 'block';
        const today = new Date().toISOString().split('T')[0];
        const firstOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
        document.getElementById('statementFromDate').value = firstOfYear;
        document.getElementById('statementToDate').value = today;
    } else {
        dateInputs.style.display = 'none';
    }
};

// Global functions for modal controls
window.closeAddMaterialModal = () => closeModal('addMaterialModal');
window.closeAddPaymentModal = () => closeModal('addPaymentModal');