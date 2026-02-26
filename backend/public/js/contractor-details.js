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
let contractorData = null;
let allDeliveries = [];
let allPayments = [];
let allAdjustments = [];

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
function getContractorIdFromURL() {
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
    const openingBalance = totals.openingBalance || 0;

    // Determine opening balance status
    const openingBalanceClass = openingBalance > 0 ? 'text-danger' : openingBalance < 0 ? 'text-success' : '';
    const openingBalanceLabel = openingBalance > 0 ? 'مستحق للمقاول' : openingBalance < 0 ? 'مستحق لنا' : '';

    // Determine current balance status - POSITIVE = WE OWE THEM
    const balanceClass = balance > 0 ? 'text-danger' : balance < 0 ? 'text-success' : '';
    const balanceLabel = balance > 0 ? 'مستحق للمقاول' : balance < 0 ? 'مستحق لنا' : 'متوازن';

    container.innerHTML = `
        <div class="summary-item">
            <div class="summary-value ${openingBalanceClass}">${formatCurrency(Math.abs(openingBalance))}</div>
            <div class="summary-label">الرصيد الافتتاحي <small style="font-size: 0.75rem;">${openingBalanceLabel}</small></div>
        </div>
        <div class="summary-item">
            <div class="summary-value text-danger">${formatCurrency(totals.totalTrips || 0)}</div>
            <div class="summary-label">إجمالي مستحقات المشاوير</div>
        </div>
        <div class="summary-item">
            <div class="summary-value text-success">${formatCurrency(totals.totalPayments || 0)}</div>
            <div class="summary-label">إجمالي المدفوعات</div>
        </div>
        <div class="summary-item">
            <div class="summary-value ${totals.totalAdjustments >= 0 ? 'text-danger' : 'text-success'}">${formatCurrency(Math.abs(totals.totalAdjustments || 0))}</div>
            <div class="summary-label">إجمالي التعديلات</div>
        </div>
        <div class="summary-item">
            <div class="summary-value ${balanceClass}">${formatCurrency(Math.abs(balance))}</div>
            <div class="summary-label">الصافي - <small style="font-size: 0.75rem;">${balanceLabel}</small></div>
        </div>
    `;
}

function renderDeliveries(deliveries) {
    const container = document.getElementById('deliveriesContainer');

    if (!deliveries || deliveries.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🚛</div>
                <div>لا توجد مشاوير مسجلة</div>
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
        'التاريخ', 'العميل', 'الكسارة', 'المادة', 'رقم البون',
        'كمية الحمولة (م³)', 'مستحق المقاول', 'إجراءات'
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
            delivery.client_name || '-',
            delivery.crusher_name || '-',
            delivery.material || '-',
            delivery.voucher || '-',
            formatQuantity(delivery.quantity) + ' م³', // Only quantity for contractors
            formatCurrency(delivery.contractor_total_charge || delivery.contractor_charge || 0)
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
            const imageBtn = document.createElement('button');
            imageBtn.className = 'btn btn-sm btn-secondary';
            imageBtn.title = 'عرض الصورة';
            imageBtn.innerHTML = '🖼️ عرض';
            imageBtn.setAttribute('data-image', payment.payment_image);
            imageBtn.onclick = function () {
                const imageData = this.getAttribute('data-image');
                showImageModal(imageData);
            };
            imageCell.appendChild(imageBtn);
        } else {
            imageCell.textContent = '-';
        }
        row.appendChild(imageCell);

        // Actions cell
        const actionsCell = document.createElement('td');
        actionsCell.innerHTML = `
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
    console.log('showModal called with:', modalId);
    const modal = document.getElementById(modalId);
    console.log('Modal element found:', !!modal);
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
        console.log('Modal should now be visible');
    } else {
        console.error('Modal not found:', modalId);
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
        }
    }
}

function showMessage(elementId, message, type) {
    const msgDiv = document.getElementById(elementId);
    if (msgDiv) {
        msgDiv.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
    }
}

// API Functions
async function addPayment(contractorId, paymentData) {
    try {
        console.log('Sending payment request to:', `${API_BASE}/contractors/${contractorId}/payments`);
        console.log('Payment data:', paymentData);

        const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/contractors/${contractorId}/payments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(paymentData)
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            let errorMessage = 'فشل في إضافة الدفعة';
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
                console.log('Error data:', errorData);
            } catch (e) {
                console.log('Could not parse error response as JSON');
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
        const contractorId = getContractorIdFromURL();
        const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/contractors/${contractorId}/payments/${paymentId}`, {
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

async function addAdjustment(contractorId, adjustmentData) {
    const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/contractors/${contractorId}/adjustments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adjustmentData)
    });

    if (!response.ok) {
        throw new Error('فشل في إضافة التسوية');
    }

    return response.json();
}

