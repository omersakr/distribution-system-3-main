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
        console.log('Modal classes before:', modal.className);
        console.log('Modal display before:', modal.style.display);
        
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        modal.classList.add('active');
        
        console.log('Modal classes after:', modal.className);
        console.log('Modal display after:', modal.style.display);
        console.log('Modal computed display:', window.getComputedStyle(modal).display);
        console.log('Modal should now be visible');
    } else {
        console.error('Modal not found:', modalId);
    }
}

// Helpers
function getCrusherIdFromURL() {
    return new URLSearchParams(window.location.search).get('id');
}

function formatCurrency(amount) {
    return Number(amount || 0).toLocaleString('ar-EG', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }) + ' ج.م';
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
    const netClass = net > 0 ? 'text-error' : net < 0 ? 'text-emerald-600' : '';
    const netLabel = net > 0 ? 'مستحق للكسارة' : net < 0 ? 'مستحق لنا' : 'متوازن';
    
    const adjustments = totals.totalAdjustments || 0;
    const adjustmentsClass = adjustments > 0 ? 'text-error' : adjustments < 0 ? 'text-emerald-600' : '';

    container.innerHTML = `
        <div class="bg-surface-container-lowest p-6 rounded-xl border-r-4 border-slate-300 shadow-sm">
            <p class="text-sm text-on-surface-variant mb-2 text-right">الرصيد الافتتاحي</p>
            <p class="text-2xl font-manrope font-extrabold text-slate-900 text-right">${formatCurrency(openingBalance).replace('EGP', '').trim()} <span class="text-xs font-arabic text-slate-400">ج.م</span></p>
        </div>
        <div class="bg-surface-container-lowest p-6 rounded-xl border-r-4 border-error shadow-sm">
            <p class="text-sm text-on-surface-variant mb-2 text-right">المطلوب الأساسي</p>
            <p class="text-2xl font-manrope font-extrabold text-error text-right">${formatCurrency(totals.totalRequired || 0).replace('EGP', '').trim()} <span class="text-xs font-arabic text-error/50">ج.م</span></p>
        </div>
        <div class="bg-surface-container-lowest p-6 rounded-xl border-r-4 ${adjustments >= 0 ? 'border-error' : 'border-emerald-500'} shadow-sm">
            <p class="text-sm text-on-surface-variant mb-2 text-right">التسويات</p>
            <p class="text-2xl font-manrope font-extrabold ${adjustmentsClass} text-right">${formatCurrency(Math.abs(adjustments)).replace('EGP', '').trim()} <span class="text-xs font-arabic ${adjustmentsClass}/50">ج.م</span></p>
        </div>
        <div class="bg-surface-container-lowest p-6 rounded-xl border-r-4 border-error shadow-sm">
            <p class="text-sm text-on-surface-variant mb-2 text-right">المطلوب النهائي</p>
            <p class="text-2xl font-manrope font-extrabold text-error text-right">${formatCurrency(totals.totalNeeded || 0).replace('EGP', '').trim()} <span class="text-xs font-arabic text-error/50">ج.م</span></p>
        </div>
        <div class="bg-surface-container-lowest p-6 rounded-xl border-r-4 border-emerald-500 shadow-sm">
            <p class="text-sm text-on-surface-variant mb-2 text-right">المدفوع</p>
            <p class="text-2xl font-manrope font-extrabold text-emerald-700 text-right">${formatCurrency(totals.totalPaid || 0).replace('EGP', '').trim()} <span class="text-xs font-arabic text-emerald-600/50">ج.م</span></p>
        </div>
        <div class="${net > 0 ? 'bg-red-900' : net < 0 ? 'bg-green-900' : 'bg-slate-900'} p-6 rounded-xl shadow-lg">
            <p class="text-sm ${net > 0 ? 'text-red-300' : net < 0 ? 'text-green-300' : 'text-slate-400'} mb-2 text-right">${net > 0 ? 'مستحق عليا للكسارة' : net < 0 ? 'مستحق ليا من الكسارة' : 'متوازن'}</p>
            <p class="text-2xl font-manrope font-extrabold text-white text-right">${formatCurrency(Math.abs(net)).replace('EGP', '').trim()} <span class="text-xs font-arabic text-slate-500">ج.م</span></p>
        </div>
        <div class="bg-surface-container-lowest p-6 rounded-xl border-r-4 border-primary shadow-sm">
            <p class="text-sm text-on-surface-variant mb-2 text-right">عدد التسليمات</p>
            <p class="text-2xl font-manrope font-extrabold text-slate-900 text-right">${totals.deliveriesCount || 0}</p>
        </div>
        <div class="bg-surface-container-lowest p-6 rounded-xl border-r-4 border-primary shadow-sm">
            <p class="text-sm text-on-surface-variant mb-2 text-right">إجمالي الكمية</p>
            <p class="text-2xl font-manrope font-extrabold text-slate-900 text-right">${formatQuantity(totals.totalVolume)} <span class="text-xs font-arabic text-slate-400">م³</span></p>
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
        priceItem.className = 'bg-white p-4 rounded-xl border border-slate-100 hover:border-primary-200 transition-all';

        if (material.value && material.value > 0) {
            priceItem.innerHTML = `
                <p class="text-xs font-medium text-slate-500 text-right mb-1">${material.label}</p>
                <p class="text-lg font-bold text-slate-900 text-right">${formatCurrency(material.value).replace('EGP', '').trim()} <span class="text-[10px] text-slate-400">ج.م</span></p>
            `;
        } else {
            priceItem.innerHTML = `
                <p class="text-xs font-medium text-slate-500 text-right mb-1">${material.label}</p>
                <p class="text-lg font-bold text-slate-400 text-right">غير محدد</p>
            `;
            priceItem.classList.add('opacity-60');
        }

        container.appendChild(priceItem);
    });
}

function renderMaterials(materialTotals) {
    const container = document.getElementById('materialsContainer');

    if (!materialTotals || materialTotals.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12 text-slate-500">
                <span class="material-symbols-outlined text-5xl mb-4 block">inventory_2</span>
                <div>لا توجد بيانات مواد</div>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    materialTotals.forEach(material => {
        const totalValue = material.totalValue || 0;
        const totalQty = material.totalQty || 0;
        const maxQty = Math.max(...materialTotals.map(m => m.totalQty || 0));
        const percentage = maxQty > 0 ? (totalQty / maxQty) * 100 : 0;

        const card = document.createElement('div');
        card.className = 'bg-white p-4 rounded-xl border border-slate-100 hover:border-emerald-200 transition-all group';
        card.innerHTML = `
            <p class="text-xs font-medium text-slate-500 text-right mb-1">${material.material}</p>
            <p class="text-lg font-bold text-slate-900 text-right">${formatQuantity(totalQty)} <span class="text-[10px] text-slate-400">وحدة</span></p>
            <div class="mt-3 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full bg-emerald-500" style="width: ${percentage}%"></div>
            </div>
            <p class="mt-2 text-xs font-manrope font-semibold text-emerald-600 text-right">${formatCurrency(totalValue).replace('EGP', '').trim()} ج.م</p>
        `;
        container.appendChild(card);
    });
}

function renderDeliveries(deliveries) {
    const container = document.getElementById('deliveriesContainer');

    if (!deliveries || deliveries.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 text-slate-500">
                <span class="material-symbols-outlined text-5xl mb-4 block">local_shipping</span>
                <div>لا توجد تسليمات مسجلة</div>
            </div>
        `;
        return;
    }

    const table = document.createElement('table');
    table.className = 'w-full text-right border-collapse';

    // Header
    const thead = document.createElement('thead');
    thead.className = 'bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider';
    const headerRow = document.createElement('tr');
    const headers = [
        'التاريخ', 'المقاول', 'المادة', 'رقم البون',
        'تكعيب السيارة (م³)', 'قيمة الخصم (م³)', 'الكمية الصافية (م³)', 'سعر المتر', 'الإجمالي', 'إجراءات'
    ];

    headers.forEach(header => {
        const th = document.createElement('th');
        th.className = 'px-6 py-4';
        th.textContent = header;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');
    tbody.className = 'divide-y divide-slate-100 text-sm';
    deliveries.forEach(delivery => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-slate-50/50 transition-colors';

        const cells = [
            formatDate(delivery.created_at),
            delivery.contractor_name || '-',
            delivery.material || '-',
            delivery.voucher || '-',
            formatQuantity(delivery.car_volume) + ' م³',
            formatQuantity(delivery.discount_volume) + ' م³',
            formatQuantity((Number(delivery.car_volume || 0) - Number(delivery.discount_volume || 0))) + ' م³',
            formatCurrency(delivery.material_price_at_time).replace('EGP', '').trim(),
            formatCurrency(delivery.crusher_total_cost).replace('EGP', '').trim()
        ];

        cells.forEach((cellText, index) => {
            const td = document.createElement('td');
            td.className = 'px-6 py-4';
            if (index === 0) td.classList.add('font-manrope', 'font-medium');
            if (index === 7 || index === 8) td.classList.add('font-manrope', 'font-bold', 'text-slate-900');
            td.textContent = cellText;
            row.appendChild(td);
        });

        // Actions cell
        const actionsCell = document.createElement('td');
        actionsCell.className = 'px-6 py-4';
        actionsCell.innerHTML = `
            <div class="flex justify-center gap-2">
                <button class="p-1.5 text-slate-400 hover:text-primary transition-colors crud-btn" data-action="edit" data-type="delivery" data-id="${delivery.id}" title="تعديل">
                    <span class="material-symbols-outlined text-lg">edit</span>
                </button>
                <button class="p-1.5 text-slate-400 hover:text-error transition-colors crud-btn" data-action="delete" data-type="delivery" data-id="${delivery.id}" title="حذف">
                    <span class="material-symbols-outlined text-lg">delete</span>
                </button>
            </div>
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
            <div class="empty-state-modern">
                <i class="fas fa-balance-scale"></i>
                <h3>لا توجد تسويات مسجلة</h3>
                <p>لم يتم تسجيل أي تسويات لهذه الكسارة بعد</p>
            </div>
        `;
        return;
    }

    const table = document.createElement('table');
    table.className = 'table-modern';

    // Header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = ['التاريخ', 'المبلغ', 'النوع', 'السبب', 'إجراءات'];

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

        // Date
        const dateCell = document.createElement('td');
        dateCell.textContent = formatDate(adjustment.created_at);
        row.appendChild(dateCell);

        // Amount
        const amountCell = document.createElement('td');
        const amount = adjustment.amount || 0;
        amountCell.textContent = formatCurrency(Math.abs(amount));
        amountCell.style.fontWeight = '600';
        row.appendChild(amountCell);

        // Type
        const typeCell = document.createElement('td');
        const isAddition = amount > 0;
        typeCell.className = isAddition ? 'text-success' : 'text-danger';
        typeCell.textContent = isAddition ? 'إضافة (لنا)' : 'خصم (للكسارة)';
        typeCell.style.fontWeight = '600';
        row.appendChild(typeCell);

        // Reason
        const reasonCell = document.createElement('td');
        reasonCell.textContent = adjustment.reason || '-';
        reasonCell.title = adjustment.reason || '-';
        row.appendChild(reasonCell);

        // Actions cell
        const actionsCell = document.createElement('td');
        actionsCell.innerHTML = `
            <div class="action-btn-group">
                <button class="action-btn-modern view crud-btn" data-action="view" data-type="adjustment" data-id="${adjustment.id}" title="عرض">
                    <i class="fas fa-regular fa-image"></i>
                </button>
                <button class="action-btn-modern edit crud-btn" data-action="edit" data-type="adjustment" data-id="${adjustment.id}" title="تعديل">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn-modern danger crud-btn" data-action="delete" data-type="adjustment" data-id="${adjustment.id}" title="حذف">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
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
            <div class="empty-state-modern">
                <i class="fas fa-money-bill-wave"></i>
                <h3>لا توجد مدفوعات مسجلة</h3>
                <p>لم يتم تسجيل أي مدفوعات لهذه الكسارة بعد</p>
            </div>
        `;
        return;
    }

    const table = document.createElement('table');
    table.className = 'table-modern';

    // Header - Reduced columns
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = ['التاريخ', 'المبلغ', 'الطريقة', 'التفاصيل', 'إجراءات'];

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

        // Date
        const dateCell = document.createElement('td');
        dateCell.textContent = formatDate(payment.paid_at);
        row.appendChild(dateCell);

        // Amount
        const amountCell = document.createElement('td');
        amountCell.textContent = formatCurrency(payment.amount);
        amountCell.style.fontWeight = '600';
        amountCell.style.color = 'var(--tertiary)';
        row.appendChild(amountCell);

        // Method
        const methodCell = document.createElement('td');
        methodCell.textContent = payment.method || '-';
        row.appendChild(methodCell);

        // Details (combined details and note)
        const detailsCell = document.createElement('td');
        detailsCell.textContent = payment.details || payment.note || '-';
        detailsCell.title = payment.details || payment.note || '-'; // Show full text on hover
        row.appendChild(detailsCell);

        // Actions cell
        const actionsCell = document.createElement('td');
        actionsCell.innerHTML = `
            <div class="action-btn-group">
                <button class="action-btn-modern view crud-btn" data-action="view" data-type="payment" data-id="${payment.id}" title="عرض">
                    <i class="fas fa-regular fa-image"></i>
                </button>
                <button class="action-btn-modern edit crud-btn" data-action="edit" data-type="payment" data-id="${payment.id}" title="تعديل">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn-modern danger crud-btn" data-action="delete" data-type="payment" data-id="${payment.id}" title="حذف">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
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
            // No need to hide adjustmentDetailsGroup since it doesn't exist anymore
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

    // Payment method change handler - show image field for شيك and انستاباي
    document.getElementById('paymentMethod').addEventListener('change', (e) => {
        const detailsGroup = document.getElementById('paymentDetailsGroup');
        const imageGroup = document.getElementById('paymentImageGroup');
        const detailsInput = document.getElementById('paymentDetails');
        const method = e.target.value;

        // Show details field for: بنكي, شيك, انستاباي, فودافون كاش
        if (['بنكي', 'شيك', 'انستاباي', 'فودافون كاش'].includes(method)) {
            detailsGroup.style.display = 'block';
            detailsInput.required = true;

            if (method === 'شيك') {
                detailsInput.placeholder = 'رقم الشيك';
            } else if (method === 'بنكي') {
                detailsInput.placeholder = 'رقم المعاملة البنكية';
            } else {
                detailsInput.placeholder = 'رقم المعاملة';
            }
        } else {
            detailsGroup.style.display = 'none';
            detailsInput.required = false;
        }

        // Show image field ONLY for: شيك and انستاباي
        if (['شيك', 'انستاباي'].includes(method)) {
            imageGroup.style.display = 'block';
        } else {
            imageGroup.style.display = 'none';
        }
    });

    // Adjustment method change handler - REMOVED
    // Adjustments should not have payment methods, only amount and reason

    // Setup form protection for payment and adjustment forms
    // This will handle submissions and prevent double-clicks
    if (typeof setupFormProtection === 'function') {
        const crusherId = getCrusherIdFromURL();
        setupFormProtection({
            entityId: crusherId,
            entityType: 'crusher',
            addPaymentFn: addPayment,
            updatePaymentFn: updatePayment,
            addAdjustmentFn: addAdjustment,
            updateAdjustmentFn: updateAdjustment,
            reloadFn: loadCrusherDetails
        });
    }

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

// Clear filters functions
window.clearPaymentsFilters = function() {
    document.getElementById('paymentsSearch').value = '';
    document.getElementById('paymentsDateFrom').value = '';
    document.getElementById('paymentsDateTo').value = '';
    document.getElementById('paymentsSort').value = 'date-desc';
    filterPayments();
};

window.clearAdjustmentsFilters = function() {
    document.getElementById('adjustmentsSearch').value = '';
    document.getElementById('adjustmentsDateFrom').value = '';
    document.getElementById('adjustmentsDateTo').value = '';
    document.getElementById('adjustmentsSort').value = 'date-desc';
    filterAdjustments();
};

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



async function openEditCrusherModal() {
    console.log('=== openEditCrusherModal START ===');
    console.log('crusherData:', crusherData);

    if (!crusherData || !crusherData.crusher) {
        console.error('No crusher data available');
        showAlert('لا توجد بيانات كسارة للتعديل');
        return;
    }

    const crusher = crusherData.crusher;
    console.log('Crusher:', crusher);

    // Fill form with current data
    document.getElementById('editCrusherName').value = crusher.name || '';
    
    // Load projects first
    console.log('Loading projects...');
    await loadEditProjects();
    console.log('Projects loaded, count:', editProjectsList.length);
    
    // Load opening balances
    console.log('Loading opening balances...');
    await loadEditCrusherOpeningBalances();
    console.log('Opening balances loaded');

    console.log('About to show modal...');
    const modal = document.getElementById('editCrusherModal');
    console.log('Modal element:', modal);
    console.log('Modal classes before:', modal ? modal.className : 'NULL');
    
    // Show modal directly
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('active');
        modal.style.display = 'flex';
        console.log('Modal classes after:', modal.className);
        console.log('Modal style.display:', modal.style.display);
    }
    
    console.log('=== openEditCrusherModal END ===');
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
            showAlert('لم يتم العثور على الدفعة');
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
        if (payment.payment_image_url) {
            detailsHTML += `
                <div class="detail-row">
                    <strong>الصورة:</strong>
                    <div>
                        <button class="btn btn-sm btn-secondary" onclick="showImageModal('${payment.payment_image_url}')" style="margin-top: 5px;">
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
        showAlert('حدث خطأ في عرض تفاصيل الدفعة');
    }
}

