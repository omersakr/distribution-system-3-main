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
 * Creates a single administration card DOM node using unified CSS classes
 * @param {object} admin - object (id, name, balance, ...future fields)
 * @returns {HTMLElement}
 */
function createAdministrationCard(admin) {
    const card = document.createElement('div');
    card.className = 'contractor-card';

    // Header with name and actions
    const header = document.createElement('div');
    header.className = 'contractor-header';

    const name = document.createElement('h3');
    name.className = 'contractor-name';
    name.textContent = admin.name || "—";

    const actions = document.createElement('div');
    actions.className = 'contractor-actions';

    const detailsBtn = document.createElement('button');
    detailsBtn.className = 'btn btn-sm btn-primary';
    detailsBtn.innerHTML = '<i class="fas fa-chart-line"></i> التفاصيل';
    detailsBtn.onclick = () => window.location.href = `administration-details.html?id=${admin.id}`;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-sm btn-danger';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i> حذف';
    deleteBtn.onclick = () => deleteAdministration(admin.id, admin.name);

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
    const balance = admin.balance || 0;
    balanceValue.textContent = formatCurrency(Math.abs(balance));

    if (balance > 0) {
        balanceValue.classList.add('negative');
        balanceItem.appendChild(balanceLabel);
        balanceItem.appendChild(document.createTextNode(' '));
        balanceItem.appendChild(balanceValue);
        balanceItem.appendChild(document.createTextNode(' (مستحق للإدارة)'));
    } else if (balance < 0) {
        balanceValue.classList.add('positive');
        balanceItem.appendChild(balanceLabel);
        balanceItem.appendChild(document.createTextNode(' '));
        balanceItem.appendChild(balanceValue);
        balanceItem.appendChild(document.createTextNode(' (مستحق من الإدارة)'));
    } else {
        balanceValue.classList.add('text-muted');
        balanceItem.appendChild(balanceLabel);
        balanceItem.appendChild(document.createTextNode(' '));
        balanceItem.appendChild(balanceValue);
        balanceItem.appendChild(document.createTextNode(' (متوازن)'));
    }

    financialSection.appendChild(balanceItem);
    card.appendChild(financialSection);

    // Stats section
    const stats = document.createElement('div');
    stats.className = 'contractor-stats';

    const statsItems = [
        { label: 'النوع', value: admin.type === 'Partner' ? 'شريك' : 'ممول' },
        { label: 'إجمالي ضخ رأس المال', value: formatCurrency(admin.total_capital_injected || 0) }
    ];

    statsItems.forEach(stat => {
        const statItem = document.createElement('div');
        statItem.className = 'stat-item';

        const statLabel = document.createElement('span');
        statLabel.className = 'stat-label';
        statLabel.textContent = stat.label + ':';

        const statValue = document.createElement('span');
        statValue.className = 'stat-value';
        statValue.textContent = stat.value;

        statItem.appendChild(statLabel);
        statItem.appendChild(statValue);
        stats.appendChild(statItem);
    });

    card.appendChild(stats);
    return card;
}

function renderAdministration(administration) {
    const container = document.getElementById('administrationContainer');
    if (!container) return;

    container.innerHTML = '';

    if (!administration || administration.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fas fa-clipboard"></i></div>
                <div class="empty-text">لا توجد شركاء أو ممولين مسجلين</div>
                <button class="btn btn-primary" onclick="document.getElementById('addAdministrationBtn').click()">
                    إضافة شريك/ممول جديد
                </button>
            </div>
        `;
        return;
    }

    administration.forEach(admin => {
        container.appendChild(createAdministrationCard(admin));
    });
}

async function fetchAdministration() {
    const resp = await authManager.makeAuthenticatedRequest(`${API_BASE}/administration`);
    if (!resp.ok) throw new Error('تعذر تحميل الإدارة');
    const data = await resp.json();
    return data.administration || data;
}

// Delete administration function
async function deleteAdministration(adminId, adminName) {
    try {
        const result = await Swal.fire({
            title: 'تأكيد الحذف',
            text: `هل أنت متأكد من حذف "${adminName}"؟`,
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

        const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/administration/${adminId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'فشل في حذف الشريك/الممول');
        }

        await Swal.fire({
            title: 'تم الحذف بنجاح',
            text: data.message,
            icon: 'success',
            confirmButtonText: 'موافق'
        });

        location.reload();

    } catch (error) {
        console.error('Delete administration error:', error);

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
        showInlineLoader('administrationContainer', 'جاري تحميل بيانات الإدارة...');
        fetchAdministration()
            .then(renderAdministration)
            .catch(err => {
                console.error(err);
                const container = document.getElementById('administrationContainer');
                if (container) {
                    container.innerHTML = `
                        <div class="error-state">
                            <div class="error-icon"><i class="fas fa-times-circle"></i></div>
                            <div class="error-text">خطأ في تحميل بيانات الإدارة</div>
                            <div class="error-details">${err.message}</div>
                            <button class="btn btn-primary" onclick="location.reload()">إعادة المحاولة</button>
                        </div>
                    `;
                }
            });
    }
});

// Make functions available globally
window.deleteAdministration = deleteAdministration;