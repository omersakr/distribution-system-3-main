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
let crusherData = null;
let allDeliveries = [];
let allPayments = [];
let allAdjustments = [];
let editProjectsList = [];

// Image handling functions
function compressImage(dataUrl, quality = 0.7) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            // Calculate new dimensions (max 800px width/height)
            let { width, height } = img;
            const maxSize = 800;

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
            const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(compressedDataUrl);
        };

        img.src = dataUrl;
    });
}

// Modal functions
function showModal(modalId) {
    console.log('showModal called with:', modalId);
    const modal = document.getElementById(modalId);
    console.log('Modal element found:', !!modal);
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        modal.classList.add('active');
        console.log('Modal should now be visible');
    } else {
        console.error('Modal not found:', modalId);
    }
}

function showMessage(containerId, message, type) {
    const container = document.getElementById(containerId);
    container.innerHTML = `<div class="message ${type}">${message}</div>`;

    if (type === 'success') {
        setTimeout(() => {
            container.innerHTML = '';
        }, 3000);
    }
}

// Helpers
function getCrusherIdFromURL() {
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
    const net = totals.net || 0;
    const openingBalance = totals.openingBalance || 0;
    // POSITIVE net = WE OWE THEM (RED - مستحق للكسارة), NEGATIVE net = THEY OWE US (GREEN - مستحق لنا)
    const netClass = net > 0 ? 'text-danger' : net < 0 ? 'text-success' : '';
    const netLabel = net > 0 ? 'مستحق للكسارة' : net < 0 ? 'مستحق لنا' : 'متوازن';
    
    const adjustments = totals.totalAdjustments || 0;
    const adjustmentsClass = adjustments > 0 ? 'text-danger' : adjustments < 0 ? 'text-success' : '';

    container.innerHTML = `
        <div class="summary-item">
            <div class="summary-value" style="color: #e74c3c;">${formatCurrency(openingBalance)}</div>
            <div class="summary-label">الرصيد الافتتاحي</div>
        </div>
        <div class="summary-item">
            <div class="summary-value" style="color: #e74c3c;">${formatCurrency(totals.totalRequired || 0)}</div>
            <div class="summary-label">المطلوب الأساسي</div>
        </div>
        <div class="summary-item">
            <div class="summary-value ${adjustmentsClass}">${formatCurrency(Math.abs(adjustments))}</div>
            <div class="summary-label">التسويات</div>
        </div>
        <div class="summary-item">
            <div class="summary-value" style="color: #e74c3c;">${formatCurrency(totals.totalNeeded || 0)}</div>
            <div class="summary-label">المطلوب النهائي</div>
        </div>
        <div class="summary-item">
            <div class="summary-value" style="color: #27ae60;">${formatCurrency(totals.totalPaid || 0)}</div>
            <div class="summary-label">المدفوع</div>
        </div>
        <div class="summary-item">
            <div class="summary-value ${netClass}">${formatCurrency(Math.abs(net))}</div>
            <div class="summary-label">${netLabel}</div>
        </div>
        <div class="summary-item">
            <div class="summary-value">${totals.deliveriesCount || 0}</div>
            <div class="summary-label">عدد التسليمات</div>
        </div>
        <div class="summary-item">
            <div class="summary-value">${formatQuantity(totals.totalVolume)} م³</div>
            <div class="summary-label">إجمالي الكمية</div>
        </div>
    `;
}

function renderPricesDisplay(crusher) {
    const container = document.getElementById('pricesDisplayGrid');

    const materials = [
        { key: 'sand_price', label: 'رمل', value: crusher.sand_price },
        { key: 'aggregate1_price', label: 'سن 1', value: crusher.aggregate1_price },
        { key: 'aggregate2_price', label: 'سن 2', value: crusher.aggregate2_price },
        { key: 'aggregate3_price', label: 'سن 3', value: crusher.aggregate3_price },
        { key: 'aggregate6_powder_price', label: 'سن 6 بودرة', value: crusher.aggregate6_powder_price }
    ];

    container.innerHTML = '';

    materials.forEach(material => {
        const priceItem = document.createElement('div');
        priceItem.className = 'price-display-item';

        const materialName = document.createElement('div');
        materialName.className = 'price-material-name';
        materialName.textContent = material.label;

        const materialValue = document.createElement('div');
        materialValue.className = 'price-material-value';

        if (material.value && material.value > 0) {
            materialValue.textContent = formatCurrency(material.value);
        } else {
            materialValue.textContent = 'غير محدد';
            materialValue.classList.add('not-set');
        }

        priceItem.appendChild(materialName);
        priceItem.appendChild(materialValue);
        container.appendChild(priceItem);
    });
}