// View adjustment details
async function showAdjustmentDetails(adjustmentId) {
    try {
        // Find adjustment in current data
        const adjustment = allAdjustments.find(a => a.id === adjustmentId);
        if (!adjustment) {
            showAlert('لم يتم العثور على التسوية');
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
        showAlert('حدث خطأ في عرض تفاصيل التسوية');
    }
}

function setupEditCrusherHandlers() {
    console.log('Setting up edit crusher handlers...');
    // Note: Edit crusher button event listener is now at the bottom of the file
    // to support async/await and loading states
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
    
    // Add event listener for date range toggle
    document.getElementById('useCustomDateRange').addEventListener('change', toggleDateRange);
});

// Make closeModal available globally for onclick handlers
window.closeModal = closeModal;

// Toggle date range inputs
window.toggleDateRange = function () {
    const checkbox = document.getElementById('useCustomDateRange');
    const dateInputs = document.getElementById('dateRangeInputs');

    if (checkbox && dateInputs) {
        if (checkbox.checked) {
            dateInputs.style.display = 'flex';
            const today = new Date().toISOString().split('T')[0];
            const firstOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
            const fromDate = document.getElementById('statementFromDate');
            const toDate = document.getElementById('statementToDate');
            if (fromDate) fromDate.value = firstOfYear;
            if (toDate) toDate.value = today;
        } else {
            dateInputs.style.display = 'none';
        }
    }
};

