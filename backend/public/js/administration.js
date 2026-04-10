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
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }) + ' ج.م';
}

/**
 * Creates a single administration card DOM node
 * @param {object} admin - object (id, name, balance, ...future fields)
 * @returns {HTMLElement}
 */
function createAdministrationCard(admin) {
    const card = document.createElement('div');
    card.className = 'administration-card';

    // Header with name and actions
    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid #f8fafc;';

    const name = document.createElement('h3');
    name.style.cssText = 'font-size: 1.125rem; font-weight: 700; color: var(--on-surface); margin: 0; flex: 1;';
    name.textContent = admin.name || "—";

    const actions = document.createElement('div');
    actions.className = 'administration-actions';

    const detailsBtn = document.createElement('button');
    detailsBtn.className = 'action-btn-modern view';
    detailsBtn.innerHTML = '<i class="fas fa-chart-line"></i> التفاصيل';
    detailsBtn.title = 'عرض التفاصيل';
    detailsBtn.onclick = (e) => {
        e.stopPropagation();
        window.location.href = `administration-details.html?id=${admin.id}`;
    };

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'action-btn-modern danger';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.title = 'حذف';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deleteAdministration(admin.id, admin.name);
    };

    actions.appendChild(detailsBtn);
    actions.appendChild(deleteBtn);
    header.appendChild(name);
    header.appendChild(actions);
    card.appendChild(header);

    // Balance section
    const balance = admin.balance || 0;
    const balanceSection = document.createElement('div');
    balanceSection.style.cssText = 'background: #f8fafc; border-radius: 0.75rem; padding: 1rem; margin-bottom: 1rem;';

    const balanceItem = document.createElement('div');
    balanceItem.style.cssText = 'text-align: right;';

    const balanceLabel = document.createElement('p');
    balanceLabel.style.cssText = 'font-size: 0.875rem; color: var(--on-surface-variant); margin-bottom: 0.5rem; font-weight: 600;';
    balanceLabel.textContent = 'الرصيد الحالي:';

    const balanceValue = document.createElement('p');
    balanceValue.style.cssText = 'font-size: 1.5rem; font-weight: 700; margin: 0;';
    balanceValue.textContent = formatCurrency(Math.abs(balance));

    if (balance > 0) {
        balanceValue.style.color = '#7f1d1d'; // red-900
        const label = document.createElement('p');
        label.style.cssText = 'font-size: 0.75rem; color: var(--on-surface-variant); margin-top: 0.25rem;';
        label.textContent = '(مستحق للإدارة)';
        balanceItem.appendChild(balanceLabel);
        balanceItem.appendChild(balanceValue);
        balanceItem.appendChild(label);
    } else if (balance < 0) {
        balanceValue.style.color = '#14532d'; // green-900
        const label = document.createElement('p');
        label.style.cssText = 'font-size: 0.75rem; color: var(--on-surface-variant); margin-top: 0.25rem;';
        label.textContent = '(مستحق من الإدارة)';
        balanceItem.appendChild(balanceLabel);
        balanceItem.appendChild(balanceValue);
        balanceItem.appendChild(label);
    } else {
        balanceValue.style.color = 'var(--on-surface-variant)';
        const label = document.createElement('p');
        label.style.cssText = 'font-size: 0.75rem; color: var(--on-surface-variant); margin-top: 0.25rem;';
        label.textContent = '(متوازن)';
        balanceItem.appendChild(balanceLabel);
        balanceItem.appendChild(balanceValue);
        balanceItem.appendChild(label);
    }

    balanceSection.appendChild(balanceItem);
    card.appendChild(balanceSection);

    // Stats section
    const stats = document.createElement('div');
    stats.style.cssText = 'display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem;';

    const statsItems = [
        { label: 'النوع', value: admin.type === 'Partner' ? 'شريك' : 'ممول' },
        { label: 'إجمالي ضخ رأس المال', value: formatCurrency(admin.total_capital_injected || 0) }
    ];

    statsItems.forEach(stat => {
        const statItem = document.createElement('div');
        statItem.style.cssText = 'background: white; padding: 0.75rem; border-radius: 0.5rem; border: 1px solid #f1f5f9; text-align: center;';

        const statLabel = document.createElement('span');
        statLabel.style.cssText = 'display: block; font-size: 0.75rem; color: var(--on-surface-variant); margin-bottom: 0.25rem; font-weight: 600;';
        statLabel.textContent = stat.label + ':';

        const statValue = document.createElement('span');
        statValue.style.cssText = 'display: block; font-size: 0.9375rem; font-weight: 700; color: var(--on-surface);';
        statValue.textContent = stat.value;

        statItem.appendChild(statLabel);
        statItem.appendChild(statValue);
        stats.appendChild(statItem);
    });

    card.appendChild(stats);

    // Click to view details
    card.onclick = () => window.location.href = `administration-details.html?id=${admin.id}`;

    return card;
}

function renderAdministration(administration) {
    const container = document.getElementById('administrationContainer');
    if (!container) return;

    container.innerHTML = '';

    if (!administration || administration.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fas fa-briefcase"></i></div>
                <div class="empty-text">لا توجد شركاء أو ممولين مسجلين</div>
                <button class="btn-modern btn-primary-modern" onclick="document.getElementById('addAdministrationBtn').click()">
                    <i class="fas fa-plus"></i> إضافة شريك/ممول جديد
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


// Search functionality
let currentAdministrationSearch = '';

function filterAdministration() {
    const searchTerm = currentAdministrationSearch.toLowerCase().trim();
    
    if (!searchTerm) {
        renderAdministration(administrationData);
        return;
    }
    
    const filtered = administrationData.filter(admin => {
        return admin.name && admin.name.toLowerCase().includes(searchTerm);
    });
    
    renderAdministration(filtered);
}

// Setup search event listeners
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('administrationSearch');
    const searchBtn = document.getElementById('searchBtn');
    const clearBtn = document.getElementById('clearSearchBtn');
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentAdministrationSearch = e.target.value;
            filterAdministration();
        });
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                currentAdministrationSearch = e.target.value;
                filterAdministration();
            }
        });
    }
    
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            currentAdministrationSearch = searchInput.value;
            filterAdministration();
        });
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            currentAdministrationSearch = '';
            if (searchInput) searchInput.value = '';
            filterAdministration();
        });
    }
});