function renderSettlementSummary(totals) {
    const container = document.getElementById('settlementSummary');
    const adjustments = totals.totalAdjustments || 0;
    const baseRequired = totals.totalRequired || 0; // Base amount we owe
    const totalNeeded = totals.totalNeeded || 0; // After adjustments
    const paid = totals.totalPaid || 0;
    const net = totals.net || 0;

    container.innerHTML = `
        <div class="settlement-item">
            <div class="settlement-value text-danger">${formatCurrency(baseRequired)}</div>
            <div class="settlement-label">المطلوب الأساسي</div>
        </div>
        <div class="settlement-item">
            <div class="settlement-value ${adjustments >= 0 ? 'text-danger' : 'text-success'}">${formatCurrency(Math.abs(adjustments))}</div>
            <div class="settlement-label">التسويات</div>
        </div>
        <div class="settlement-item">
            <div class="settlement-value text-danger">${formatCurrency(totalNeeded)}</div>
            <div class="settlement-label">المطلوب النهائي</div>
        </div>
        <div class="settlement-item">
            <div class="settlement-value text-success">${formatCurrency(paid)}</div>
            <div class="settlement-label">المدفوع</div>
        </div>
        <div class="settlement-item">
            <div class="settlement-value ${net > 0 ? 'text-danger' : net < 0 ? 'text-success' : ''}">${formatCurrency(Math.abs(net))}</div>
            <div class="settlement-label">${net > 0 ? 'مستحق للكسارة' : net < 0 ? 'مستحق لنا' : 'متوازن'}</div>
        </div>
    `;
}

function renderMaterials(materialTotals) {
    const container = document.getElementById('materialsContainer');

    if (!materialTotals || materialTotals.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fas fa-box"></i></div>
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
        'التاريخ', 'المقاول', 'المادة', 'رقم البون',
        'تكعيب السيارة (م³)', 'قيمة الخصم (م³)', 'الكمية الصافية (م³)', 'سعر المتر', 'الإجمالي', 'إجراءات'
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
            delivery.contractor_name || '-',
            delivery.material || '-',
            delivery.voucher || '-',
            formatQuantity(delivery.car_volume) + ' م³', // Car volume for crusher
            formatQuantity(delivery.discount_volume) + ' م³', // Discount
            formatQuantity((Number(delivery.car_volume || 0) - Number(delivery.discount_volume || 0))) + ' م³', // Net car volume for crusher
            formatCurrency(delivery.material_price_at_time), // Crusher price, not client price
            formatCurrency(delivery.crusher_total_cost) // Crusher cost, not client value
        ];

        cells.forEach(cellText => {
            const td = document.createElement('td');
            td.textContent = cellText;
            row.appendChild(td);
        });

        // Actions cell
        const actionsCell = document.createElement('td');
        actionsCell.innerHTML = `
            <button class="btn btn-sm btn-secondary crud-btn" data-action="edit" data-type="delivery" data-id="${delivery.id}" title="تعديل"><i class="fas fa-edit"></i></button>
            <button class="btn btn-sm btn-danger crud-btn" data-action="delete" data-type="delivery" data-id="${delivery.id}" title="حذف"><i class="fas fa-trash"></i></button>
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
    const headers = ['التاريخ', 'المبلغ', 'طريقة التسوية', 'التفاصيل', 'السبب', 'إجراءات'];

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
        amountCell.textContent = formatCurrency(adjustment.amount);
        amountCell.className = adjustment.amount >= 0 ? 'text-success' : 'text-danger';

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

        if (payment.payment_image && payment.payment_image !== 'null' && payment.payment_image.trim() !== '') {
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

// Modal Functions
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        modal.classList.add('hidden');
        modal.style.display = 'none';

        // Clear messages when closing
        const messageElements = modal.querySelectorAll('[id$="Message"]');
        messageElements.forEach(el => el.innerHTML = '');

        // Reset forms when closing modals
        if (modalId === 'paymentModal') {
            const form = document.getElementById('paymentForm');
            form.reset();
            delete form.dataset.editId;
            document.getElementById('paymentDetailsGroup').style.display = 'none';
            document.getElementById('paymentImageGroup').style.display = 'none';
        } else if (modalId === 'adjustmentModal') {
            const form = document.getElementById('adjustmentForm');
            form.reset();
            delete form.dataset.editId;
            document.getElementById('adjustmentDetailsGroup').style.display = 'none';
        }
    }
}

function showMessage(elementId, message, type) {
    const msgDiv = document.getElementById(elementId);
    if (msgDiv) {
        msgDiv.innerHTML = `<div class="alert alert-${type}">${message}</div>`;

        // Auto-clear success messages after 3 seconds
        if (type === 'success') {
            setTimeout(() => {
                msgDiv.innerHTML = '';
            }, 3000);
        }
    }
}

function openEditPricesModal(crusher) {
    document.getElementById('editSandPrice').value = crusher.sand_price || '';
    document.getElementById('editAggregate1Price').value = crusher.aggregate1_price || '';
    document.getElementById('editAggregate2Price').value = crusher.aggregate2_price || '';
    document.getElementById('editAggregate3Price').value = crusher.aggregate3_price || '';
    document.getElementById('editAggregate6PowderPrice').value = crusher.aggregate6_powder_price || '';
    showModal('editPricesModal');
}

// API Functions
async function addPayment(crusherId, paymentData) {
    try {
        console.log('Sending payment request to:', `${API_BASE}/crushers/${crusherId}/payments`);
        console.log('Payment data:', paymentData);

        const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/crushers/${crusherId}/payments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(paymentData)
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);

        if (!response.ok) {
            let errorMessage = 'فشل في إضافة الدفعة';
            try {
                // Clone the response to avoid "body stream already read" error
                const responseClone = response.clone();
                const errorData = await responseClone.json();
                errorMessage = errorData.message || errorMessage;
                console.log('Error data:', errorData);
            } catch (e) {
                console.log('Could not parse error response as JSON, trying text...');
                try {
                    const textResponse = await response.text();
                    console.log('Error response text (first 200 chars):', textResponse.substring(0, 200));
                    if (textResponse.includes('خطأ في السيرفر')) {
                        errorMessage = 'خطأ في السيرفر - يرجى المحاولة مرة أخرى';
                    }
                } catch (textError) {
                    console.log('Could not read response as text either');
                }
            }
            throw new Error(errorMessage);
        }

        const result = await response.json();
        console.log('Success result:', result);
        return result;
    } catch (error) {
        console.error('Payment API error:', error);
        throw error;
    }
}

async function updatePayment(paymentId, paymentData) {
    try {
        console.log('Sending payment data:', paymentData);
        const crusherId = getCrusherIdFromURL();
        const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/crushers/${crusherId}/payments/${paymentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(paymentData)
        });

        if (!response.ok) {
            let errorMessage = 'خطأ في تحديث الدفعة';
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
            } catch (e) {
                console.log('Could not parse error response');
            }
            throw new Error(errorMessage);
        }

        return await response.json();
    } catch (error) {
        console.error('Update payment error:', error);
        throw error;
    }
}

async function addAdjustment(crusherId, adjustmentData) {
    const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/crushers/${crusherId}/adjustments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adjustmentData)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'فشل في إضافة التسوية');
    }

    return response.json();
}

async function updateAdjustment(adjustmentId, adjustmentData) {
    try {
        const crusherId = getCrusherIdFromURL();
        const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/crushers/${crusherId}/adjustments/${adjustmentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(adjustmentData)
        });

        if (!response.ok) {
            let errorMessage = 'خطأ في تحديث التسوية';
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
            } catch (e) {
                console.log('Could not parse error response');
            }
            throw new Error(errorMessage);
        }

        return await response.json();
    } catch (error) {
        console.error('Update adjustment error:', error);
        throw error;
    }
}

async function updateCrusherPrices(crusherId, pricesData) {
    const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/crushers/${crusherId}/prices`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pricesData)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'فشل في تحديث الأسعار');
    }

    return response.json();
}

