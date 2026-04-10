// Utilities are loaded via utils/index.js - no need to redefine common functions

// State
let clientsData = [];
let currentPage = 1;
let currentSearch = '';
let totalPages = 1;

// Create client card with modern design
function createClientCard(client) {
    const card = document.createElement('div');
    card.className = 'client-card';

    // Header with name and actions
    const header = document.createElement('div');
    header.className = 'client-header';

    const name = document.createElement('h3');
    name.className = 'client-name';
    name.textContent = client.name;

    const actions = document.createElement('div');
    actions.className = 'client-actions';

    const detailsBtn = document.createElement('button');
    detailsBtn.className = 'action-btn-modern view';
    detailsBtn.innerHTML = '<i class="fas fa-chart-line"></i> التفاصيل';
    detailsBtn.title = 'عرض التفاصيل';
    detailsBtn.onclick = () => window.location.href = `clients-details.html?id=${client.id}`;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'action-btn-modern danger';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.title = 'حذف';
    deleteBtn.onclick = () => deleteClient(client.id, client.name);

    actions.appendChild(detailsBtn);
    actions.appendChild(deleteBtn);
    header.appendChild(name);
    header.appendChild(actions);
    card.appendChild(header);

    // Contact info section
    if (client.phone) {
        const contactSection = document.createElement('div');
        contactSection.className = 'client-contact';

        const phoneItem = document.createElement('div');
        phoneItem.className = 'contact-item';
        phoneItem.innerHTML = `<i class="fas fa-solid fa-mobile"></i> ${client.phone}`;

        contactSection.appendChild(phoneItem);
        card.appendChild(contactSection);
    }

    // Financial summary section
    const financialSection = document.createElement('div');
    financialSection.className = 'client-financial';

    const balanceItem = document.createElement('div');
    balanceItem.className = 'financial-item';

    const balanceLabel = document.createElement('span');
    balanceLabel.className = 'financial-label';
    balanceLabel.textContent = 'الرصيد الحالي:';

    const balanceValue = document.createElement('span');
    balanceValue.className = 'financial-value';
    const balance = client.balance || 0;
    balanceValue.textContent = formatCurrency(Math.abs(balance));

    if (balance > 0) {
        balanceValue.classList.add('text-danger');
        balanceItem.appendChild(balanceLabel);
        balanceItem.appendChild(document.createTextNode(' '));
        balanceItem.appendChild(balanceValue);
        balanceItem.appendChild(document.createTextNode(' (مدين لنا)'));
    } else if (balance < 0) {
        balanceValue.classList.add('text-success');
        balanceItem.appendChild(balanceLabel);
        balanceItem.appendChild(document.createTextNode(' '));
        balanceItem.appendChild(balanceValue);
        balanceItem.appendChild(document.createTextNode(' (دائن لدينا)'));
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
    stats.className = 'client-stats';

    const statsItems = [
        { label: 'إجمالي التسليمات', value: formatCurrency(client.totalDeliveries || 0) },
        { label: 'إجمالي المدفوعات', value: formatCurrency(client.totalPayments || 0) }
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

// Render clients grid
function renderClients(clients) {
    const container = document.getElementById('clientsContainer');
    if (!container) return;

    container.innerHTML = '';

    if (!clients || clients.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fas fa-users"></i></div>
                <div class="empty-text">لا توجد عملاء مسجلين</div>
                <button class="btn-modern btn-primary-modern" onclick="showModal('addClientModal')">
                    <i class="fas fa-plus"></i> إضافة عميل جديد
                </button>
            </div>
        `;
        return;
    }

    clients.forEach(client => {
        container.appendChild(createClientCard(client));
    });
}

// Render pagination
function renderPagination(pagination) {
    const container = document.getElementById('paginationContainer');
    if (!container || !pagination) return;

    container.innerHTML = '';

    if (pagination.pages <= 1) return;

    const nav = document.createElement('nav');
    nav.className = 'pagination';

    // Previous button
    if (pagination.page > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.textContent = 'السابق';
        prevBtn.className = 'btn btn-secondary btn-sm';
        prevBtn.addEventListener('click', () => loadClients(pagination.page - 1));
        nav.appendChild(prevBtn);
    }

    // Page info
    const pageInfo = document.createElement('span');
    pageInfo.className = 'pagination-info';
    pageInfo.textContent = `صفحة ${pagination.page} من ${pagination.pages}`;
    nav.appendChild(pageInfo);

    // Next button
    if (pagination.page < pagination.pages) {
        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'التالي';
        nextBtn.className = 'btn btn-secondary btn-sm';
        nextBtn.addEventListener('click', () => loadClients(pagination.page + 1));
        nav.appendChild(nextBtn);
    }

    container.appendChild(nav);
}

// API functions
async function loadClients(page = 1) {
    const container = document.getElementById('clientsContainer');
    showInlineLoader('clientsContainer', 'جاري تحميل العملاء...');

    try {
        const params = new URLSearchParams();
        params.set('page', page);
        params.set('limit', 25);
        if (currentSearch) {
            params.set('search', currentSearch);
        }

        const result = await apiGet(`/clients?${params}`);
        clientsData = result.clients || result.data || [];

        renderClients(clientsData);
        if (result.pagination) {
            renderPagination(result.pagination);
            currentPage = result.pagination.page;
            totalPages = result.pagination.pages;
        }
    } catch (error) {
        console.error('Error loading clients:', error);
        container.innerHTML = `
            <div class="error-state">
                <div class="error-icon"><i class="fas fa-times-circle"></i></div>
                <div class="error-text">خطأ في تحميل بيانات العملاء</div>
                <div class="error-details">${error.message}</div>
                <button class="btn btn-primary" onclick="loadClients()">إعادة المحاولة</button>
            </div>
        `;
    }
}

async function createClient(clientData) {
    return await apiPost('/clients', clientData);
}

// Event handlers
function setupEventHandlers() {
    // Add client button
    document.getElementById('addClientBtn').addEventListener('click', () => {
        showModal('addClientModal');
    });

    // Add client form
    let isSubmittingClient = false;
    const addClientForm = document.getElementById('addClientForm');

    addClientForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Prevent double submission
        if (isSubmittingClient) {
            console.log('Already submitting, please wait...');
            return;
        }

        const formData = new FormData(e.target);
        const clientData = {
            name: formData.get('name'),
            phone: formData.get('phone') || null,
            opening_balance: parseFloat(formData.get('opening_balance')) || 0
        };

        isSubmittingClient = true;
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalButtonText = submitButton ? submitButton.textContent : 'حفظ';

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'جاري الإضافة...';
        }

        try {
            await createClient(clientData);

            // Show success message
            await Swal.fire({
                title: 'تم بنجاح',
                text: 'تم إضافة العميل بنجاح',
                icon: 'success',
                confirmButtonText: 'موافق',
                timer: 2000
            });

            closeModal('addClientModal');
            loadClients(currentPage);
            e.target.reset();

        } catch (error) {
            console.error('Error creating client:', error);

            // Show error message
            await Swal.fire({
                title: 'خطأ',
                text: error.message || 'فشل في إضافة العميل',
                icon: 'error',
                confirmButtonText: 'موافق'
            });
        } finally {
            // Always reset the flag and button state
            isSubmittingClient = false;
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        }
    });

    // Search functionality
    const searchInput = document.getElementById('clientSearch');
    const searchBtn = document.getElementById('searchBtn');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    let searchTimeout;

    function performSearch() {
        if (searchInput) {
            currentSearch = searchInput.value.trim();
            currentPage = 1; // Reset to first page when searching
            loadClients(currentPage);
        }
    }

    // Search button click handler
    if (searchBtn) {
        searchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            performSearch();
        });
    }

    // Clear search button handler
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (searchInput) {
                searchInput.value = '';
            }
            currentSearch = '';
            currentPage = 1;
            loadClients(currentPage);
        });
    }

    // Search input handlers
    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                clearTimeout(searchTimeout);
                performSearch();
            } else {
                // Real-time search with debounce
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    const newSearch = searchInput.value.trim();
                    if (newSearch !== currentSearch) {
                        performSearch();
                    }
                }, 500); // Wait 500ms after user stops typing
            }
        });
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

// Delete client function
async function deleteClient(clientId, clientName) {
    try {
        // Show confirmation dialog
        const result = await Swal.fire({
            title: 'تأكيد الحذف',
            text: `هل أنت متأكد من حذف العميل "${clientName}"؟`,
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

        const data = await apiDelete(`/clients/${clientId}`);

        // Show success message
        await Swal.fire({
            title: 'تم الحذف بنجاح',
            text: data.message,
            icon: 'success',
            confirmButtonText: 'موافق'
        });

        // Reload clients list
        loadClients();

    } catch (error) {
        console.error('Delete client error:', error);

        // Show error message
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
        loadClients();
    }
});

// Make functions available globally
window.deleteClient = deleteClient;

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
});