async function updateAdjustment(adjustmentId, adjustmentData) {
    try {
        const contractorId = getContractorIdFromURL();
        const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/contractors/${contractorId}/adjustments/${adjustmentId}`, {
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

    // Add Payment Button
    document.getElementById('addPaymentBtn').addEventListener('click', () => {
        // Reset form and clear edit mode
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
        document.getElementById('adjustmentMessage').innerHTML = '';
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

        const contractorId = getContractorIdFromURL();
        const amount = document.getElementById('paymentAmount').value;
        const paid_at = document.getElementById('paymentDate').value;
        const note = document.getElementById('paymentNote').value;
        const method = document.getElementById('paymentMethod').value;
        const details = document.getElementById('paymentDetails').value;

        const paymentData = { amount, paid_at, note, method };
        if (details) {
            paymentData.details = details;
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

        const form = e.target;
        const editId = form.dataset.editId;

        try {
            if (editId) {
                // Update existing payment
                await updatePayment(editId, paymentData);
                showMessage('paymentMessage', 'تم تحديث الدفعة بنجاح', 'success');
            } else {
                // Add new payment
                await addPayment(contractorId, paymentData);
                showMessage('paymentMessage', 'تم إضافة الدفعة بنجاح', 'success');
            }

            // Clear form and edit mode
            document.getElementById('paymentForm').reset();
            form.removeAttribute('data-edit-id');
            document.getElementById('paymentDetailsGroup').style.display = 'none';
            document.getElementById('paymentImageGroup').style.display = 'none';

            setTimeout(() => {
                closeModal('paymentModal');
                loadContractorDetails(); // Reload data
            }, 1000);
        } catch (error) {
            showMessage('paymentMessage', error.message, 'error');
        }
    });

    // Adjustment Form
    document.getElementById('adjustmentForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const contractorId = getContractorIdFromURL();
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
                await addAdjustment(contractorId, adjustmentData);
                showMessage('adjustmentMessage', 'تم إضافة التسوية بنجاح', 'success');
            }

            // Clear form and edit mode
            document.getElementById('adjustmentForm').reset();
            form.removeAttribute('data-edit-id');

            setTimeout(() => {
                closeModal('adjustmentModal');
                loadContractorDetails(); // Reload data
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
            quantity: parseFloat(document.getElementById('editDeliveryQuantity').value),
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
                loadContractorDetails(); // Reload data
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
            (delivery.crusher_name || '').toLowerCase().includes(searchTerm) ||
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
            case 'charge-asc':
                return (a.contractor_charge || 0) - (b.contractor_charge || 0);
            case 'charge-desc':
                return (b.contractor_charge || 0) - (a.contractor_charge || 0);
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
async function loadContractorDetails() {
    const contractorId = getContractorIdFromURL();

    if (!contractorId) {
        document.querySelector('.main-content').innerHTML = `
            <div class="error">
                <h2>خطأ</h2>
                <p>لم يتم تحديد المقاول</p>
                <a href="contractors.html" class="btn btn-primary">العودة للمقاولين</a>
            </div>
        `;
        return;
    }

    try {
        const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/contractors/${contractorId}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: فشل في تحميل بيانات المقاول`);
        }

        const data = await response.json();
        contractorData = data;

        console.log('=== CONTRACTOR DATA DEBUG ===');
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
        document.getElementById('contractorName').textContent = `تفاصيل المقاول: ${data.contractor.name}`;

        // Render all sections
        renderSummary(data.totals || {});
        renderDeliveries(allDeliveries);
        renderPayments(allPayments);
        renderAdjustments(allAdjustments);

    } catch (error) {
        console.error('Error loading contractor details:', error);
        document.querySelector('.main-content').innerHTML = `
            <div class="error">
                <h2>خطأ في تحميل البيانات</h2>
                <p>${error.message}</p>
                <a href="contractors.html" class="btn btn-primary">العودة للمقاولين</a>
            </div>
        `;
    }
}

