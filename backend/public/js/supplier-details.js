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
    const totalAdjustments = totals.total_adjustments || 0;
    const openingBalance = totals.opening_balance || 0;

    // Balance logic for suppliers: Positive = we owe them (مستحق للمورد), Negative = they owe us (مدفوع زائد)
    const balanceClass = balance > 0 ? 'text-danger' : balance < 0 ? 'text-success' : '';
    const balanceLabel = balance > 0 ? '(مستحق للمورد)' : balance < 0 ? '(مدفوع زائد)' : '';

    // Adjustments logic: Positive = we owe them more (مستحق للمورد), Negative = they owe us (مدفوع زائد)
    const adjustmentsClass = totalAdjustments > 0 ? 'text-danger' : totalAdjustments < 0 ? 'text-success' : '';
    const adjustmentsLabel = totalAdjustments > 0 ? '(مستحق للمورد)' : totalAdjustments < 0 ? '(مدفوع زائد)' : '';

    container.innerHTML = `
        <div class="summary-item">
            <div class="summary-value text-danger">${formatCurrency(openingBalance)}</div>
            <div class="summary-label">الرصيد الافتتاحي</div>
        </div>
        <div class="summary-item">
            <div class="summary-value text-danger">${formatCurrency(totals.total_due || 0)}</div>
            <div class="summary-label">إجمالي المستحق</div>
        </div>
        <div class="summary-item">
            <div class="summary-value text-success">${formatCurrency(totals.total_paid || 0)}</div>
            <div class="summary-label">إجمالي المدفوع</div>
        </div>
        <div class="summary-item">
            <div class="summary-value ${adjustmentsClass}">${formatCurrency(Math.abs(totalAdjustments))} <small style="font-size: 0.75rem;">${adjustmentsLabel}</small></div>
            <div class="summary-label">إجمالي التعديلات</div>
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
                <div class="empty-icon"><i class="fas fa-box"></i></div>
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
                <button class="btn btn-sm btn-secondary crud-btn" data-action="edit" data-type="material" data-id="${material.id}" title="تعديل"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-danger crud-btn" data-action="delete" data-type="material" data-id="${material.id}" title="حذف"><i class="fas fa-trash"></i></button>
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
                <div class="empty-icon"><i class="fas fa-money-bill-wave"></i></div>
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
                    <i class="fas fa-image"></i> عرض
                </button>
            `;
        } else {
            imageCell.textContent = '-';
        }
        row.appendChild(imageCell);

        // Actions cell
        const actionsCell = document.createElement('td');
        actionsCell.innerHTML = `
            <button class="btn btn-sm btn-secondary crud-btn" data-action="view" data-type="payment" data-id="${payment.id}" title="عرض التفاصيل"><i class="fas fa-eye"></i></button>
            <button class="btn btn-sm btn-secondary crud-btn" data-action="edit" data-type="payment" data-id="${payment.id}" title="تعديل"><i class="fas fa-edit"></i></button>
            <button class="btn btn-sm btn-danger crud-btn" data-action="delete" data-type="payment" data-id="${payment.id}" title="حذف"><i class="fas fa-trash"></i></button>
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
                <div class="empty-icon"><i class="fas fa-balance-scale"></i></div>
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
                    <i class="fas fa-image"></i> عرض
                </button>
            `;
        } else {
            imageCell.textContent = '-';
        }
        row.appendChild(imageCell);

        // Actions cell
        const actionsCell = document.createElement('td');
        actionsCell.innerHTML = `
            <button class="btn btn-sm btn-secondary crud-btn" data-action="view" data-type="adjustment" data-id="${adjustment.id}" title="عرض التفاصيل"><i class="fas fa-eye"></i></button>
            <button class="btn btn-sm btn-secondary crud-btn" data-action="edit" data-type="adjustment" data-id="${adjustment.id}" title="تعديل"><i class="fas fa-edit"></i></button>
            <button class="btn btn-sm btn-danger crud-btn" data-action="delete" data-type="adjustment" data-id="${adjustment.id}" title="حذف"><i class="fas fa-trash"></i></button>
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

    // Reset modal title and button text
    const modalHeader = document.querySelector('#addPaymentModal .modal-header h2');
    const submitButton = document.querySelector('#addPaymentForm button[type="submit"]');

    if (modalHeader) modalHeader.textContent = 'إضافة دفعة';
    if (submitButton) submitButton.textContent = 'حفظ';
}

function resetAdjustmentForm() {
    const form = document.getElementById('adjustmentForm');
    form.reset();
    delete form.dataset.editId;

    // Reset modal title and button text
    const modalHeader = document.querySelector('#adjustmentModal .modal-header');
    const submitButton = document.querySelector('#adjustmentForm button[type="submit"]');

    if (modalHeader) modalHeader.textContent = 'إضافة تسوية جديدة';
    if (submitButton) submitButton.textContent = 'إضافة';
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

        // Update modal title and button text
        const modalHeader = document.querySelector('#addPaymentModal .modal-header h2');
        const submitButton = document.querySelector('#addPaymentForm button[type="submit"]');

        if (modalHeader) modalHeader.textContent = 'تعديل الدفعة';
        if (submitButton) submitButton.textContent = 'حفظ التعديل';

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
                            <i class="fas fa-image"></i> عرض الصورة
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
                            <i class="fas fa-image"></i> عرض الصورة
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

        // Update modal title and button text
        const modalHeader = document.querySelector('#adjustmentModal .modal-header');
        const submitButton = document.querySelector('#adjustmentForm button[type="submit"]');

        if (modalHeader) modalHeader.textContent = 'تعديل التسوية';
        if (submitButton) submitButton.textContent = 'حفظ التعديل';

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

    // Show loaders in each section
    showInlineLoader('summaryGrid', 'جاري تحميل الملخص...');
    showInlineLoader('materialsContainer', 'جاري تحميل المواد...');
    showInlineLoader('deliveriesContainer', 'جاري تحميل التسليمات...');
    showInlineLoader('paymentsContainer', 'جاري تحميل المدفوعات...');
    showInlineLoader('adjustmentsContainer', 'جاري تحميل التسويات...');

    try {
        const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/suppliers/${supplierId}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: فشل في تحميل بيانات المورد`);
        }

        const data = await response.json();
        supplierData = data;

        console.log('=== SUPPLIER DATA DEBUG ===');
        console.log('Full data:', JSON.stringify(data, null, 2));
        console.log('Totals object:', data.totals);
        console.log('Opening Balance:', data.totals?.opening_balance);
        console.log('Opening Balances Array:', data.opening_balances);
        console.log('============================');

        // Store data for filtering
        allDeliveries = data.deliveries || [];
        allPayments = data.payments || [];
        allAdjustments = data.adjustments || [];

        // Update page title
        document.getElementById('supplierName').textContent = `تفاصيل المورد: ${data.supplier.name}`;

        // Render all sections (loaders will be replaced automatically)
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