// Event Handlers
function setupEventHandlers() {
    // Direct close button listeners for all modals
    document.querySelectorAll('[data-action="close-modal"]').forEach(button => {
        button.addEventListener('click', (e) => {
            const target = e.target.getAttribute('data-target');
            console.log('Direct close button clicked, target:', target);
            if (target) {
                closeModal(target);
            }
        });
    });

    // Edit Prices Button
    document.getElementById('editPricesBtn').addEventListener('click', () => {
        if (crusherData && crusherData.crusher) {
            openEditPricesModal(crusherData.crusher);
        }
    });

    // Add Payment Button
    document.getElementById('addPaymentBtn').addEventListener('click', () => {
        // Reset form and hide details group
        const form = document.getElementById('paymentForm');
        form.reset();
        form.removeAttribute('data-edit-id'); // Clear edit mode
        document.getElementById('paymentDetailsGroup').style.display = 'none';
        document.getElementById('paymentImageGroup').style.display = 'none';
        document.getElementById('paymentMessage').innerHTML = '';
        showModal('paymentModal');
    });

    // Add Adjustment Button
    document.getElementById('addAdjustmentBtn').addEventListener('click', () => {
        // Reset form and clear edit mode
        const form = document.getElementById('adjustmentForm');
        form.reset();
        form.removeAttribute('data-edit-id'); // Clear edit mode
        document.getElementById('adjustmentDetailsGroup').style.display = 'none';
        document.getElementById('adjustmentMessage').innerHTML = '';
        showModal('adjustmentModal');
    });

    // Edit Prices Form
    document.getElementById('editPricesForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const crusherId = getCrusherIdFromURL();
        const pricesData = {
            sand_price: parseFloat(document.getElementById('editSandPrice').value) || 0,
            aggregate1_price: parseFloat(document.getElementById('editAggregate1Price').value) || 0,
            aggregate2_price: parseFloat(document.getElementById('editAggregate2Price').value) || 0,
            aggregate3_price: parseFloat(document.getElementById('editAggregate3Price').value) || 0,
            aggregate6_powder_price: parseFloat(document.getElementById('editAggregate6PowderPrice').value) || 0
        };

        try {
            await updateCrusherPrices(crusherId, pricesData);
            showMessage('editPricesMessage', 'تم تحديث الأسعار بنجاح', 'success');

            setTimeout(() => {
                closeModal('editPricesModal');
                loadCrusherDetails(); // Reload data
            }, 1000);
        } catch (error) {
            showMessage('editPricesMessage', error.message, 'error');
        }
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

    // Adjustment method change handler
    document.getElementById('adjustmentMethod').addEventListener('change', (e) => {
        const detailsGroup = document.getElementById('adjustmentDetailsGroup');
        const detailsInput = document.getElementById('adjustmentDetails');

        if (['بنكي', 'شيك', 'انستاباي', 'فودافون كاش'].includes(e.target.value)) {
            detailsGroup.style.display = 'block';
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
            detailsInput.required = false;
        }
    });

    // Payment Form
    document.getElementById('paymentForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const crusherId = getCrusherIdFromURL();
        const amount = document.getElementById('paymentAmount').value;
        const method = document.getElementById('paymentMethod').value;
        const details = document.getElementById('paymentDetails').value;
        const date = document.getElementById('paymentDate').value;
        const note = document.getElementById('paymentNote').value;

        const paymentData = {
            amount: parseFloat(amount),
            method, // This will be sent as 'method' but API expects 'payment_method' for crushers
            date,
            note
        };

        // Only add details if it has a value
        if (details && details.trim()) {
            paymentData.details = details.trim();
        }

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

        console.log('Sending payment data:', paymentData);

        const form = e.target;
        const editId = form.dataset.editId;

        try {
            let result;
            if (editId) {
                // Update existing payment
                result = await updatePayment(editId, paymentData);
                showMessage('paymentMessage', 'تم تحديث الدفعة بنجاح', 'success');
            } else {
                // Add new payment
                result = await addPayment(crusherId, paymentData);
                showMessage('paymentMessage', 'تم إضافة الدفعة بنجاح', 'success');
            }

            console.log('Payment result:', result);

            // Clear form fields and edit mode
            document.getElementById('paymentForm').reset();
            form.removeAttribute('data-edit-id');
            document.getElementById('paymentDetailsGroup').style.display = 'none';
            document.getElementById('paymentImageGroup').style.display = 'none';

            setTimeout(() => {
                closeModal('paymentModal');
                loadCrusherDetails(); // Reload data
            }, 1000);
        } catch (error) {
            console.error('Payment error:', error);
            showMessage('paymentMessage', error.message, 'error');
        }
    });

    // Adjustment Form
    document.getElementById('adjustmentForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const crusherId = getCrusherIdFromURL();
        const amount = document.getElementById('adjustmentAmount').value;
        const reason = document.getElementById('adjustmentReason').value;
        const method = document.getElementById('adjustmentMethod').value;
        const details = document.getElementById('adjustmentDetails').value;

        const adjustmentData = {
            amount: parseFloat(amount),
            reason,
            method
        };

        // Only add details if it has a value
        if (details && details.trim()) {
            adjustmentData.details = details.trim();
        }

        const form = e.target;
        const editId = form.dataset.editId;

        try {
            if (editId) {
                // Update existing adjustment
                await updateAdjustment(editId, adjustmentData);
                showMessage('adjustmentMessage', 'تم تحديث التسوية بنجاح', 'success');
            } else {
                // Add new adjustment
                await addAdjustment(crusherId, adjustmentData);
                showMessage('adjustmentMessage', 'تم إضافة التسوية بنجاح', 'success');
            }

            // Clear form fields and edit mode
            document.getElementById('adjustmentForm').reset();
            form.removeAttribute('data-edit-id');
            document.getElementById('adjustmentDetailsGroup').style.display = 'none';

            setTimeout(() => {
                closeModal('adjustmentModal');
                loadCrusherDetails(); // Reload data
            }, 1000);
        } catch (error) {
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
            car_volume: parseFloat(document.getElementById('editDeliveryCarVolume').value),
            discount_volume: parseFloat(document.getElementById('editDeliveryDiscountVolume').value) || 0,
            driver_name: document.getElementById('editDeliveryDriverName').value,
            car_head: document.getElementById('editDeliveryCarHead').value,
            car_tail: document.getElementById('editDeliveryCarTail').value,
            contractor_charge_per_meter: parseFloat(document.getElementById('editDeliveryContractorCharge').value) || 0,
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
                loadCrusherDetails(); // Reload data
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
}

function filterDeliveries() {
    const searchTerm = document.getElementById('deliveriesSearch').value.toLowerCase();
    const dateFrom = document.getElementById('deliveriesDateFrom').value;
    const dateTo = document.getElementById('deliveriesDateTo').value;
    const sortBy = document.getElementById('deliveriesSort').value;

    let filtered = allDeliveries.filter(delivery => {
        // Text search
        const matchesSearch = !searchTerm ||
            (delivery.client_name || '').toLowerCase().includes(searchTerm) ||
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

// Main Load Function
async function loadCrusherDetails() {
    const crusherId = getCrusherIdFromURL();

    if (!crusherId) {
        document.querySelector('.main-content').innerHTML = `
            <div class="error">
                <h2>خطأ</h2>
                <p>لم يتم تحديد الكسارة</p>
                <a href="crushers.html" class="btn btn-primary">العودة للكسارات</a>
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
        const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/crushers/${crusherId}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: فشل في تحميل بيانات الكسارة`);
        }

        const data = await response.json();
        crusherData = data;

        console.log('=== CRUSHER DATA DEBUG ===');
        console.log('Full data:', JSON.stringify(data, null, 2));
        console.log('Totals object:', data.totals);
        console.log('Opening Balance:', data.totals?.openingBalance);
        console.log('Opening Balances Array:', data.opening_balances);
        console.log('============================');

        // Store data for filtering
        allDeliveries = data.deliveries || [];
        allPayments = data.payments || [];
        allAdjustments = data.adjustments || [];

        // Update page title
        document.getElementById('crusherName').textContent = `تفاصيل الكسارة: ${data.crusher.name}`;

        // Render all sections (loaders will be replaced automatically)
        renderSummary(data.totals || {});
        renderPricesDisplay(data.crusher || {});
        renderSettlementSummary(data.totals || {});
        renderMaterials(data.materialTotals || []);
        renderDeliveries(allDeliveries);
        renderAdjustments(allAdjustments);
        renderPayments(allPayments);

    } catch (error) {
        console.error('Error loading crusher details:', error);
        document.querySelector('.main-content').innerHTML = `
            <div class="error">
                <h2>خطأ في تحميل البيانات</h2>
                <p>${error.message}</p>
                <a href="crushers.html" class="btn btn-primary">العودة للكسارات</a>
            </div>
        `;
    }
}

// Edit crusher functionality
// Load projects for opening balance dropdowns
async function loadEditProjects() {
    try {
        const resp = await authManager.makeAuthenticatedRequest(`${API_BASE}/projects`);
        if (!resp.ok) throw new Error('Failed to load projects');
        const data = await resp.json();
        editProjectsList = data.projects || data;
    } catch (error) {
        console.error('Error loading projects:', error);
        editProjectsList = [];
    }
}



function openEditCrusherModal() {
    console.log('openEditCrusherModal called');
    console.log('crusherData:', crusherData);

    if (!crusherData || !crusherData.crusher) {
        console.error('No crusher data available');
        alert('لا توجد بيانات كسارة للتعديل');
        return;
    }

    const crusher = crusherData.crusher;
    console.log('Crusher:', crusher);

    // Fill form with current data
    document.getElementById('editCrusherName').value = crusher.name || '';
    document.getElementById('editCrusherOpeningBalance').value = crusher.opening_balance || 0;

    console.log('Showing crusher edit modal...');
    // Show modal
    showModal('editCrusherModal');
}

async function updateCrusher(crusherId, crusherData) {
    try {
        console.log('<i class="fas fa-sync-alt"></i> Updating crusher:', crusherId, crusherData);
        console.log('📤 API URL:', `${API_BASE}/crushers/${crusherId}`);

        const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/crushers/${crusherId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(crusherData)
        });

        console.log('📥 Response status:', response.status, response.statusText);

        if (!response.ok) {
            let errorMessage = 'فشل في تحديث بيانات الكسارة';
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
                console.error('<i class="fas fa-times-circle"></i> Server error data:', errorData);
            } catch (e) {
                const errorText = await response.text();
                console.error('<i class="fas fa-times-circle"></i> Server error text:', errorText);
                errorMessage = `خطأ في السيرفر (${response.status}): ${errorText}`;
            }
            throw new Error(errorMessage);
        }

        const result = await response.json();
        console.log('<i class="fas fa-check-circle"></i> Update successful:', result);
        return result;
    } catch (error) {
        console.error('<i class="fas fa-times-circle"></i> Update crusher error:', error);
        throw error;
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
        const amountClass = amount >= 0 ? 'text-success' : 'text-danger';

        let detailsHTML = `
            <div style="display: grid; gap: 15px;">
                <div class="detail-row">
                    <strong>التاريخ:</strong>
                    <span>${formatDate(adjustment.created_at)}</span>
                </div>
                <div class="detail-row">
                    <strong>المبلغ:</strong>
                    <span class="${amountClass}">${formatCurrency(Math.abs(amount))}</span>
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
            </div>
        `;

        // Populate modal content
        document.getElementById('adjustmentDetailsContent').innerHTML = detailsHTML;

        // Show modal
        showModal('adjustmentDetailsModal');
    } catch (error) {
        console.error('Error viewing adjustment:', error);
        alert('حدث خطأ في عرض تفاصيل التسوية');
    }
}

function setupEditCrusherHandlers() {
    console.log('Setting up edit crusher handlers...');

    // Edit crusher button
    const editBtn = document.getElementById('editCrusherBtn');
    if (editBtn) {
        console.log('Edit crusher button found, adding event listener');
        editBtn.addEventListener('click', function () {
            console.log('Edit crusher button clicked!');
            openEditCrusherModal();
        });
        console.log('Edit crusher event listener added successfully');
    } else {
        console.error('Edit crusher button not found!');
    }

}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventHandlers();
    setupEditCrusherHandlers();
    loadEditProjects(); // Load projects for opening balance dropdowns
    loadCrusherDetails();

    // Set default date ranges for reports
    const today = new Date().toISOString().split('T')[0];
    const firstOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    document.getElementById('deliveriesFromDate').value = firstOfYear;
    document.getElementById('deliveriesToDate').value = today;
});

