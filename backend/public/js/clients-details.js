// Utilities are loaded via utils/index.js - no need to redefine common functions

// State
let clientData = null;
let allDeliveries = [];
let allPayments = [];
let allAdjustments = [];

// Helpers
function getClientIdFromURL() {
    return getUrlParameter('id');
}

// Render Functions
function renderSummary(totals) {
    const container = document.getElementById('summaryGrid');
    const balance = totals.balance || 0;
    const openingBalance = totals.openingBalance || 0;

    // Balance logic: Positive = they owe us (مستحق لنا), Negative = we owe them (مستحق للعميل)
    const balanceClass = balance > 0 ? 'text-success' : balance < 0 ? 'text-danger' : '';
    const balanceLabel = balance > 0 ? '(مستحق لنا)' : balance < 0 ? '(مستحق للعميل)' : '';

    // Opening balance logic: Positive = they owe us (مستحق لنا), Negative = we owe them (مستحق للعميل)
    const openingClass = openingBalance > 0 ? 'text-success' : openingBalance < 0 ? 'text-danger' : '';
    const openingLabel = openingBalance > 0 ? '(مستحق لنا)' : openingBalance < 0 ? '(مستحق للعميل)' : '';

    container.innerHTML = `
        <div class="summary-item">
            <div class="summary-value ${openingClass}">${formatCurrency(Math.abs(openingBalance))} <small style="font-size: 0.75rem;">${openingLabel}</small></div>
            <div class="summary-label">الرصيد الافتتاحي</div>
        </div>
        <div class="summary-item">
            <div class="summary-value text-success">${formatCurrency(totals.totalDeliveries || 0)}</div>
            <div class="summary-label">إجمالي التوريدات</div>
        </div>
        <div class="summary-item">
            <div class="summary-value text-danger">${formatCurrency(totals.totalPayments || 0)}</div>
            <div class="summary-label">إجمالي المدفوعات</div>
        </div>
        <div class="summary-item">
            <div class="summary-value ${totals.totalAdjustments > 0 ? 'text-success' : totals.totalAdjustments < 0 ? 'text-danger' : ''}">${formatCurrency(Math.abs(totals.totalAdjustments || 0))} <small style="font-size: 0.75rem;">${totals.totalAdjustments > 0 ? '(مستحق لنا)' : totals.totalAdjustments < 0 ? '(مستحق للعميل)' : ''}</small></div>
            <div class="summary-label">إجمالي التعديلات</div>
        </div>
        <div class="summary-item">
            <div class="summary-value ${balanceClass}">${formatCurrency(Math.abs(balance))} <small style="font-size: 0.75rem;">${balanceLabel}</small></div>
            <div class="summary-label">الرصيد الصافي</div>
        </div>
    `;
}

