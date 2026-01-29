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

// --- Helpers ---

function formatCurrency(amount) {
    return Number(amount || 0).toLocaleString('ar-EG', {
        style: 'currency',
        currency: 'EGP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

/**
 * Creates a single contractor card DOM node using unified CSS classes
 * @param {object} contractor - object (id, name, balance, ...future fields)
 * @returns {HTMLElement}
 */
function createContractorCard(contractor) {
    const card = document.createElement('div');
    card.className = 'contractor-card';

    // Header with name and actions
    const header = document.createElement('div');
    header.className = 'contractor-header';

    const name = document.createElement('h3');
    name.className = 'contractor-name';
    name.textContent = contractor.name || "—";

    const actions = document.createElement('div');
    actions.className = 'contractor-actions';

    const detailsBtn = document.createElement('button');
    detailsBtn.className = 'btn btn-sm btn-primary';
    detailsBtn.innerHTML = '📊 التفاصيل';
    detailsBtn.onclick = () => window.location.href = `contractor-details.html?id=${contractor.id}`;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-sm btn-danger';
    deleteBtn.innerHTML = '🗑️ حذف';
    deleteBtn.onclick = () => deleteContractor(contractor.id, contractor.name);

    actions.appendChild(detailsBtn);
    actions.appendChild(deleteBtn);
    header.appendChild(name);
    header.appendChild(actions);
    card.appendChild(header);

    // Financial summary section
    const financialSection = document.createElement('div');
    financialSection.className = 'contractor-financial';

    const balanceItem = document.createElement('div');
    balanceItem.className = 'financial-item';

    const balanceLabel = document.createElement('span');
    balanceLabel.className = 'financial-label';
    balanceLabel.textContent = 'الرصيد الحالي:';

    const balanceValue = document.createElement('span');
    balanceValue.className = 'financial-value contractor-balance';
    const balance = contractor.balance || 0;
    balanceValue.textContent = formatCurrency(Math.abs(balance));

    if (balance > 0) {
        balanceValue.classList.add('positive');
        balanceItem.appendChild(balanceLabel);
        balanceItem.appendChild(document.createTextNode(' '));
        balanceItem.appendChild(balanceValue);
        balanceItem.appendChild(document.createTextNode(' (مستحق للمقاول)'));
    } else if (balance < 0) {
        balanceValue.classList.add('negative');
        balanceItem.appendChild(balanceLabel);
        balanceItem.appendChild(document.createTextNode(' '));
        balanceItem.appendChild(balanceValue);
        balanceItem.appendChild(document.createTextNode(' (مستحق لنا)'));
    } else {
        balanceValue.classList.add('text-muted');
        balanceItem.appendChild(balanceLabel);
        balanceItem.appendChild(document.createTextNode(' '));
        balanceItem.appendChild(balanceValue);
        balanceItem.appendChild(document.createTextNode(' (متوازن)'));
    }

    financialSection.appendChild(balanceItem);
    card.appendChild(financialSection);

    // Stats section - إضافة إجمالي التسليمات والمستحقات
    const stats = document.createElement('div');
    stats.className = 'contractor-stats';

    const statsItems = [
        { label: 'عدد التسليمات', value: contractor.deliveriesCount || 0 },
        { label: 'إجمالي المستحق', value: formatCurrency(contractor.totalTrips || contractor.totalEarnings || 0) }
    ];

    statsItems.forEach(stat => {
        const statItem = document.createElement('div');
        statItem.className = 'stat-item';

        const statLabel = document.createElement('span');
        statLabel.className = 'stat-label';
        statLabel.textContent = stat.label + ':';

        const statValue = document.createElement('span');
        statValue.className = 'stat-value';
        statValue.textContent = typeof stat.value === 'number' ? stat.value : stat.value;

        statItem.appendChild(statLabel);
        statItem.appendChild(statValue);
        stats.appendChild(statItem);
    });

    card.appendChild(stats);
    return card;
}

function renderContractors(contractors) {
    const container = document.getElementById('contractorsContainer');
    if (!container) return;

    container.innerHTML = '';

    if (!contractors || contractors.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">👷</div>
                <div class="empty-text">لا توجد مقاولين مسجلين</div>
                <button class="btn btn-primary" onclick="document.getElementById('addContractorBtn').click()">
                    إضافة مقاول جديد
                </button>
            </div>
        `;
        return;
    }

    contractors.forEach(contractor => {
        container.appendChild(createContractorCard(contractor));
    });
}

async function fetchContractors() {
    const resp = await authManager.makeAuthenticatedRequest(`${API_BASE}/contractors`);
    if (!resp.ok) throw new Error('تعذر تحميل المقاولين');
    const data = await resp.json();
    // Handle both old format (direct array) and new format (object with contractors property)
    return data.contractors || data;
}

// Delete contractor function
async function deleteContractor(contractorId, contractorName) {
    try {
        // Show confirmation dialog
        const result = await Swal.fire({
            title: 'تأكيد الحذف',
            text: `هل أنت متأكد من حذف المقاول "${contractorName}"؟`,
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

        const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/contractors/${contractorId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'فشل في حذف المقاول');
        }

        // Show success message
        await Swal.fire({
            title: 'تم الحذف بنجاح',
            text: data.message,
            icon: 'success',
            confirmButtonText: 'موافق'
        });

        // Reload contractors list
        location.reload();

    } catch (error) {
        console.error('Delete contractor error:', error);

        // Show error message
        Swal.fire({
            title: 'خطأ في الحذف',
            text: error.message,
            icon: 'error',
            confirmButtonText: 'موافق'
        });
    }
}

// --- Initialization on DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', function () {
    // Check authentication first
    if (authManager.checkAuth()) {
        fetchContractors()
            .then(renderContractors)
            .catch(err => {
                console.error(err);
                const container = document.getElementById('contractorsContainer');
                if (container) {
                    container.innerHTML = `
                        <div class="error-state">
                            <div class="error-icon">❌</div>
                            <div class="error-text">خطأ في تحميل بيانات المقاولين</div>
                            <div class="error-details">${err.message}</div>
                            <button class="btn btn-primary" onclick="location.reload()">إعادة المحاولة</button>
                        </div>
                    `;
                }
            });
    }
});

// Make functions available globally
window.deleteContractor = deleteContractor;