// Make closeModal available globally for onclick handlers
window.closeModal = closeModal;

// Image modal functions
window.showImageModal = function (imageData) {
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
        console.error('Failed to load image:', imageData.substring(0, 100));
        alert('فشل في تحميل الصورة');
        closeModal('imageModal');
    };

    // Add load handler for the image
    modalImage.onload = function () {
        console.log('Image loaded successfully');
    };

    modalImage.src = imageData;
    showModal('imageModal');
};

// CRUD functions for payments
window.viewPayment = function (paymentId) {
    console.log('viewPayment called with ID:', paymentId);
    showPaymentDetails(paymentId).catch(error => {
        console.error('Error in showPaymentDetails:', error);
    });
};

window.editPayment = function (paymentId) {
    console.log('editPayment called with ID:', paymentId);
    const payment = allPayments.find(p => p.id === paymentId);
    if (!payment) {
        alert('لم يتم العثور على الدفعة');
        return;
    }

    // Fill form with payment data
    document.getElementById('paymentAmount').value = payment.amount;
    document.getElementById('paymentMethod').value = payment.method || '';
    document.getElementById('paymentDetails').value = payment.details || '';
    document.getElementById('paymentDate').value = payment.paid_at ? payment.paid_at.split('T')[0] : '';
    document.getElementById('paymentNote').value = payment.note || '';

    // Show/hide details group based on method
    const method = payment.method || '';
    const detailsGroup = document.getElementById('paymentDetailsGroup');
    const imageGroup = document.getElementById('paymentImageGroup');

    if (['بنكي', 'شيك', 'انستاباي', 'فودافون كاش'].includes(method)) {
        detailsGroup.style.display = 'block';
        imageGroup.style.display = 'block';
    } else {
        detailsGroup.style.display = 'none';
        imageGroup.style.display = 'none';
    }

    // Set form to edit mode
    const form = document.getElementById('paymentForm');
    form.dataset.editId = paymentId;

    showModal('paymentModal');
};