// Image modal functions
window.showImageModal = function (imageData) {
    const modalImage = document.getElementById('modalImage');

    console.log('Showing image modal with data:', imageData ? imageData.substring(0, 50) + '...' : 'null');

    // Check if imageData is valid
    if (!imageData || imageData === 'null' || imageData === 'undefined' || imageData.trim() === '') {
        showAlert('لا توجد صورة لعرضها');
        return;
    }

    // Clear any previous error handlers
    modalImage.onerror = null;
    modalImage.onload = null;

    // Add error handler for the image
    modalImage.onerror = function () {
        console.error('Failed to load image:', imageData.substring(0, 100));
        showAlert('فشل في تحميل الصورة');
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
        showAlert('لم يتم العثور على الدفعة');
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

window.deletePayment = async function (paymentId) {
    console.log('deletePayment called with ID:', paymentId);
    
    const confirmed = await showConfirmDialog(
        'تأكيد الحذف',
        'هل أنت متأكد من حذف هذه الدفعة؟',
        'نعم، احذف',
        'إلغاء'
    );
    
    if (!confirmed) {
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
            showAlert('تم حذف الدفعة بنجاح');
            loadCrusherDetails();
        })
        .catch(error => {
            console.error('Error deleting payment:', error);
            showAlert('خطأ في حذف الدفعة: ' + error.message);
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
        showAlert('لم يتم العثور على التسوية');
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

window.deleteAdjustment = async function (adjustmentId) {
    console.log('deleteAdjustment called with ID:', adjustmentId);
    
    const confirmed = await showConfirmDialog(
        'تأكيد الحذف',
        'هل أنت متأكد من حذف هذه التسوية؟',
        'نعم، احذف',
        'إلغاء'
    );
    
    if (!confirmed) {
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
            showAlert('تم حذف التسوية بنجاح');
            loadCrusherDetails();
        })
        .catch(error => {
            console.error('Error deleting adjustment:', error);
            showAlert('خطأ في حذف التسوية: ' + error.message);
        });
};
// CRUD functions for deliveries
window.editDelivery = async function (deliveryId) {
    console.log('editDelivery called with ID:', deliveryId);

    try {
        // Find delivery in current data
        const delivery = allDeliveries.find(d => d.id === deliveryId);
        if (!delivery) {
            showAlert('لم يتم العثور على التسليم');
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
        showAlert('حدث خطأ في تحميل بيانات التسليم');
    }
};

window.deleteDelivery = async function (deliveryId) {
    console.log('deleteDelivery called with ID:', deliveryId);
    
    const confirmed = await showConfirmDialog(
        'تأكيد الحذف',
        'هل أنت متأكد من حذف هذه التسليمة؟ تحذير: هذا سيؤثر على الحسابات المحاسبية.',
        'نعم، احذف',
        'إلغاء'
    );
    
    if (!confirmed) {
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
            showAlert('تم حذف التسليمة بنجاح');
            loadCrusherDetails();
        })
        .catch(error => {
            console.error('Error deleting delivery:', error);
            showAlert('خطأ في حذف التسليمة: ' + error.message);
        });
};
// Report Functions
window.generateDeliveriesReport = async function () {
    const crusherId = getCrusherIdFromURL();
    const fromDate = document.getElementById('deliveriesFromDate').value;
    const toDate = document.getElementById('deliveriesToDate').value;

    if (!fromDate || !toDate) {
        showAlert('يرجى تحديد فترة زمنية للتقرير');
        return;
    }

    try {
        const url = `${API_BASE}/crushers/${crusherId}/reports/deliveries?from=${fromDate}&to=${toDate}`;
        window.open(url, '_blank');
    } catch (error) {
        console.error('Error generating deliveries report:', error);
        showAlert('حدث خطأ في إنشاء التقرير');
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
            showAlert('يرجى تحديد فترة زمنية لكشف الحساب');
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
        showAlert('حدث خطأ في إنشاء كشف الحساب');
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
    
    // Projects should already be loaded by loadEditProjects()
    // Add existing opening balances
    crusherData.opening_balances.forEach(ob => {
        addEditCrusherOpeningBalanceRow(ob);
    });
}

// (Removed duplicate loadEditProjectsList - using loadEditProjects instead)

function addEditCrusherOpeningBalanceRow(existingData = null) {
    const container = document.getElementById('editCrusherOpeningBalancesContainer');
    const rowId = editCrusherOpeningBalanceCounter++;
    
    const row = document.createElement('div');
    row.className = 'opening-balance-row';
    row.style.cssText = 'display: grid; grid-template-columns: 2fr 1fr 2fr auto; gap: 12px; margin-bottom: 12px; align-items: start; padding: 16px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;';
    row.dataset.rowId = rowId;
    if (existingData && existingData.id) {
        row.dataset.balanceId = existingData.id;
    }
    
    // Project column
    const projectCol = document.createElement('div');
    const projectLabel = document.createElement('label');
    projectLabel.style.cssText = 'display: block; margin-bottom: 6px; font-size: 0.875rem; font-weight: 600; color: #334155; text-align: right;';
    projectLabel.textContent = 'في حساب (المشروع/العميل)';
    const projectSelect = document.createElement('select');
    projectSelect.className = 'form-input';
    projectSelect.classList.add('crusher-opening-balance-project');
    projectSelect.style.cssText = 'width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.875rem; background: white;';
    projectSelect.required = true;
    projectSelect.innerHTML = '<option value="">اختر المشروع/العميل</option>';
    
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
    amountLabel.style.cssText = 'display: block; margin-bottom: 6px; font-size: 0.875rem; font-weight: 600; color: #334155; text-align: right;';
    amountLabel.textContent = 'المبلغ';
    const amountInput = document.createElement('input');
    amountInput.type = 'number';
    amountInput.className = 'form-input';
    amountInput.classList.add('crusher-opening-balance-amount');
    amountInput.style.cssText = 'width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.875rem;';
    amountInput.placeholder = '0';
    amountInput.step = '0.01';
    amountInput.required = true;
    if (existingData) {
        amountInput.value = existingData.amount || 0;
    }
    
    // Add help text
    const amountHelp = document.createElement('small');
    amountHelp.style.cssText = 'display: block; margin-top: 6px; font-size: 0.75rem; color: #64748b; text-align: right;';
    amountHelp.textContent = 'موجب = نحن مدينون لهم | سالب = هم مدينون لنا';
    
    // Add event listener to show/hide project field based on amount
    amountInput.addEventListener('input', () => {
        const amount = parseFloat(amountInput.value) || 0;
        if (amount > 0) {
            // Positive: we owe them, must select project
            projectCol.style.display = 'block';
            projectSelect.required = true;
            amountHelp.style.color = '#dc2626';
            amountHelp.textContent = '⚠️ يجب تحديد المشروع/العميل للرصيد الموجب';
        } else if (amount < 0) {
            // Negative: they owe us, no project needed
            projectCol.style.display = 'none';
            projectSelect.required = false;
            projectSelect.value = '';  // Clear selection
            amountHelp.style.color = '#16a34a';
            amountHelp.textContent = '✓ رصيد سالب (هم مدينون لنا) - لا يحتاج مشروع';
        } else {
            projectCol.style.display = 'none';
            projectSelect.required = false;
            projectSelect.value = '';
            amountHelp.style.color = '#64748b';
            amountHelp.textContent = 'موجب = نحن مدينون لهم | سالب = هم مدينون لنا';
        }
    });
    
    // Initial state based on existing amount
    const initialAmount = parseFloat(amountInput.value) || 0;
    if (initialAmount > 0) {
        amountHelp.style.color = '#dc2626';
        amountHelp.textContent = '⚠️ يجب تحديد المشروع/العميل للرصيد الموجب';
    } else if (initialAmount < 0) {
        projectCol.style.display = 'none';
        projectSelect.required = false;
        amountHelp.style.color = '#16a34a';
        amountHelp.textContent = '✓ رصيد سالب (هم مدينون لنا) - لا يحتاج مشروع';
    } else {
        projectCol.style.display = 'none';
        projectSelect.required = false;
    }
    
    amountCol.appendChild(amountLabel);
    amountCol.appendChild(amountInput);
    amountCol.appendChild(amountHelp);
    
    // Description column
    const descCol = document.createElement('div');
    const descLabel = document.createElement('label');
    descLabel.style.cssText = 'display: block; margin-bottom: 6px; font-size: 0.875rem; font-weight: 600; color: #334155; text-align: right;';
    descLabel.textContent = 'الوصف';
    const descInput = document.createElement('input');
    descInput.type = 'text';
    descInput.className = 'form-input';
    descInput.classList.add('crusher-opening-balance-description');
    descInput.style.cssText = 'width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.875rem;';
    descInput.placeholder = 'وصف اختياري';
    descInput.maxLength = 500;
    if (existingData && existingData.description) {
        descInput.value = existingData.description;
    }
    descCol.appendChild(descLabel);
    descCol.appendChild(descInput);
    
    // Delete button column
    const deleteCol = document.createElement('div');
    deleteCol.style.cssText = 'padding-top: 28px; display: flex; align-items: center;';
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.style.cssText = 'padding: 10px 14px; background: #fee2e2; color: #dc2626; border: none; border-radius: 8px; cursor: pointer; transition: all 0.2s; font-size: 0.875rem;';
    deleteBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px;">delete</span>';
    deleteBtn.onmouseover = () => deleteBtn.style.background = '#fecaca';
    deleteBtn.onmouseout = () => deleteBtn.style.background = '#fee2e2';
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
document.getElementById('addEditCrusherOpeningBalanceBtn')?.addEventListener('click', async () => {
    // Make sure projects are loaded before adding a new row
    if (editProjectsList.length === 0) {
        console.log('Projects not loaded, loading now...');
        await loadEditProjects();
    }
    addEditCrusherOpeningBalanceRow();
});

// Update edit crusher button to load opening balances
document.getElementById('editCrusherBtn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const originalHTML = btn.innerHTML;
    
    try {
        // Show loading state
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحميل...';
        
        await openEditCrusherModal();
    } catch (error) {
        console.error('Error opening edit modal:', error);
        showAlert('حدث خطأ في تحميل البيانات');
    } finally {
        // Restore button state
        btn.disabled = false;
        btn.innerHTML = originalHTML;
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