// Edit contractor functionality
async function openEditContractorModal() {
    console.log('openEditContractorModal called');
    console.log('contractorData:', contractorData);

    if (!contractorData || !contractorData.contractor) {
        console.error('No contractor data available');
        alert('لا توجد بيانات مقاول للتعديل');
        return;
    }

    const contractor = contractorData.contractor;
    console.log('Contractor:', contractor);

    // Fill form with current data
    document.getElementById('editContractorName').value = contractor.name || '';

    // Load projects first
    await loadProjectsForEdit();

    // Clear and load opening balances
    const container = document.getElementById('editContractorOpeningBalancesContainer');
    container.innerHTML = '';
    
    if (contractorData.opening_balances && contractorData.opening_balances.length > 0) {
        contractorData.opening_balances.forEach(balance => {
            addEditContractorOpeningBalanceRow(balance);
        });
    }

    console.log('Showing contractor edit modal...');
    // Show modal
    showModal('editContractorModal');
}

// Load projects for edit modal
let editContractorProjectsList = [];
let editContractorOpeningBalanceCounter = 0;

async function loadProjectsForEdit() {
    try {
        const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/clients`);
        if (!response.ok) throw new Error('فشل في تحميل المشاريع');
        const data = await response.json();
        editContractorProjectsList = data.clients || [];
    } catch (error) {
        console.error('Error loading projects:', error);
        editContractorProjectsList = [];
    }
}

// Add opening balance row for edit form
function addEditContractorOpeningBalanceRow(existingData = null) {
    const container = document.getElementById('editContractorOpeningBalancesContainer');
    const rowId = editContractorOpeningBalanceCounter++;
    
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
    projectSelect.className = 'form-input contractor-opening-balance-project';
    projectSelect.required = true;
    projectSelect.innerHTML = '<option value="">اختر المشروع</option>';
    
    editContractorProjectsList.forEach(project => {
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
    amountInput.className = 'form-input contractor-opening-balance-amount';
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
    descInput.className = 'form-input contractor-opening-balance-description';
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
    deleteBtn.textContent = '🗑️';
    deleteBtn.onclick = () => row.remove();
    deleteCol.appendChild(deleteBtn);
    
    row.appendChild(projectCol);
    row.appendChild(amountCol);
    row.appendChild(descCol);
    row.appendChild(deleteCol);
    
    container.appendChild(row);
}

// Get opening balances from edit form
function getEditContractorOpeningBalances() {
    const container = document.getElementById('editContractorOpeningBalancesContainer');
    const rows = container.querySelectorAll('.opening-balance-row');
    const balances = [];
    
    rows.forEach(row => {
        const projectSelect = row.querySelector('.contractor-opening-balance-project');
        const amountInput = row.querySelector('.contractor-opening-balance-amount');
        const descInput = row.querySelector('.contractor-opening-balance-description');
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

async function updateContractor(contractorId, contractorData) {
    try {
        console.log('🔄 Updating contractor:', contractorId, contractorData);
        console.log('📤 API URL:', `${API_BASE}/contractors/${contractorId}`);

        const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/contractors/${contractorId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(contractorData)
        });

        console.log('📥 Response status:', response.status, response.statusText);

        if (!response.ok) {
            let errorMessage = 'فشل في تحديث بيانات المقاول';
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
                console.error('❌ Server error data:', errorData);
            } catch (e) {
                const errorText = await response.text();
                console.error('❌ Server error text:', errorText);
                errorMessage = `خطأ في السيرفر (${response.status}): ${errorText}`;
            }
            throw new Error(errorMessage);
        }

        const result = await response.json();
        console.log('✅ Update successful:', result);
        return result;
    } catch (error) {
        console.error('❌ Update contractor error:', error);
        throw error;
    }
}

function setupEditContractorHandlers() {
    console.log('Setting up edit contractor handlers...');

    // Edit contractor button
    const editBtn = document.getElementById('editContractorBtn');
    if (editBtn) {
        console.log('Edit contractor button found, adding event listener');
        editBtn.addEventListener('click', function () {
            console.log('Edit contractor button clicked!');
            openEditContractorModal();
        });
        console.log('Edit contractor event listener added successfully');
    } else {
        console.error('Edit contractor button not found!');
    }

    // Edit contractor form
    document.getElementById('editContractorForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const contractorId = getContractorIdFromURL();
        const formData = new FormData(e.target);
        const openingBalances = getEditContractorOpeningBalances();

        const contractorData = {
            name: formData.get('name').trim(),
            opening_balances: openingBalances
        };

        if (!contractorData.name) {
            showMessage('editContractorMessage', 'اسم المقاول مطلوب', 'error');
            return;
        }

        try {
            showMessage('editContractorMessage', 'جاري حفظ التعديلات...', 'info');

            await updateContractor(contractorId, contractorData);

            showMessage('editContractorMessage', 'تم حفظ التعديلات بنجاح', 'success');

            // Close modal and reload data
            setTimeout(() => {
                closeModal('editContractorModal');
                loadContractorDetails();
            }, 1000);

        } catch (error) {
            showMessage('editContractorMessage', error.message, 'error');
        }
    });

    // Add opening balance button for edit form
    const addEditBalanceBtn = document.getElementById('addEditContractorOpeningBalanceBtn');
    if (addEditBalanceBtn) {
        addEditBalanceBtn.addEventListener('click', () => addEditContractorOpeningBalanceRow());
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventHandlers();
    setupEditContractorHandlers();
    loadContractorDetails();

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

    const contractorId = getContractorIdFromURL();

    authManager.makeAuthenticatedRequest(`${API_BASE}/contractors/${contractorId}/payments/${paymentId}`, {
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
            loadContractorDetails();
        })
        .catch(error => {
            console.error('Error deleting payment:', error);
            alert('خطأ في حذف الدفعة: ' + error.message);
        });
};

// CRUD functions for adjustments
window.editAdjustment = function (adjustmentId) {
    console.log('editAdjustment called with ID:', adjustmentId);
    const adjustment = allAdjustments.find(a => a.id === adjustmentId);
    if (!adjustment) {
        alert('لم يتم العثور على التسوية');
        return;
    }

    // Fill form with adjustment data
    document.getElementById('adjustmentAmount').value = adjustment.amount;
    document.getElementById('adjustmentReason').value = adjustment.reason || '';

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

    const contractorId = getContractorIdFromURL();

    authManager.makeAuthenticatedRequest(`${API_BASE}/contractors/${contractorId}/adjustments/${adjustmentId}`, {
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
            loadContractorDetails();
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
        document.getElementById('editDeliveryQuantity').value = delivery.quantity || '';
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
            loadContractorDetails();
        })
        .catch(error => {
            console.error('Error deleting delivery:', error);
            alert('خطأ في حذف التسليمة: ' + error.message);
        });
};
// Report Functions
window.generateDeliveriesReport = async function () {
    const contractorId = getContractorIdFromURL();
    const fromDate = document.getElementById('deliveriesFromDate').value;
    const toDate = document.getElementById('deliveriesToDate').value;

    if (!fromDate || !toDate) {
        alert('يرجى تحديد فترة زمنية للتقرير');
        return;
    }

    try {
        const url = `${API_BASE}/contractors/${contractorId}/reports/deliveries?from=${fromDate}&to=${toDate}`;
        window.open(url, '_blank');
    } catch (error) {
        console.error('Error generating deliveries report:', error);
        alert('حدث خطأ في إنشاء التقرير');
    }
};

window.generateAccountStatement = async function () {
    const contractorId = getContractorIdFromURL();
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
        let url = `${API_BASE}/contractors/${contractorId}/reports/statement`;
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
// Event delegation for CSP compliance - COMPLETE
document.addEventListener('click', function (e) {
    const action = e.target.getAttribute('data-action');
    const target = e.target.getAttribute('data-target');
    const type = e.target.getAttribute('data-type');
    const id = e.target.getAttribute('data-id');

    console.log('Click detected on element:', e.target);
    console.log('data-action:', action, 'data-type:', type, 'data-id:', id, 'data-target:', target);

    // Handle modal close
    if (action === 'close-modal' && target) {
        console.log('Closing modal:', target);
        closeModal(target);
        return;
    }

    // Handle CRUD operations
    if (action && type && id) {
        e.preventDefault(); // Prevent any default behavior
        e.stopPropagation(); // Stop event bubbling

        console.log(`Handling ${action} ${type} with ID: ${id}`);

        try {
            if (action === 'edit') {
                if (type === 'delivery') {
                    console.log('Calling editDelivery');
                    window.editDelivery(id);
                } else if (type === 'payment') {
                    console.log('Calling editPayment');
                    window.editPayment(id);
                } else if (type === 'adjustment') {
                    console.log('Calling editAdjustment');
                    window.editAdjustment(id);
                }
            } else if (action === 'delete') {
                if (type === 'delivery') {
                    console.log('Calling deleteDelivery');
                    window.deleteDelivery(id);
                } else if (type === 'payment') {
                    console.log('Calling deletePayment');
                    window.deletePayment(id);
                } else if (type === 'adjustment') {
                    console.log('Calling deleteAdjustment');
                    window.deleteAdjustment(id);
                }
            }
        } catch (error) {
            console.error('Error executing CRUD operation:', error);
        }

        return; // Exit early to prevent other handlers
    }
});