window.deletePayment = function (paymentId) {
    console.log('deletePayment called with ID:', paymentId);
    if (!confirm('هل أنت متأكد من حذف هذه الدفعة؟')) {
        return;
    }

    const crusherId = getCrusherIdFromURL();

    authManager.makeAuthenticatedRequest(`${API_BASE}/crushers/${crusherId}/payments/${paymentId}`, {
        method: 'DELETE'
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('فشل في حذف الدفعة');
            }
            return response.json();
        })
        .then(() => {
            alert('تم حذف الدفعة بنجاح');
            loadCrusherDetails();
        })
        .catch(error => {
            console.error('Error deleting payment:', error);
            alert('خطأ في حذف الدفعة: ' + error.message);
        });
};

// CRUD functions for adjustments
window.viewAdjustment = function (adjustmentId) {
    console.log('viewAdjustment called with ID:', adjustmentId);
    showAdjustmentDetails(adjustmentId).catch(error => {
        console.error('Error in showAdjustmentDetails:', error);
    });
};

window.editAdjustment = function (adjustmentId) {
    console.log('editAdjustment called with ID:', adjustmentId);
    const adjustment = allAdjustments.find(a => a.id === adjustmentId);
    if (!adjustment) {
        alert('لم يتم العثور على التسوية');
        return;
    }

    // Fill form with adjustment data
    document.getElementById('adjustmentAmount').value = adjustment.amount;
    document.getElementById('adjustmentMethod').value = adjustment.method || '';
    document.getElementById('adjustmentDetails').value = adjustment.details || '';
    document.getElementById('adjustmentReason').value = adjustment.reason || '';

    // Show/hide details group based on method
    const method = adjustment.method || '';
    const detailsGroup = document.getElementById('adjustmentDetailsGroup');

    if (['بنكي', 'شيك', 'انستاباي', 'فودافون كاش'].includes(method)) {
        detailsGroup.style.display = 'block';
    } else {
        detailsGroup.style.display = 'none';
    }

    // Set form to edit mode
    const form = document.getElementById('adjustmentForm');
    form.dataset.editId = adjustmentId;

    showModal('adjustmentModal');
};

