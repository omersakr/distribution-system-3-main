// Utilities are loaded via separate script tags - no need to redefine common functions

// State
let projectsData = [];
let currentPage = 1;
let currentSearch = '';
let totalPages = 1;

// Create project card (based on client data)
function createProjectCard(client) {
    const card = document.createElement('div');
    card.className = 'client-card';

    // Header with client name and actions
    const header = document.createElement('div');
    header.className = 'client-header';

    const name = document.createElement('h3');
    name.className = 'client-name';
    name.textContent = `مشروع: ${client.name}`;

    const actions = document.createElement('div');
    actions.className = 'client-actions';

    const detailsBtn = document.createElement('button');
    detailsBtn.className = 'btn btn-sm btn-primary';
    detailsBtn.innerHTML = '<i class="fas fa-chart-line"></i> التفاصيل المالية';
    detailsBtn.onclick = () => window.location.href = `project-details.html?client_id=${client.id}`;

    actions.appendChild(detailsBtn);
    header.appendChild(name);
    header.appendChild(actions);
    card.appendChild(header);

    // Client info section
    if (client.phone) {
        const contactSection = document.createElement('div');
        contactSection.className = 'client-contact';

        const phoneItem = document.createElement('div');
        phoneItem.className = 'contact-item';
        phoneItem.innerHTML = `<span class="contact-icon">📱</span> ${client.phone}`;

        contactSection.appendChild(phoneItem);
        card.appendChild(contactSection);
    }

    // Financial summary section
    const financialSection = document.createElement('div');
    financialSection.className = 'client-financial';

    // Client balance (from deliveries and payments)
    const balanceItem = document.createElement('div');
    balanceItem.className = 'financial-item';

    const balanceLabel = document.createElement('span');
    balanceLabel.className = 'financial-label';
    balanceLabel.textContent = 'رصيد العميل:';

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

    // Project financial stats
    const stats = document.createElement('div');
    stats.className = 'client-stats';

    const statsItems = [
        { label: 'إجمالي التسليمات', value: formatCurrency(client.totalDeliveries || 0) },
        { label: 'إجمالي المدفوعات', value: formatCurrency(client.totalPayments || 0) },
        { label: 'المصروفات المرتبطة', value: formatCurrency(client.totalExpenses || 0) },
        { label: 'الحقن الرأسمالية', value: formatCurrency(client.totalCapitalInjections || 0) }
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

// Render projects grid (based on clients)
function renderProjects(clients) {
    const container = document.getElementById('projectsContainer');
    if (!container) return;

    container.innerHTML = '';

    if (!clients || clients.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fas fa-chart-line"></i></div>
                <div class="empty-text">لا توجد مشاريع (عملاء) مسجلة</div>
                <p>المشاريع تُنشأ تلقائياً عند إضافة عملاء جدد</p>
                <button class="btn btn-primary" onclick="window.location.href='clients.html'">
                    إدارة العملاء
                </button>
            </div>
        `;
        return;
    }

    clients.forEach(client => {
        container.appendChild(createProjectCard(client));
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
        prevBtn.addEventListener('click', () => loadProjects(pagination.page - 1));
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
        nextBtn.addEventListener('click', () => loadProjects(pagination.page + 1));
        nav.appendChild(nextBtn);
    }

    container.appendChild(nav);
}

// API functions - Load clients as projects
async function loadProjects(page = 1) {
    showInlineLoader('projectsContainer', 'جاري تحميل المشاريع...');
    try {
        const params = new URLSearchParams();
        params.set('page', page);
        params.set('limit', 25);
        if (currentSearch) {
            params.set('search', currentSearch);
        }

        const result = await apiGet(`/clients?${params}`);
        projectsData = result.clients || result.data || [];

        renderProjects(projectsData);
        if (result.pagination) {
            renderPagination(result.pagination);
            currentPage = result.pagination.page;
            totalPages = result.pagination.pages;
        }
    } catch (error) {
        console.error('Error loading projects:', error);
        const container = document.getElementById('projectsContainer');
        container.innerHTML = `
            <div class="error-state">
                <div class="error-icon"><i class="fas fa-times-circle"></i></div>
                <div class="error-text">خطأ في تحميل بيانات المشاريع</div>
                <div class="error-details">${error.message}</div>
                <button class="btn btn-primary" onclick="loadProjects()">إعادة المحاولة</button>
            </div>
        `;
    }
}

// Event handlers
function setupEventHandlers() {
    // Search functionality
    const searchInput = document.getElementById('projectSearch');
    const searchBtn = document.getElementById('searchBtn');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    let searchTimeout;

    function performSearch() {
        if (searchInput) {
            currentSearch = searchInput.value.trim();
            currentPage = 1; // Reset to first page when searching
            loadProjects(currentPage);
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
            loadProjects(currentPage);
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
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication first
    if (authManager.checkAuth()) {
        setupEventHandlers();
        loadProjects();
    }
});