// Load projects for opening balance dropdowns
async function loadEditSupplierProjects() {
    try {
        const resp = await authManager.makeAuthenticatedRequest(`${API_BASE}/projects`);
        if (!resp.ok) throw new Error('Failed to load projects');
        const data = await resp.json();
        editSupplierProjectsList = data.projects || data;
    } catch (error) {
        console.error('Error loading projects:', error);
        editSupplierProjectsList = [];
    }
}



// Event Handlers
function setupEventHandlers() {
    // Payment method change handler - show/hide conditional fields
    document.getElementById('paymentMethod').addEventListener('change', (e) => {
        const method = e.target.value;
        const detailsGroup = document.getElementById('paymentDetailsGroup');
        const imageGroup = document.getElementById('paymentImageGroup');
        
        if (method && method !== 'نقدي') {
            detailsGroup.classList.remove('hidden');
            imageGroup.classList.remove('hidden');
        } else {
            detailsGroup.classList.add('hidden');
            imageGroup.classList.add('hidden');
        }
    });

    // Adjustment method change handler - show/hide conditional fields
    document.getElementById('adjustmentMethod').addEventListener('change', (e) => {
        const method = e.target.value;
        const detailsGroup = document.getElementById('adjustmentDetailsGroup');
        const imageGroup = document.getElementById('adjustmentImageGroup');
        
        if (method && method !== 'نقدي' && method !== 'تعديل حسابي') {
            detailsGroup.classList.remove('hidden');
            imageGroup.classList.remove('hidden');
        } else {
            detailsGroup.classList.add('hidden');
            imageGroup.classList.add('hidden');
        }
    });

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
            document.getElementById('editSupplierOpeningBalance').value = supplierData.supplier.opening_balance || 0;
            
            showModal('editSupplierModal');
        }
    });

    // Edit Supplier Form
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
            const form = e.target;
            const editId = form.dataset.editId;

            let response;
            if (editId) {
                // Update existing payment
                response = await authManager.makeAuthenticatedRequest(`${API_BASE}/suppliers/${supplierId}/payments/${editId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(paymentData)
                });
            } else {
                // Add new payment
                response = await authManager.makeAuthenticatedRequest(`${API_BASE}/suppliers/${supplierId}/payments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(paymentData)
                });
            }

            if (response.ok) {
                alert(editId ? 'تم تحديث الدفعة بنجاح' : 'تم إضافة الدفعة بنجاح');
                closeModal('addPaymentModal');
                document.getElementById('addPaymentForm').reset();
                delete form.dataset.editId;
                loadSupplierDetails();
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'فشل في حفظ الدفعة');
            }
        } catch (error) {
            console.error('Payment error:', error);
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

        const amountInput = document.getElementById('adjustmentAmount').value;
        const reason = document.getElementById('adjustmentReason').value.trim();

        console.log('Form values:', { amountInput, reason });

        // Validate - amount can be 0, negative, or positive
        if (amountInput === '' || amountInput === null || amountInput === undefined) {
            alert('يرجى إدخال المبلغ');
            return;
        }

        if (!reason) {
            alert('يرجى إدخال السبب');
            return;
        }

        const amount = parseFloat(amountInput);
        if (isNaN(amount)) {
            alert('المبلغ غير صحيح');
            return;
        }

        const adjustmentData = { amount, reason };
        console.log('Sending adjustment data:', adjustmentData);

        try {
            const supplierId = getSupplierIdFromURL();
            const form = e.target;
            const editId = form.dataset.editId;

            let response;
            if (editId) {
                // Update existing adjustment
                response = await authManager.makeAuthenticatedRequest(`${API_BASE}/suppliers/${supplierId}/adjustments/${editId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(adjustmentData)
                });
            } else {
                // Add new adjustment
                response = await authManager.makeAuthenticatedRequest(`${API_BASE}/suppliers/${supplierId}/adjustments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(adjustmentData)
                });
            }

            if (response.ok) {
                alert(editId ? 'تم تحديث التسوية بنجاح' : 'تم إضافة التسوية بنجاح');
                closeModal('adjustmentModal');
                document.getElementById('adjustmentForm').reset();
                delete form.dataset.editId;
                loadSupplierDetails();
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'فشل في حفظ التسوية');
            }
        } catch (error) {
            console.error('Adjustment error:', error);
            alert('خطأ: ' + error.message);
        }
    });

    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const modal = btn.closest('.modal');
            if (modal) {
                closeModal(modal.id);
            }
        });
    });

    // Cancel buttons in modal-actions only (not other secondary buttons)
    document.querySelectorAll('.modal-actions .btn-secondary:not([type="submit"])').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const modal = btn.closest('.modal');
            if (modal) {
                closeModal(modal.id);
            }
        });
    });

    // Close modal when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
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

    // Load projects for opening balance dropdowns
    loadEditSupplierProjects();

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