window.deleteAdjustment = function (adjustmentId) {
    console.log('deleteAdjustment called with ID:', adjustmentId);
    if (!confirm('هل أنت متأكد من حذف هذه التسوية؟')) {
        return;
    }

    const crusherId = getCrusherIdFromURL();

    authManager.makeAuthenticatedRequest(`${API_BASE}/crushers/${crusherId}/adjustments/${adjustmentId}`, {
        method: 'DELETE'
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('فشل في حذف التسوية');
            }
            return response.json();
        })
        .then(() => {
            alert('تم حذف التسوية بنجاح');
            loadCrusherDetails();
        })
        .catch(error => {
            console.error('Error deleting adjustment:', error);
            alert('خطأ في حذف التسوية: ' + error.message);
        });
};
// CRUD functions for deliveries
window.editDelivery = async function (deliveryId) {
    console.log('editDelivery called with ID:', deliveryId);

    try {
        // Find delivery in current data
        const delivery = allDeliveries.find(d => d.id === deliveryId);
        if (!delivery) {
            alert('لم يتم العثور على التسليم');
            return;
        }

        // Populate form with existing data
        document.getElementById('editDeliveryMaterial').value = delivery.material || '';
        document.getElementById('editDeliveryVoucher').value = delivery.voucher || '';
        document.getElementById('editDeliveryCarVolume').value = delivery.car_volume || '';
        document.getElementById('editDeliveryDiscountVolume').value = delivery.discount_volume || 0;
        document.getElementById('editDeliveryDriverName').value = delivery.driver_name || '';
        document.getElementById('editDeliveryCarHead').value = delivery.car_head || '';
        document.getElementById('editDeliveryCarTail').value = delivery.car_tail || '';
        document.getElementById('editDeliveryContractorCharge').value = delivery.contractor_charge_per_meter || '';

        // Set form to edit mode
        const form = document.getElementById('deliveryEditForm');
        form.dataset.editId = deliveryId;

        showModal('deliveryEditModal');
    } catch (error) {
        console.error('Error editing delivery:', error);
        alert('حدث خطأ في تحميل بيانات التسليم');
    }
};