function renderMaterials(materialTotals) {
    const container = document.getElementById('materialsContainer');

    if (!materialTotals || materialTotals.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📦</div>
                <div>لا توجد بيانات مواد</div>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    materialTotals.forEach(material => {
        const card = document.createElement('div');
        card.className = 'material-card';
        card.innerHTML = `
            <div class="material-title">${material.material}</div>
            <div class="material-stat">
                <span>الكمية:</span>
                <strong>${formatQuantity(material.totalQty)} م³</strong>
            </div>
            <div class="material-stat">
                <span>القيمة:</span>
                <strong>${formatCurrency(material.totalValue)}</strong>
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
    const headers = [
        'التاريخ', 'الكسارة', 'المقاول', 'المادة', 'رقم البون',
        'كمية الحمولة (م³)', 'سعر المتر', 'الإجمالي', 'إجراءات'
    ];

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
            formatDate(delivery.created_at),
            delivery.crusher_name || '-',
            delivery.contractor_name || '-',
            delivery.material || '-',
            delivery.voucher || '-',
            formatQuantity(delivery.quantity) + ' م³', // Only quantity, not net_quantity
            formatCurrency(delivery.price_per_meter),
            formatCurrency(delivery.total_value)
        ];

        cells.forEach(cellText => {
            const td = document.createElement('td');
            td.textContent = cellText;
            row.appendChild(td);
        });

        // Actions cell
        const actionsCell = document.createElement('td');
        actionsCell.innerHTML = `
            <button class="btn btn-sm btn-secondary crud-btn" data-action="edit" data-type="delivery" data-id="${delivery.id}" title="تعديل">✏️</button>
            <button class="btn btn-sm btn-danger crud-btn" data-action="delete" data-type="delivery" data-id="${delivery.id}" title="حذف">🗑️</button>
        `;
        row.appendChild(actionsCell);

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

        // Actions cell - Using CRUD button system like adjustments
        const actionsCell = document.createElement('td');
        actionsCell.innerHTML = `
            <button class="btn btn-sm btn-secondary crud-btn" data-action="view" data-type="payment" data-id="${payment.id}" title="عرض التفاصيل">👁️</button>
            <button class="btn btn-sm btn-secondary crud-btn" data-action="edit" data-type="payment" data-id="${payment.id}" title="تعديل">✏️</button>
            <button class="btn btn-sm btn-danger crud-btn" data-action="delete" data-type="payment" data-id="${payment.id}" title="حذف">🗑️</button>
        `;
        console.log('Payment actions cell created for payment ID:', payment.id);
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

        // Positive adjustment = they owe us more (مستحق لنا), Negative adjustment = we owe them (مستحق للعميل)
        amountCell.className = amount > 0 ? 'text-success' : amount < 0 ? 'text-danger' : '';
        const label = amount > 0 ? '(مستحق لنا)' : amount < 0 ? '(مستحق للعميل)' : '';
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
        console.log('Adjustment actions cell created for adjustment ID:', adjustment.id);
        row.appendChild(actionsCell);

        tbody.appendChild(row);
    });
    table.appendChild(tbody);

    container.innerHTML = '';
    container.appendChild(table);
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
        document.getElementById('paymentNote').value = payment.note || '';

        // Show/hide details field based on method
        const detailsGroup = document.getElementById('paymentDetailsGroup');
        const detailsInput = document.getElementById('paymentDetails');
        if (['بنكي', 'شيك', 'انستاباي', 'فودافون كاش'].includes(payment.method)) {
            detailsGroup.style.display = 'block';
            detailsInput.required = true;
        }

        // Change form to edit mode
        const form = document.getElementById('paymentForm');
        form.dataset.editId = paymentId;
        document.querySelector('#paymentModal .modal-header').textContent = 'تعديل الدفعة';
        document.querySelector('#paymentForm button[type="submit"]').textContent = 'حفظ التعديل';

        showModal('paymentModal');
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
        const clientId = getClientIdFromURL();
        await apiDelete(`/clients/${clientId}/payments/${paymentId}`);

        alert('تم حذف الدفعة بنجاح');
        loadClientDetails(); // Reload data
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
        const amountClass = amount > 0 ? 'text-success' : amount < 0 ? 'text-danger' : '';
        const amountLabel = amount > 0 ? '(مستحق لنا)' : amount < 0 ? '(مستحق للعميل)' : '';

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
        document.querySelector('#adjustmentModal .modal-header').textContent = 'تعديل التسوية';
        document.querySelector('#adjustmentForm button[type="submit"]').textContent = 'حفظ التعديل';

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
        const clientId = getClientIdFromURL();
        await apiDelete(`/clients/${clientId}/adjustments/${adjustmentId}`);

        alert('تم حذف التسوية بنجاح');
        loadClientDetails(); // Reload data
    } catch (error) {
        console.error('Error deleting adjustment:', error);
        alert('حدث خطأ في حذف التسوية');
    }
}

async function updatePayment(paymentId, paymentData) {
    const clientId = getClientIdFromURL();
    return await apiPut(`/clients/${clientId}/payments/${paymentId}`, paymentData);
}

async function updateAdjustment(adjustmentId, adjustmentData) {
    const clientId = getClientIdFromURL();
    return await apiPut(`/clients/${clientId}/adjustments/${adjustmentId}`, adjustmentData);
}

async function addPayment(clientId, paymentData) {
    console.log('Sending payment data:', paymentData);
    return await apiPost(`/clients/${clientId}/payments`, paymentData);
}

async function addAdjustment(clientId, adjustmentData) {
    console.log('Sending adjustment data:', adjustmentData);
    return await apiPost(`/clients/${clientId}/adjustments`, adjustmentData);
}

// Event Handlers
function setupEventHandlers() {
    // Add Payment Button
    document.getElementById('addPaymentBtn').addEventListener('click', () => {
        showModal('paymentModal');
    });

    // Add Adjustment Button
    document.getElementById('addAdjustmentBtn').addEventListener('click', () => {
        showModal('adjustmentModal');
    });

    // Payment method change handler
    document.getElementById('paymentMethod').addEventListener('change', (e) => {
        const detailsGroup = document.getElementById('paymentDetailsGroup');
        const imageGroup = document.getElementById('paymentImageGroup');
        const detailsInput = document.getElementById('paymentDetails');

        if (['بنكي', 'شيك', 'انستاباي', 'فودافون كاش'].includes(e.target.value)) {
            detailsGroup.style.display = 'block';
            imageGroup.style.display = 'block';
            detailsInput.required = true;

            if (e.target.value === 'شيك') {
                detailsInput.placeholder = 'رقم الشيك';
            } else if (e.target.value === 'بنكي') {
                detailsInput.placeholder = 'رقم المعاملة البنكية';
            } else {
                detailsInput.placeholder = 'رقم المعاملة';
            }
        } else {
            detailsGroup.style.display = 'none';
            imageGroup.style.display = 'none';
            detailsInput.required = false;
        }
    });

    // Payment Form
    document.getElementById('paymentForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const clientId = getClientIdFromURL();
        const amount = document.getElementById('paymentAmount').value;
        const paid_at = document.getElementById('paymentDate').value;
        const note = document.getElementById('paymentNote').value;
        const method = document.getElementById('paymentMethod').value;
        const details = document.getElementById('paymentDetails').value;

        const paymentData = { amount, paid_at, note, method };
        if (details) paymentData.details = details;

        // Handle image upload
        const imageFile = document.getElementById('paymentImage').files[0];
        if (imageFile) {
            // Validate file size (max 5MB)
            if (imageFile.size > 5 * 1024 * 1024) {
                showMessage('paymentMessage', 'حجم الصورة كبير جداً (الحد الأقصى 5 ميجابايت)', 'error');
                return;
            }

            // Validate file type
            if (!imageFile.type.startsWith('image/')) {
                showMessage('paymentMessage', 'يرجى اختيار ملف صورة صالح', 'error');
                return;
            }

            try {
                const payment_image = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const result = e.target.result;
                        console.log('Image read successfully, size:', result.length);

                        // Check if the base64 data is too large (over 1MB when encoded)
                        if (result.length > 1024 * 1024) {
                            console.log('Image is large, attempting to compress...');
                            // Try to compress the image
                            compressImage(result, 0.7).then(resolve).catch(() => {
                                console.log('Compression failed, using original');
                                resolve(result);
                            });
                        } else {
                            resolve(result);
                        }
                    };
                    reader.onerror = (e) => {
                        console.error('FileReader error:', e);
                        reject(new Error('فشل في قراءة الصورة'));
                    };
                    reader.readAsDataURL(imageFile);
                });
                paymentData.payment_image = payment_image;
            } catch (error) {
                console.error('Error reading image:', error);
                showMessage('paymentMessage', 'خطأ في قراءة الصورة: ' + error.message, 'error');
                return;
            }
        }

        const form = e.target;
        const editId = form.dataset.editId;

        try {
            if (editId) {
                // Update existing payment
                await updatePayment(editId, paymentData);
                showMessage('paymentMessage', 'تم تحديث الدفعة بنجاح', 'success');
            } else {
                // Add new payment
                await addPayment(clientId, paymentData);
                showMessage('paymentMessage', 'تم إضافة الدفعة بنجاح', 'success');
            }

            setTimeout(() => {
                closeModal('paymentModal');
                loadClientDetails(); // Reload data
            }, 1000);
        } catch (error) {
            console.error('Payment error:', error);
            showMessage('paymentMessage', error.message, 'error');
        }
    });

    // Adjustment Form
    document.getElementById('adjustmentForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const clientId = getClientIdFromURL();
        const amount = document.getElementById('adjustmentAmount').value;
        const reason = document.getElementById('adjustmentReason').value;

        const adjustmentData = { amount, reason };

        const form = e.target;
        const editId = form.dataset.editId;

        try {
            if (editId) {
                // Update existing adjustment
                await updateAdjustment(editId, adjustmentData);
                showMessage('adjustmentMessage', 'تم تحديث التسوية بنجاح', 'success');
            } else {
                // Add new adjustment
                await addAdjustment(clientId, adjustmentData);
                showMessage('adjustmentMessage', 'تم إضافة التسوية بنجاح', 'success');
            }

            setTimeout(() => {
                closeModal('adjustmentModal');
                loadClientDetails(); // Reload data
            }, 1000);
        } catch (error) {
            console.error('Adjustment error:', error);
            showMessage('adjustmentMessage', error.message, 'error');
        }
    });

    // Delivery Edit Form
    document.getElementById('deliveryEditForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const form = e.target;
        const editId = form.dataset.editId;

        if (!editId) {
            showMessage('deliveryEditMessage', 'خطأ: لم يتم تحديد التسليم للتعديل', 'error');
            return;
        }

        // Find the original delivery to preserve the ID fields
        const originalDelivery = allDeliveries.find(d => d.id === editId);
        if (!originalDelivery) {
            showMessage('deliveryEditMessage', 'خطأ: لم يتم العثور على بيانات التسليم الأصلية', 'error');
            return;
        }

        const deliveryData = {
            material: document.getElementById('editDeliveryMaterial').value,
            voucher: document.getElementById('editDeliveryVoucher').value,
            quantity: parseFloat(document.getElementById('editDeliveryQuantity').value),
            price_per_meter: parseFloat(document.getElementById('editDeliveryPricePerMeter').value),
            driver_name: document.getElementById('editDeliveryDriverName').value,
            car_head: document.getElementById('editDeliveryCarHead').value,
            car_tail: document.getElementById('editDeliveryCarTail').value,
            // Preserve the original ID fields to prevent them from being set to null
            crusher_id: originalDelivery.crusher_id,
            supplier_id: originalDelivery.supplier_id,
            contractor_id: originalDelivery.contractor_id,
            client_id: originalDelivery.client_id
        };

        try {
            const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/deliveries/${editId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(deliveryData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'فشل في تحديث التسليم');
            }

            showMessage('deliveryEditMessage', 'تم تحديث التسليم بنجاح', 'success');

            setTimeout(() => {
                closeModal('deliveryEditModal');
                loadClientDetails(); // Reload data
            }, 1000);
        } catch (error) {
            console.error('Delivery update error:', error);
            showMessage('deliveryEditMessage', error.message, 'error');
        }
    });

    // Search and Sort functionality
    document.getElementById('deliveriesSearch').addEventListener('input', filterDeliveries);
    document.getElementById('deliveriesDateFrom').addEventListener('change', filterDeliveries);
    document.getElementById('deliveriesDateTo').addEventListener('change', filterDeliveries);
    document.getElementById('deliveriesSort').addEventListener('change', filterDeliveries);
    document.getElementById('paymentsSearch').addEventListener('input', filterPayments);
    document.getElementById('paymentsDateFrom').addEventListener('change', filterPayments);
    document.getElementById('paymentsDateTo').addEventListener('change', filterPayments);
    document.getElementById('paymentsSort').addEventListener('change', filterPayments);
    document.getElementById('adjustmentsSearch').addEventListener('input', filterAdjustments);
    document.getElementById('adjustmentsDateFrom').addEventListener('change', filterAdjustments);
    document.getElementById('adjustmentsDateTo').addEventListener('change', filterAdjustments);
    document.getElementById('adjustmentsSort').addEventListener('change', filterAdjustments);

    // Report buttons - direct event listeners
    const deliveriesReportBtn = document.getElementById('generateDeliveriesReportBtn');
    if (deliveriesReportBtn) {
        deliveriesReportBtn.addEventListener('click', generateDeliveriesReport);
    }

    const accountStatementBtn = document.getElementById('generateAccountStatementBtn');
    if (accountStatementBtn) {
        accountStatementBtn.addEventListener('click', generateAccountStatement);
    }

    // Modal close on backdrop click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });

    // Image upload handlers
    document.getElementById('paymentImage').addEventListener('change', handleImageUpload);

    // CRUD Event Listeners moved to global event delegation handler
}

function handleImageUpload(e) {
    const file = e.target.files[0];
    const previewId = 'paymentImagePreview'; // Only for payment images now
    const previewContainer = document.getElementById(previewId);

    if (file) {
        const reader = new FileReader();
        reader.onload = function (event) {
            previewContainer.innerHTML = `
                <div class="image-preview-container">
                    <img src="${event.target.result}" alt="معاينة الصورة" class="image-preview">
                    <button type="button" class="remove-image" onclick="removeImage('${e.target.id}', '${previewId}')">&times;</button>
                </div>
            `;
        };
        reader.readAsDataURL(file);
    } else {
        previewContainer.innerHTML = '';
    }
}

function filterDeliveries() {
    const searchTerm = document.getElementById('deliveriesSearch').value.toLowerCase();
    const dateFrom = document.getElementById('deliveriesDateFrom').value;
    const dateTo = document.getElementById('deliveriesDateTo').value;
    const sortBy = document.getElementById('deliveriesSort').value;

    let filtered = allDeliveries.filter(delivery => {
        // Text search
        const matchesSearch = !searchTerm ||
            (delivery.crusher_name || '').toLowerCase().includes(searchTerm) ||
            (delivery.contractor_name || '').toLowerCase().includes(searchTerm) ||
            (delivery.material || '').toLowerCase().includes(searchTerm) ||
            (delivery.voucher || '').toLowerCase().includes(searchTerm);

        // Date filter
        const deliveryDate = new Date(delivery.created_at).toISOString().split('T')[0];
        const matchesDateFrom = !dateFrom || deliveryDate >= dateFrom;
        const matchesDateTo = !dateTo || deliveryDate <= dateTo;

        return matchesSearch && matchesDateFrom && matchesDateTo;
    });

    // Sort
    filtered.sort((a, b) => {
        switch (sortBy) {
            case 'date-asc':
                return new Date(a.created_at) - new Date(b.created_at);
            case 'date-desc':
                return new Date(b.created_at) - new Date(a.created_at);
            case 'value-asc':
                return (a.total_value || 0) - (b.total_value || 0);
            case 'value-desc':
                return (b.total_value || 0) - (a.total_value || 0);
            default:
                return 0;
        }
    });

    renderDeliveries(filtered);
}

function filterPayments() {
    const searchTerm = document.getElementById('paymentsSearch').value.toLowerCase();
    const dateFrom = document.getElementById('paymentsDateFrom').value;
    const dateTo = document.getElementById('paymentsDateTo').value;
    const sortBy = document.getElementById('paymentsSort').value;

    let filtered = allPayments.filter(payment => {
        // Text search
        const matchesSearch = !searchTerm ||
            (payment.note || '').toLowerCase().includes(searchTerm) ||
            (payment.method || '').toLowerCase().includes(searchTerm) ||
            (payment.details || '').toLowerCase().includes(searchTerm);

        // Date filter
        const paymentDate = new Date(payment.paid_at).toISOString().split('T')[0];
        const matchesDateFrom = !dateFrom || paymentDate >= dateFrom;
        const matchesDateTo = !dateTo || paymentDate <= dateTo;

        return matchesSearch && matchesDateFrom && matchesDateTo;
    });

    // Sort
    filtered.sort((a, b) => {
        switch (sortBy) {
            case 'date-asc':
                return new Date(a.paid_at) - new Date(b.paid_at);
            case 'date-desc':
                return new Date(b.paid_at) - new Date(a.paid_at);
            case 'amount-asc':
                return (a.amount || 0) - (b.amount || 0);
            case 'amount-desc':
                return (b.amount || 0) - (a.amount || 0);
            default:
                return 0;
        }
    });

    renderPayments(filtered);
}

function filterAdjustments() {
    const searchTerm = document.getElementById('adjustmentsSearch').value.toLowerCase();
    const dateFrom = document.getElementById('adjustmentsDateFrom').value;
    const dateTo = document.getElementById('adjustmentsDateTo').value;
    const sortBy = document.getElementById('adjustmentsSort').value;

    let filtered = allAdjustments.filter(adjustment => {
        // Text search
        const matchesSearch = !searchTerm ||
            (adjustment.reason || '').toLowerCase().includes(searchTerm) ||
            (adjustment.method || '').toLowerCase().includes(searchTerm) ||
            (adjustment.details || '').toLowerCase().includes(searchTerm);

        // Date filter
        const adjustmentDate = new Date(adjustment.created_at).toISOString().split('T')[0];
        const matchesDateFrom = !dateFrom || adjustmentDate >= dateFrom;
        const matchesDateTo = !dateTo || adjustmentDate <= dateTo;

        return matchesSearch && matchesDateFrom && matchesDateTo;
    });

    // Sort
    filtered.sort((a, b) => {
        switch (sortBy) {
            case 'date-asc':
                return new Date(a.created_at) - new Date(b.created_at);
            case 'date-desc':
                return new Date(b.created_at) - new Date(a.created_at);
            case 'amount-asc':
                return (a.amount || 0) - (b.amount || 0);
            case 'amount-desc':
                return (b.amount || 0) - (a.amount || 0);
            default:
                return 0;
        }
    });

    renderAdjustments(filtered);
}

// Image compression function
function compressImage(dataUrl, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = function () {
            // Calculate new dimensions (max 1200px on longest side)
            const maxSize = 1200;
            let { width, height } = img;

            if (width > height && width > maxSize) {
                height = (height * maxSize) / width;
                width = maxSize;
            } else if (height > maxSize) {
                width = (width * maxSize) / height;
                height = maxSize;
            }

            canvas.width = width;
            canvas.height = height;

            // Draw and compress
            ctx.drawImage(img, 0, 0, width, height);

            try {
                const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                console.log('Image compressed from', dataUrl.length, 'to', compressedDataUrl.length, 'bytes');
                resolve(compressedDataUrl);
            } catch (error) {
                console.error('Compression failed:', error);
                reject(error);
            }
        };

        img.onerror = function () {
            console.error('Failed to load image for compression');
            reject(new Error('Failed to load image for compression'));
        };

        img.src = dataUrl;
    });
}

// Main Load Function
async function loadClientDetails() {
    const clientId = getClientIdFromURL();

    if (!clientId) {
        document.querySelector('.main-content').innerHTML = `
            <div class="error">
                <h2>خطأ</h2>
                <p>لم يتم تحديد العميل</p>
                <a href="clients.html" class="btn btn-primary">العودة للعملاء</a>
            </div>
        `;
        return;
    }

    try {
        const data = await apiGet(`/clients/${clientId}`);
        clientData = data;

        // Store data for filtering
        allDeliveries = data.deliveries || [];
        allPayments = data.payments || [];
        allAdjustments = data.adjustments || [];

        // Update page title
        document.getElementById('clientName').textContent = `تفاصيل العميل: ${data.client.name}`;

        // Render all sections
        renderSummary(data.totals || {});
        renderMaterials(data.materialTotals || []);
        renderDeliveries(allDeliveries);
        renderPayments(allPayments);
        renderAdjustments(allAdjustments);

    } catch (error) {
        console.error('Error loading client details:', error);
        document.querySelector('.main-content').innerHTML = `
            <div class="error">
                <h2>خطأ في تحميل البيانات</h2>
                <p>${error.message}</p>
                <a href="clients.html" class="btn btn-primary">العودة للعملاء</a>
            </div>
        `;
    }
}

// Edit client functionality
function openEditClientModal() {
    console.log('openEditClientModal called');
    console.log('clientData:', clientData);

    if (!clientData || !clientData.client) {
        console.error('No client data available');
        alert('لا توجد بيانات عميل للتعديل');
        return;
    }

    const client = clientData.client;
    console.log('Client:', client);

    // Fill form with current data
    document.getElementById('editClientName').value = client.name || '';
    document.getElementById('editClientPhone').value = client.phone || '';
    document.getElementById('editOpeningBalance').value = client.opening_balance || 0;

    console.log('Showing modal...');
    // Show modal
    showModal('editClientModal');
}

async function updateClient(clientId, clientData) {
    try {
        console.log('🔄 Updating client:', clientId, clientData);
        return await apiPut(`/clients/${clientId}`, clientData);
    } catch (error) {
        console.error('❌ Update client error:', error);
        throw error;
    }
}

function setupEditClientHandlers() {
    console.log('Setting up edit client handlers...');

    // Edit client button
    const editBtn = document.getElementById('editClientBtn');
    if (editBtn) {
        console.log('Edit button found, adding event listener');
        editBtn.addEventListener('click', function () {
            console.log('Edit button clicked!');
            openEditClientModal();
        });
        console.log('Event listener added successfully');
    } else {
        console.error('Edit button not found!');
    }

    // Edit client form
    document.getElementById('editClientForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const clientId = getClientIdFromURL();
        const formData = new FormData(e.target);

        const clientData = {
            name: formData.get('name').trim(),
            phone: formData.get('phone').trim() || null,
            opening_balance: parseFloat(formData.get('opening_balance')) || 0
        };

        if (!clientData.name) {
            showMessage('editClientMessage', 'اسم العميل مطلوب', 'error');
            return;
        }

        try {
            showMessage('editClientMessage', 'جاري حفظ التعديلات...', 'info');

            await updateClient(clientId, clientData);

            showMessage('editClientMessage', 'تم حفظ التعديلات بنجاح', 'success');

            // Close modal and reload data
            setTimeout(() => {
                closeModal('editClientModal');
                loadClientDetails();
            }, 1000);

        } catch (error) {
            showMessage('editClientMessage', error.message, 'error');
        }
    });
}

// Filter clear functions
function clearDeliveriesFilters() {
    document.getElementById('deliveriesSearch').value = '';
    document.getElementById('deliveriesDateFrom').value = '';
    document.getElementById('deliveriesDateTo').value = '';
    document.getElementById('deliveriesSort').value = 'date-desc';
    filterDeliveries();
}

function clearPaymentsFilters() {
    document.getElementById('paymentsSearch').value = '';
    document.getElementById('paymentsDateFrom').value = '';
    document.getElementById('paymentsDateTo').value = '';
    document.getElementById('paymentsSort').value = 'date-desc';
    filterPayments();
}

function clearAdjustmentsFilters() {
    document.getElementById('adjustmentsSearch').value = '';
    document.getElementById('adjustmentsDateFrom').value = '';
    document.getElementById('adjustmentsDateTo').value = '';
    document.getElementById('adjustmentsSort').value = 'date-desc';
    filterAdjustments();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('paymentDate').value = today;

    // Set default date ranges for reports
    const firstOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    document.getElementById('deliveriesFromDate').value = firstOfYear;
    document.getElementById('deliveriesToDate').value = today;

    setupEventHandlers();
    setupEditClientHandlers();
    loadClientDetails();
});

// Event delegation for CSP compliance - COMPLETE
document.addEventListener('click', function (e) {
    // Debug: Log all clicks to see if events are being captured
    if (e.target.classList.contains('crud-btn')) {
        console.log('🔍 CRUD button detected:', e.target);
    }

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

    // Handle filter clear buttons
    if (e.target.textContent === 'مسح الفلاتر') {
        if (e.target.closest('#deliveriesSection')) {
            clearDeliveriesFilters();
        } else if (e.target.closest('#paymentsSection')) {
            clearPaymentsFilters();
        } else if (e.target.closest('#adjustmentsSection')) {
            clearAdjustmentsFilters();
        }
    }

    // Handle CRUD operations for dynamically created buttons
    if (e.target.classList.contains('crud-btn')) {
        e.preventDefault(); // Prevent any default behavior
        e.stopPropagation(); // Stop event bubbling

        const action = e.target.getAttribute('data-action');
        const type = e.target.getAttribute('data-type');
        const id = e.target.getAttribute('data-id');

        console.log('🎯 CRUD button clicked:', { action, type, id, element: e.target });

        if (!action || !type || !id) {
            console.error('❌ Missing required attributes:', { action, type, id });
            return;
        }

        try {
            if (action === 'view' && type === 'payment') {
                console.log('👁️ Calling showPaymentDetails with ID:', id);
                showPaymentDetails(id);
            } else if (action === 'edit' && type === 'payment') {
                console.log('✏️ Calling editPayment with ID:', id);
                editPayment(id);
            } else if (action === 'delete' && type === 'payment') {
                console.log('🗑️ Calling deletePayment with ID:', id);
                deletePayment(id);
            } else if (action === 'view' && type === 'adjustment') {
                console.log('👁️ Calling showAdjustmentDetails with ID:', id);
                showAdjustmentDetails(id);
            } else if (action === 'edit' && type === 'adjustment') {
                console.log('✏️ Calling editAdjustment with ID:', id);
                editAdjustment(id);
            } else if (action === 'delete' && type === 'adjustment') {
                console.log('🗑️ Calling deleteAdjustment with ID:', id);
                deleteAdjustment(id);
            } else if (action === 'edit' && type === 'delivery') {
                console.log('✏️ Calling editDelivery with ID:', id);
                editDelivery(id);
            } else if (action === 'delete' && type === 'delivery') {
                console.log('🗑️ Calling deleteDelivery with ID:', id);
                deleteDelivery(id);
            } else {
                console.warn('⚠️ Unhandled CRUD operation:', { action, type, id });
            }
        } catch (error) {
            console.error('💥 Error executing CRUD operation:', error);
        }

        return; // Exit early to prevent other handlers
    }

    // ONLY handle report buttons with specific IDs or classes - NO TEXT MATCHING
    // Remove all text-based event handling to prevent unwanted triggers
});

// Make functions available globally for onclick handlers
window.closeModal = closeModal;
window.showImageModal = showImageModal;
window.generateDeliveriesReport = generateDeliveriesReport;
window.generateAccountStatement = generateAccountStatement;
window.toggleDateRange = toggleDateRange;
window.clearDeliveriesFilters = clearDeliveriesFilters;
window.clearPaymentsFilters = clearPaymentsFilters;
window.clearAdjustmentsFilters = clearAdjustmentsFilters;
window.removeImage = removeImage;

// Define the missing functions
function removeImage(inputId, previewId) {
    document.getElementById(inputId.replace('Preview', '')).value = '';
    document.getElementById(previewId).innerHTML = '';
}

function showImageModal(imageData) {
    const modalImage = document.getElementById('modalImage');

    console.log('Showing image modal with data:', imageData ? imageData.substring(0, 50) + '...' : 'null');

    // Check if imageData is valid
    if (!imageData || imageData === 'null' || imageData === 'undefined' || imageData.trim() === '') {
        alert('لا توجد صورة لعرضها');
        return;
    }

    // Clear any previous error handlers
    modalImage.onerror = null;
    modalImage.onload = null;

    // Add error handler for the image
    modalImage.onerror = function () {
        console.error('Failed to load image. Data length:', imageData ? imageData.length : 0);
        console.error('Image data preview:', imageData ? imageData.substring(0, 200) : 'null');
        alert('فشل في تحميل الصورة - البيانات قد تكون تالفة أو كبيرة جداً');
        closeModal('imageModal');
    };

    modalImage.onload = function () {
        console.log('Image loaded successfully. Dimensions:', this.naturalWidth, 'x', this.naturalHeight);
    };

    // Validate and set image source
    try {
        let imageSrc = '';

        if (imageData.startsWith('data:image/')) {
            // Already a complete data URL
            imageSrc = imageData;
        } else if (imageData.startsWith('http')) {
            // HTTP URL
            imageSrc = imageData;
        } else {
            // Assume it's base64 without prefix
            // Try to detect the image format
            let imageFormat = 'png'; // default

            // JPEG starts with /9j
            if (imageData.startsWith('/9j')) {
                imageFormat = 'jpeg';
            }
            // PNG starts with iVBORw0KGgo
            else if (imageData.startsWith('iVBORw0KGgo')) {
                imageFormat = 'png';
            }
            // GIF starts with R0lGODlh or R0lGODdh
            else if (imageData.startsWith('R0lGOD')) {
                imageFormat = 'gif';
            }

            imageSrc = `data:image/${imageFormat};base64,${imageData}`;
        }

        // Validate the data URL format
        if (imageSrc.startsWith('data:image/')) {
            const base64Part = imageSrc.split(',')[1];
            if (!base64Part || base64Part.length < 10) {
                throw new Error('Invalid base64 data');
            }
        }

        console.log('Setting image source. Format detected:', imageSrc.substring(0, 30));
        modalImage.src = imageSrc;

        // Show the modal
        showModal('imageModal');

    } catch (error) {
        console.error('Error processing image data:', error);
        alert('خطأ في معالجة بيانات الصورة: ' + error.message);
    }
}

// PDF Report Functions
async function generateDeliveriesReport() {
    const clientId = getClientIdFromURL();
    const fromDate = document.getElementById('deliveriesFromDate').value;
    const toDate = document.getElementById('deliveriesToDate').value;

    if (!fromDate || !toDate) {
        alert('يرجى تحديد تاريخ البداية والنهاية');
        return;
    }

    try {
        const url = `${API_BASE}/clients/${clientId}/reports/deliveries?from=${fromDate}&to=${toDate}`;
        window.open(url, '_blank');
    } catch (error) {
        console.error('Error generating deliveries report:', error);
        alert('حدث خطأ في إنشاء التقرير');
    }
}

async function generateAccountStatement() {
    const clientId = getClientIdFromURL();
    const useCustomRange = document.getElementById('useCustomDateRange').checked;

    let fromDate, toDate;

    if (useCustomRange) {
        fromDate = document.getElementById('statementFromDate').value;
        toDate = document.getElementById('statementToDate').value;

        if (!fromDate || !toDate) {
            alert('يرجى تحديد تاريخ البداية والنهاية');
            return;
        }
    } else {
        // Use all data - get first and last dates
        fromDate = '';
        toDate = '';
    }

    try {
        let url = `${API_BASE}/clients/${clientId}/reports/statement`;
        if (fromDate && toDate) {
            url += `?from=${fromDate}&to=${toDate}`;
        }
        window.open(url, '_blank');
    } catch (error) {
        console.error('Error generating account statement:', error);
        alert('حدث خطأ في إنشاء كشف الحساب');
    }
}

// Toggle date range inputs
function toggleDateRange() {
    const checkbox = document.getElementById('useCustomDateRange');
    const dateInputs = document.getElementById('dateRangeInputs');

    if (checkbox.checked) {
        dateInputs.style.display = 'block';
        // Set default dates
        const today = new Date().toISOString().split('T')[0];
        const firstOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
        document.getElementById('statementFromDate').value = firstOfYear;
        document.getElementById('statementToDate').value = today;
    } else {
        dateInputs.style.display = 'none';
    }
}
// Form reset functions
function resetPaymentForm() {
    const form = document.getElementById('paymentForm');
    form.reset();
    delete form.dataset.editId;

    // Reset UI elements
    document.getElementById('paymentDetailsGroup').style.display = 'none';
    document.getElementById('paymentImageGroup').style.display = 'none';
    document.getElementById('paymentDetails').required = false;
    document.getElementById('paymentImagePreview').innerHTML = '';

    // Reset modal title and button
    document.querySelector('#paymentModal .modal-header').textContent = 'إضافة دفعة جديدة';
    document.querySelector('#paymentForm button[type="submit"]').textContent = 'إضافة';

    // Set default date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('paymentDate').value = today;
}

function resetAdjustmentForm() {
    const form = document.getElementById('adjustmentForm');
    form.reset();
    delete form.dataset.editId;

    // Reset modal title and button
    document.querySelector('#adjustmentModal .modal-header').textContent = 'إضافة تسوية جديدة';
    document.querySelector('#adjustmentForm button[type="submit"]').textContent = 'إضافة';
}