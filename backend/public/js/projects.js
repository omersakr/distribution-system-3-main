// Utilities are loaded via separate script tags - no need to redefine common functions

// State
let projectsData = [];
let currentPage = 1;
let currentSearch = '';
let totalPages = 1;

// Render stats bar
function renderStatsBar(clients) {
    // Stats bar removed - no longer needed
}

// Create project card with modern design
function createProjectCard(client) {
    const card = document.createElement('div');
    card.className = 'client-card'; // Using same class as clients

    // Header with name and actions
    const header = document.createElement('div');
    header.className = 'client-header';

    const name = document.createElement('h3');
    name.className = 'client-name';
    name.textContent = client.name || '—';

    const actions = document.createElement('div');
    actions.className = 'client-actions';

    const detailsBtn = document.createElement('button');
    detailsBtn.className = 'action-btn-modern view';
    detailsBtn.innerHTML = '<i class="fas fa-chart-line"></i> التفاصيل';
    detailsBtn.title = 'عرض التفاصيل';
    detailsBtn.onclick = () => window.location.href = `project-details.html?client_id=${client.id}`;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'action-btn-modern danger';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.title = 'حذف';
    deleteBtn.onclick = () => {
        // Delete functionality would go here
    };

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

// Render projects grid
function renderProjects(clients) {
    const container = document.getElementById('projectsContainer');
    if (!container) return;

    container.innerHTML = '';

    if (!clients || clients.length === 0) {
        container.innerHTML = `
            <div class="col-span-full bg-surface-container-lowest p-16 rounded-xl border-2 border-dashed border-outline-variant/30 text-center">
                <div class="flex flex-col items-center">
                    <span class="material-symbols-outlined text-6xl text-outline-variant opacity-30 mb-4">business</span>
                    <h3 class="text-xl font-bold text-on-surface mb-2 font-arabic">لا توجد مشاريع (عملاء) مسجلة</h3>
                    <p class="text-on-surface-variant mb-6 font-arabic">المشاريع تُنشأ تلقائياً عند إضافة عملاء جدد</p>
                    <button onclick="window.location.href='clients.html'" class="bg-primary text-white px-6 py-3 rounded-xl font-arabic font-bold hover:opacity-90 transition-opacity flex items-center gap-2">
                        <span class="material-symbols-outlined">group_add</span>
                        إدارة العملاء
                    </button>
                </div>
            </div>
        `;
        return;
    }

    clients.forEach(client => {
        container.appendChild(createProjectCard(client));
    });
}

// Render pagination with new design
function renderPagination(pagination) {
    const container = document.getElementById('paginationContainer');
    if (!container || !pagination) return;

    container.innerHTML = '';

    if (pagination.pages <= 1) return;

    const nav = document.createElement('div');
    nav.className = 'flex items-center gap-2';

    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'w-10 h-10 rounded-lg border border-outline-variant/20 flex items-center justify-center text-slate-400 hover:bg-emerald-50 hover:text-emerald-700 transition-colors';
    prevBtn.innerHTML = '<span class="material-symbols-outlined">chevron_right</span>';
    prevBtn.disabled = pagination.page === 1;
    if (pagination.page > 1) {
        prevBtn.addEventListener('click', () => loadProjects(pagination.page - 1));
    } else {
        prevBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }
    nav.appendChild(prevBtn);

    // Page numbers
    const maxPagesToShow = 5;
    let startPage = Math.max(1, pagination.page - 2);
    let endPage = Math.min(pagination.pages, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        if (i === pagination.page) {
            pageBtn.className = 'w-10 h-10 rounded-lg bg-tertiary text-white font-bold font-headline';
        } else {
            pageBtn.className = 'w-10 h-10 rounded-lg border border-outline-variant/20 flex items-center justify-center text-slate-600 hover:bg-emerald-50 transition-colors font-headline';
        }
        pageBtn.textContent = i;
        pageBtn.addEventListener('click', () => loadProjects(i));
        nav.appendChild(pageBtn);
    }

    // Show ellipsis and last page if needed
    if (endPage < pagination.pages) {
        if (endPage < pagination.pages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'px-2 text-slate-400';
            ellipsis.textContent = '...';
            nav.appendChild(ellipsis);
        }

        const lastPageBtn = document.createElement('button');
        lastPageBtn.className = 'w-10 h-10 rounded-lg border border-outline-variant/20 flex items-center justify-center text-slate-600 hover:bg-emerald-50 transition-colors font-headline';
        lastPageBtn.textContent = pagination.pages;
        lastPageBtn.addEventListener('click', () => loadProjects(pagination.pages));
        nav.appendChild(lastPageBtn);
    }

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'w-10 h-10 rounded-lg border border-outline-variant/20 flex items-center justify-center text-slate-400 hover:bg-emerald-50 hover:text-emerald-700 transition-colors';
    nextBtn.innerHTML = '<span class="material-symbols-outlined">chevron_left</span>';
    nextBtn.disabled = pagination.page === pagination.pages;
    if (pagination.page < pagination.pages) {
        nextBtn.addEventListener('click', () => loadProjects(pagination.page + 1));
    } else {
        nextBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }
    nav.appendChild(nextBtn);

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

        renderStatsBar(projectsData);
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
            <div class="col-span-full bg-surface-container-lowest p-16 rounded-xl border border-error/20 text-center">
                <div class="flex flex-col items-center">
                    <span class="material-symbols-outlined text-6xl text-error opacity-50 mb-4">error</span>
                    <h3 class="text-xl font-bold text-error mb-2 font-arabic">خطأ في تحميل بيانات المشاريع</h3>
                    <p class="text-on-surface-variant mb-6 font-arabic">${error.message}</p>
                    <button onclick="loadProjects()" class="bg-primary text-white px-6 py-3 rounded-xl font-arabic font-bold hover:opacity-90 transition-opacity flex items-center gap-2">
                        <span class="material-symbols-outlined">refresh</span>
                        إعادة المحاولة
                    </button>
                </div>
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

    // Search button handler
    if (searchBtn) {
        searchBtn.addEventListener('click', (e) => {
            e.preventDefault();
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