window.deleteDelivery = function (deliveryId) {
    console.log('deleteDelivery called with ID:', deliveryId);
    if (!confirm('هل أنت متأكد من حذف هذه التسليمة؟ تحذير: هذا سيؤثر على الحسابات المحاسبية.')) {
        return;
    }

    authManager.makeAuthenticatedRequest(`${API_BASE}/deliveries/${deliveryId}`, {
        method: 'DELETE'
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('فشل في حذف التسليمة');
            }
            return response.json();
        })
        .then(() => {
            alert('تم حذف التسليمة بنجاح');
            loadCrusherDetails();
        })
        .catch(error => {
            console.error('Error deleting delivery:', error);
            alert('خطأ في حذف التسليمة: ' + error.message);
        });
};
// Report Functions
window.generateDeliveriesReport = async function () {
    const crusherId = getCrusherIdFromURL();
    const fromDate = document.getElementById('deliveriesFromDate').value;
    const toDate = document.getElementById('deliveriesToDate').value;

    if (!fromDate || !toDate) {
        alert('يرجى تحديد فترة زمنية للتقرير');
        return;
    }

    try {
        const url = `${API_BASE}/crushers/${crusherId}/reports/deliveries?from=${fromDate}&to=${toDate}`;
        window.open(url, '_blank');
    } catch (error) {
        console.error('Error generating deliveries report:', error);
        alert('حدث خطأ في إنشاء التقرير');
    }
};

window.generateAccountStatement = async function () {
    const crusherId = getCrusherIdFromURL();
    const useCustomRange = document.getElementById('useCustomDateRange').checked;
    let fromDate = '';
    let toDate = '';

    if (useCustomRange) {
        fromDate = document.getElementById('statementFromDate').value;
        toDate = document.getElementById('statementToDate').value;

        if (!fromDate || !toDate) {
            alert('يرجى تحديد فترة زمنية لكشف الحساب');
            return;
        }
    }

    try {
        let url = `${API_BASE}/crushers/${crusherId}/reports/statement`;
        if (fromDate && toDate) {
            url += `?from=${fromDate}&to=${toDate}`;
        }
        window.open(url, '_blank');
    } catch (error) {
        console.error('Error generating account statement:', error);
        alert('حدث خطأ في إنشاء كشف الحساب');
    }
};

window.toggleDateInputs = function () {
    const checkbox = document.getElementById('useCustomDateRange');
    const dateInputs = document.getElementById('dateInputs');

    if (checkbox.checked) {
        dateInputs.style.display = 'flex';
        // Set default dates
        const today = new Date().toISOString().split('T')[0];
        const firstOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
        document.getElementById('statementFromDate').value = firstOfYear;
        document.getElementById('statementToDate').value = today;
    } else {
        dateInputs.style.display = 'none';
    }
};