// ============================================================================
// OPENING BALANCE MANAGEMENT (Project-Based)
// ============================================================================

let editSupplierOpeningBalanceCounter = 0;
let editSupplierProjectsList = [];

async function loadEditSupplierOpeningBalances() {
    if (!supplierData || !supplierData.opening_balances) return;
    
    const container = document.getElementById('editSupplierOpeningBalancesContainer');
    container.innerHTML = '';
    
    // Load projects for dropdown
    await loadEditSupplierProjectsList();
    
    // Add existing opening balances
    supplierData.opening_balances.forEach(ob => {
        addEditSupplierOpeningBalanceRow(ob);
    });
}

async function loadEditSupplierProjectsList() {
    try {
        const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/projects`);
        const data = await response.json();
        editSupplierProjectsList = data.projects || [];
    } catch (error) {
        console.error('Error loading projects:', error);
        editSupplierProjectsList = [];
    }
}

function addEditSupplierOpeningBalanceRow(existingData = null) {
    const container = document.getElementById('editSupplierOpeningBalancesContainer');
    const rowId = editSupplierOpeningBalanceCounter++;
    
    const row = document.createElement('div');
    row.className = 'opening-balance-row';
    row.style.cssText = 'display: grid; grid-template-columns: 2fr 1fr 2fr auto; gap: 10px; margin-bottom: 10px; align-items: start; padding: 15px; background: var(--gray-50); border-radius: var(--radius); border: 1px solid var(--gray-200);';
    row.dataset.rowId = rowId;
    if (existingData && existingData.id) {
        row.dataset.balanceId = existingData.id;
    }
    
    // Project column
    const projectCol = document.createElement('div');
    const projectLabel = document.createElement('label');
    projectLabel.style.cssText = 'display: block; margin-bottom: 5px; font-size: 0.9rem; font-weight: 500;';
    projectLabel.textContent = 'المشروع';
    const projectSelect = document.createElement('select');
    projectSelect.className = 'form-input supplier-opening-balance-project';
    projectSelect.required = true;
    projectSelect.innerHTML = '<option value="">اختر المشروع</option>';
    
    editSupplierProjectsList.forEach(project => {
        const option = document.createElement('option');
        // Use client_id because opening_balances reference the Client collection
        option.value = project.client_id || project.id;
        option.textContent = project.name;
        if (existingData && existingData.project_id === (project.client_id || project.id)) {
            option.selected = true;
        }
        projectSelect.appendChild(option);
    });
    projectCol.appendChild(projectLabel);
    projectCol.appendChild(projectSelect);
    
    // Amount column
    const amountCol = document.createElement('div');
    const amountLabel = document.createElement('label');
    amountLabel.style.cssText = 'display: block; margin-bottom: 5px; font-size: 0.9rem; font-weight: 500;';
    amountLabel.textContent = 'المبلغ';
    const amountInput = document.createElement('input');
    amountInput.type = 'number';
    amountInput.className = 'form-input supplier-opening-balance-amount';
    amountInput.placeholder = '0.00';
    amountInput.step = '0.01';
    amountInput.required = true;
    if (existingData) {
        amountInput.value = existingData.amount || 0;
    }
    
    // Add event listener to show/hide project field based on amount
    amountInput.addEventListener('input', () => {
        const amount = parseFloat(amountInput.value) || 0;
        if (amount > 0) {
            // Positive: we owe them, must select project
            projectCol.style.display = 'block';
            projectSelect.required = true;
        } else {
            // Negative or zero: they owe us, no project needed
            projectCol.style.display = 'none';
            projectSelect.required = false;
            projectSelect.value = '';  // Clear selection
        }
    });
    
    // Initial state based on existing amount
    const initialAmount = parseFloat(amountInput.value) || 0;
    if (initialAmount <= 0) {
        projectCol.style.display = 'none';
        projectSelect.required = false;
    }
    
    amountCol.appendChild(amountLabel);
    amountCol.appendChild(amountInput);
    
    // Description column
    const descCol = document.createElement('div');
    const descLabel = document.createElement('label');
    descLabel.style.cssText = 'display: block; margin-bottom: 5px; font-size: 0.9rem; font-weight: 500;';
    descLabel.textContent = 'الوصف';
    const descInput = document.createElement('input');
    descInput.type = 'text';
    descInput.className = 'form-input supplier-opening-balance-description';
    descInput.placeholder = 'وصف اختياري';
    descInput.maxLength = 500;
    if (existingData && existingData.description) {
        descInput.value = existingData.description;
    }
    descCol.appendChild(descLabel);
    descCol.appendChild(descInput);
    
    // Delete button column
    const deleteCol = document.createElement('div');
    deleteCol.style.paddingTop = '28px';
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn-sm btn-danger';
    deleteBtn.textContent = '<i class="fas fa-trash"></i>';
    deleteBtn.onclick = () => row.remove();
    deleteCol.appendChild(deleteBtn);
    
    row.appendChild(projectCol);
    row.appendChild(amountCol);
    row.appendChild(descCol);
    row.appendChild(deleteCol);
    
    container.appendChild(row);
}

function getEditSupplierOpeningBalances() {
    const container = document.getElementById('editSupplierOpeningBalancesContainer');
    const rows = container.querySelectorAll('.opening-balance-row');
    const balances = [];
    
    rows.forEach(row => {
        const projectSelect = row.querySelector('.supplier-opening-balance-project');
        const amountInput = row.querySelector('.supplier-opening-balance-amount');
        const descInput = row.querySelector('.supplier-opening-balance-description');
        const balanceId = row.dataset.balanceId;
        
        const amount = parseFloat(amountInput.value) || 0;
        
        // Validate: positive balance must have project selected
        if (amount > 0 && (!projectSelect.value || projectSelect.value === '')) {
            throw new Error('الرصيد الافتتاحي الموجب يجب أن يكون مرتبطاً بمشروع/عميل');
        }
        
        if (amountInput.value) {
            const balance = {
                project_id: amount > 0 ? projectSelect.value : null,  // Only include project_id if positive
                amount: amount,
                description: descInput.value || ''
            };
            
            if (balanceId) {
                balance.id = balanceId;
            }
            
            balances.push(balance);
        }
    });
    
    return balances;
}

// Add event listener for add opening balance button
document.getElementById('addEditSupplierOpeningBalanceBtn')?.addEventListener('click', () => {
    addEditSupplierOpeningBalanceRow();
});

// Update edit supplier button to load opening balances
document.getElementById('editSupplierBtn')?.addEventListener('click', async () => {
    if (supplierData && supplierData.supplier) {
        document.getElementById('editSupplierName').value = supplierData.supplier.name;
        document.getElementById('editSupplierPhone').value = supplierData.supplier.phone_number || '';
        document.getElementById('editSupplierNotes').value = supplierData.supplier.notes || '';
        await loadEditSupplierOpeningBalances();
        showModal('editSupplierModal');
    }
});

// Update edit supplier form submission
document.getElementById('editSupplierForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const supplierId = getSupplierIdFromURL();
    const name = document.getElementById('editSupplierName').value;
    const phone_number = document.getElementById('editSupplierPhone').value;
    const notes = document.getElementById('editSupplierNotes').value;
    const opening_balances = getEditSupplierOpeningBalances();
    
    try {
        const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/suppliers/${supplierId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone_number, notes, opening_balances })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'فشل في تحديث المورد');
        }
        
        showMessage('editSupplierMessage', 'تم تحديث البيانات بنجاح', 'success');
        setTimeout(() => {
            closeModal('editSupplierModal');
            loadSupplierDetails();
        }, 1000);
    } catch (error) {
        showMessage('editSupplierMessage', error.message, 'error');
    }
});
