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

/**
 * صيغة العملة بالجنيه المصري
 * @param {number} amount
 * @returns {string}
 */
function formatCurrency(amount) {
    return Number(amount || 0).toLocaleString('ar-EG', {
        style: 'currency',
        currency: 'EGP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

/**
 * تحديث قيمة كارد بناءً على data-card أو id.
 * @param {string} key - المفتاح الدلالي
 * @param {string|number} value - القيمة النهائية للنص
 */
function updateCardValue(key, value) {
    const selector = `[data-card="${key}"] .card-value, #${key} .card-value, .dashboard-card.${key} .card-value`;
    const cardValueEl = document.querySelector(selector);

    if (cardValueEl) {
        cardValueEl.textContent = value;
    }
}

/**
 * تحميل البيانات من API
 */
async function loadMetrics() {
    const resp = await authManager.makeAuthenticatedRequest(`${API_BASE}/metrics`);
    if (!resp.ok) {
        throw new Error('تعذر تحميل إحصائيات اللوحة');
    }
    return resp.json();
}

/**
 * تحديث جميع البيانات في اللوحة
 */
async function updateDashboard() {
    try {
        console.log('Updating dashboard data...');
        
        // Clear all existing values first to prevent old data retention
        const allCards = ["sales", "profit", "customers", "clients", "quarries", "crushers", "contractors", "deliveries", "expenses", "crusher-costs", "contractor-costs", "operating-expenses"];
        allCards.forEach(card => updateCardValue(card, "..."));
        
        const stats = await loadMetrics();
        
        // تحديث الكروت الأساسية
        updateCardValue("sales", formatCurrency(stats.totalSales || 0));
        updateCardValue("profit", formatCurrency(stats.netProfit || 0));
        updateCardValue("customers", stats.totalClients || 0);
        updateCardValue("clients", stats.totalClients || 0);
        updateCardValue("quarries", stats.totalCrushers || 0);
        updateCardValue("crushers", stats.totalCrushers || 0);
        updateCardValue("contractors", stats.totalContractors || 0);
        updateCardValue("deliveries", stats.totalDeliveries || 0);
        
        // تحديث البيانات المالية المفصلة
        updateCardValue("expenses", formatCurrency(stats.totalExpenses || 0));
        updateCardValue("crusher-costs", formatCurrency(stats.totalCrusherCosts || 0));
        updateCardValue("contractor-costs", formatCurrency(stats.totalContractorCosts || 0));
        updateCardValue("operating-expenses", formatCurrency(stats.operatingExpenses || 0));
        
        // تحديث إجمالي المدفوعات النقدية
        updateCardValue("cash-payments", formatCurrency(stats.totalCashPayments || 0));
        
        // تحديث وقت آخر تحديث
        const lastUpdateEl = document.getElementById('lastUpdate');
        if (lastUpdateEl) {
            const now = new Date().toLocaleString('ar-EG');
            lastUpdateEl.textContent = `آخر تحديث: ${now}`;
            lastUpdateEl.style.color = 'var(--gray-500)';
        }
        
        console.log('Dashboard updated successfully');
    } catch (err) {
        console.error('Error updating dashboard:', err);
        
        // عرض رسالة خطأ
        const errorCards = ["sales", "profit", "customers", "clients"];
        errorCards.forEach(card => updateCardValue(card, "—"));
        
        // إظهار رسالة خطأ للمستخدم
        const lastUpdateEl = document.getElementById('lastUpdate');
        if (lastUpdateEl) {
            lastUpdateEl.textContent = 'خطأ في تحميل البيانات';
            lastUpdateEl.style.color = 'red';
        }
    }
}

// تحديث تلقائي كل 30 ثانية
let autoRefreshInterval;

function startAutoRefresh() {
    // إيقاف التحديث التلقائي السابق إن وجد
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    // بدء التحديث التلقائي
    autoRefreshInterval = setInterval(updateDashboard, 30000); // كل 30 ثانية
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// تحميل البيانات عند تحميل الصفحة
document.addEventListener("DOMContentLoaded", function () {
    // Check authentication first
    if (!authManager.checkAuth()) {
        return;
    }

    // تحميل البيانات فوراً
    updateDashboard();
    
    // بدء التحديث التلقائي
    startAutoRefresh();
    
    // إضافة زر التحديث اليدوي
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', updateDashboard);
    }
});

// إيقاف التحديث التلقائي عند مغادرة الصفحة
window.addEventListener('beforeunload', stopAutoRefresh);