// Event delegation for CSP compliance - ENHANCED
document.addEventListener('click', function (e) {
    const action = e.target.getAttribute('data-action');
    const target = e.target.getAttribute('data-target');
    const type = e.target.getAttribute('data-type');
    const id = e.target.getAttribute('data-id');

    console.log('Click detected on element:', e.target);
    console.log('data-action:', action, 'data-type:', type, 'data-id:', id);

    // Handle modal close
    if (action === 'close-modal' && target) {
        console.log('Closing modal:', target);
        closeModal(target);
        return;
    }

    // Handle CRUD operations for dynamically created buttons
    if (e.target.classList.contains('crud-btn')) {
        e.preventDefault();
        e.stopPropagation();

        if (!action || !type || !id) {
            console.error('<i class="fas fa-times-circle"></i> Missing required attributes:', { action, type, id });
            return;
        }

        try {
            if (action === 'view' && type === 'payment') {
                console.log('<i class="fas fa-eye"></i> Calling showPaymentDetails with ID:', id);
                showPaymentDetails(id);
            } else if (action === 'edit' && type === 'payment') {
                console.log('<i class="fas fa-edit"></i> Calling editPayment with ID:', id);
                editPayment(id);
            } else if (action === 'delete' && type === 'payment') {
                console.log('<i class="fas fa-trash"></i> Calling deletePayment with ID:', id);
                deletePayment(id);
            } else if (action === 'view' && type === 'adjustment') {
                console.log('<i class="fas fa-eye"></i> Calling showAdjustmentDetails with ID:', id);
                showAdjustmentDetails(id);
            } else if (action === 'edit' && type === 'adjustment') {
                console.log('<i class="fas fa-edit"></i> Calling editAdjustment with ID:', id);
                editAdjustment(id);
            } else if (action === 'delete' && type === 'adjustment') {
                console.log('<i class="fas fa-trash"></i> Calling deleteAdjustment with ID:', id);
                deleteAdjustment(id);
            } else if (action === 'edit' && type === 'delivery') {
                console.log('<i class="fas fa-edit"></i> Calling editDelivery with ID:', id);
                editDelivery(id);
            } else if (action === 'delete' && type === 'delivery') {
                console.log('<i class="fas fa-trash"></i> Calling deleteDelivery with ID:', id);
                deleteDelivery(id);
            } else {
                console.warn('<i class="fas fa-exclamation-triangle"></i> Unhandled CRUD operation:', { action, type, id });
            }
        } catch (error) {
            console.error('💥 Error executing CRUD operation:', error);
        }
        return;
    }
});

// ============================================================================
// OPENING BALANCE MANAGEMENT (Project-Based)
// ============================================================================

let editCrusherOpeningBalanceCounter = 0;

async function loadEditCrusherOpeningBalances() {
    if (!crusherData || !crusherData.opening_balances) return;
    
    const container = document.getElementById('editCrusherOpeningBalancesContainer');
    container.innerHTML = '';
    
    // Load projects for dropdown
    await loadEditProjectsList();
    
    // Add existing opening balances
    crusherData.opening_balances.forEach(ob => {
        addEditCrusherOpeningBalanceRow(ob);
    });
}

async function loadEditProjectsList() {
    try {
        const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/projects`);
        const data = await response.json();
        editProjectsList = data.projects || [];
    } catch (error) {
        console.error('Error loading projects:', error);
        editProjectsList = [];
    }
}

function addEditCrusherOpeningBalanceRow(existingData = null) {
    const container = document.getElementById('editCrusherOpeningBalancesContainer');
    const rowId = editCrusherOpeningBalanceCounter++;
    
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
    projectSelect.className = 'form-input crusher-opening-balance-project';
    projectSelect.required = true;
    projectSelect.innerHTML = '<option value="">اختر المشروع</option>';
    
    editProjectsList.forEach(project => {
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
    amountInput.className = 'form-input crusher-opening-balance-amount';
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
    descInput.className = 'form-input crusher-opening-balance-description';
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

function getEditCrusherOpeningBalances() {
    const container = document.getElementById('editCrusherOpeningBalancesContainer');
    const rows = container.querySelectorAll('.opening-balance-row');
    const balances = [];
    
    rows.forEach(row => {
        const projectSelect = row.querySelector('.crusher-opening-balance-project');
        const amountInput = row.querySelector('.crusher-opening-balance-amount');
        const descInput = row.querySelector('.crusher-opening-balance-description');
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
document.getElementById('addEditCrusherOpeningBalanceBtn')?.addEventListener('click', () => {
    addEditCrusherOpeningBalanceRow();
});

// Update edit crusher button to load opening balances
document.getElementById('editCrusherBtn')?.addEventListener('click', async () => {
    if (crusherData && crusherData.crusher) {
        document.getElementById('editCrusherName').value = crusherData.crusher.name;
        await loadEditCrusherOpeningBalances();
        showModal('editCrusherModal');
    }
});

// Update edit crusher form submission
document.getElementById('editCrusherForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const crusherId = getCrusherIdFromURL();
    const name = document.getElementById('editCrusherName').value;
    const opening_balances = getEditCrusherOpeningBalances();
    
    console.log('=== SAVING CRUSHER ===');
    console.log('Crusher ID:', crusherId);
    console.log('Name:', name);
    console.log('Opening Balances:', opening_balances);
    console.log('Opening Balances JSON:', JSON.stringify(opening_balances, null, 2));
    
    try {
        const requestBody = { name, opening_balances };
        console.log('Request body:', JSON.stringify(requestBody, null, 2));
        
        const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/crushers/${crusherId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const error = await response.json();
            console.error('Error response:', error);
            throw new Error(error.message || 'فشل في تحديث الكسارة');
        }
        
        const result = await response.json();
        console.log('Success response:', result);
        
        showMessage('editCrusherMessage', 'تم تحديث البيانات بنجاح', 'success');
        setTimeout(() => {
            closeModal('editCrusherModal');
            loadCrusherDetails();
        }, 1000);
    } catch (error) {
        console.error('Save error:', error);
        showMessage('editCrusherMessage', error.message, 'error');
    }
});