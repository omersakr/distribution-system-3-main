// Utilities are loaded via utils/index.js - no need to redefine common functions

// ============================================
// Calculation Utility Functions
// ============================================

/**
 * Calculate Total Revenue from metrics
 * @param {Object} metrics - The metrics object from /metrics API
 * @returns {number} Total revenue (totalSales)
 */
function calculateTotalRevenue(metrics) {
    return metrics.totalSales || 0;
}

/**
 * Calculate Total Costs from metrics
 * @param {Object} metrics - The metrics object from /metrics API
 * @returns {number} Sum of all cost categories
 */
function calculateTotalCosts(metrics) {
    return (metrics.totalCrusherCosts || 0) +
        (metrics.totalSupplierCosts || 0) +
        (metrics.totalContractorCosts || 0) +
        (metrics.totalEmployeeCosts || 0) +
        (metrics.totalAdministrationCosts || 0) +
        (metrics.totalExpenses || 0) +
        (metrics.totalLosses || 0);
}

/**
 * Calculate Net Profit
 * @param {number} revenue - Total revenue
 * @param {number} costs - Total costs
 * @returns {number} Net profit (revenue - costs)
 */
function calculateNetProfit(revenue, costs) {
    return revenue - costs;
}

/**
 * Calculate Money In (cash inflow)
 * @param {Object} metrics - The metrics object from /metrics API
 * @returns {number} Sum of client payments and positive adjustments
 */
function calculateMoneyIn(metrics) {
    return (metrics.totalClientPayments || 0) +
        (metrics.positiveClientAdjustments || 0);
}

/**
 * Calculate Money Out (cash outflow)
 * @param {Object} metrics - The metrics object from /metrics API
 * @returns {number} Sum of all payment categories
 */
function calculateMoneyOut(metrics) {
    return (metrics.totalSupplierPayments || 0) +
        (metrics.totalCrusherPayments || 0) +
        (metrics.totalContractorPayments || 0) +
        (metrics.totalEmployeePayments || 0) +
        (metrics.totalExpenses || 0) +
        (metrics.totalAdministrationCosts || 0);
}

/**
 * Calculate Net Cash Flow
 * @param {number} moneyIn - Total money in
 * @param {number} moneyOut - Total money out
 * @returns {number} Net cash flow (moneyIn - moneyOut)
 */
function calculateNetCashFlow(moneyIn, moneyOut) {
    return moneyIn - moneyOut;
}

/**
 * Calculate Money Owed To Us
 * @param {Array|Object} balances - Array of balance values or object with balance fields
 * @returns {number} Sum of all positive balances
 */
function calculateMoneyOwedToUs(balances) {
    if (Array.isArray(balances)) {
        return balances.filter(b => b > 0).reduce((sum, b) => sum + b, 0);
    }
    // If it's an object with totalClientBalancesPositive field
    return balances.totalClientBalancesPositive || 0;
}

/**
 * Calculate Money We Owe
 * @param {Object} balances - Object containing balance arrays or totals for suppliers, crushers, contractors, employees
 * @returns {number} Sum of all negative balances (absolute values)
 */
function calculateMoneyWeOwe(balances) {
    // If balances has array properties
    if (balances.supplierBalances || balances.crusherBalances ||
        balances.contractorBalances || balances.employeeBalances) {
        const allBalances = [
            ...(balances.supplierBalances || []),
            ...(balances.crusherBalances || []),
            ...(balances.contractorBalances || []),
            ...(balances.employeeBalances || [])
        ];
        return allBalances.filter(b => b < 0).reduce((sum, b) => sum + Math.abs(b), 0);
    }
    // If balances has total fields from metrics API
    return (balances.totalSupplierBalances || 0) +
        (balances.totalCrusherBalances || 0) +
        (balances.totalContractorBalances || 0) +
        (Math.abs(balances.totalEmployeeBalancesNegative || 0));
}

/**
 * Calculate Net Operating Result
 * @param {Object} metrics - The metrics object from /metrics API
 * @returns {number} Total Revenue minus Operational Costs
 */
function calculateNetOperatingResult(metrics) {
    const totalRevenue = metrics.totalSales || 0;
    const operationalCosts = (metrics.totalCrusherCosts || 0) +
        (metrics.totalSupplierCosts || 0) +
        (metrics.totalContractorCosts || 0) +
        (metrics.totalEmployeeCosts || 0);
    return totalRevenue - operationalCosts;
}

/**
 * Calculate Net Profit/Loss (for Final Financial Result Card)
 * @param {number} operatingResult - Net operating result
 * @param {number} expenses - Total expenses
 * @returns {number} Net profit/loss (operatingResult - expenses)
 */
function calculateNetProfitLoss(operatingResult, expenses) {
    return operatingResult - expenses;
}

/**
 * Calculate Total Due (Outstanding Client Balance)
 * @param {number} revenue - Total revenue
 * @param {number} payments - Total client payments
 * @returns {number} Total due (revenue - payments)
 */
function calculateTotalDue(revenue, payments) {
    return revenue - payments;
}

/**
 * Calculate Profit Before Payment
 * @param {number} profitLoss - Net profit/loss
 * @param {number} due - Total due
 * @returns {number} Profit before payment (profitLoss + due)
 */
function calculateProfitBeforePayment(profitLoss, due) {
    return profitLoss + due;
}

// ============================================
// End of Calculation Utility Functions
// ============================================

// ============================================
// Color Indicator Utility Functions
// ============================================

/**
 * Get color class for Net Profit value
 * @param {number} value - Net profit value
 * @returns {string} CSS class name for color coding
 */
function getNetProfitColorClass(value) {
    return value >= 0 ? 'result-positive' : 'result-negative';
}

/**
 * Get color class for Net Cash Flow value
 * @param {number} value - Net cash flow value
 * @returns {string} CSS class name for color coding
 */
function getNetCashFlowColorClass(value) {
    return value >= 0 ? 'result-positive' : 'result-negative';
}

/**
 * Get color class for Net Profit/Loss value (Final Financial Result Card)
 * @param {number} value - Net profit/loss value
 * @returns {string} CSS class name for color coding
 */
function getNetProfitLossColorClass(value) {
    return value >= 0 ? 'result-positive' : 'result-negative';
}

/**
 * Get color class for Profit Before Payment value
 * @param {number} value - Profit before payment value
 * @returns {string} CSS class name for color coding
 */
function getProfitBeforePaymentColorClass(value) {
    return value >= 0 ? 'result-positive' : 'result-negative';
}

// ============================================
// End of Color Indicator Utility Functions
// ============================================

// ============================================
// Rendering Functions
// ============================================

/**
 * Render Profit Overview Section
 * Displays three large metric cards: Total Revenue, Total Costs, Net Profit
 * @param {Object} metrics - The metrics object from /metrics API
 */
function renderProfitOverview(metrics) {
    const container = document.getElementById('profitOverviewSection');
    if (!container) {
        console.error('Profit Overview Section container not found');
        return;
    }

    // Calculate metrics using utility functions
    const totalRevenue = calculateTotalRevenue(metrics);
    const totalCosts = calculateTotalCosts(metrics);
    const netProfit = calculateNetProfit(totalRevenue, totalCosts);

    // Get color class for net profit
    const netProfitColorClass = getNetProfitColorClass(netProfit);

    // Build HTML structure with RTL layout
    const html = `
        <div class="profit-cards-grid">
            <div class="profit-card">
                <div class="profit-icon"><i class="fas fa-money-bill-wave"></i></div>
                <div class="profit-value">${formatCurrency(totalRevenue)}</div>
                <div class="profit-label">إجمالي الإيرادات</div>
            </div>
            <div class="profit-card">
                <div class="profit-icon"><i class="fas fa-chart-line"></i></div>
                <div class="profit-value">${formatCurrency(totalCosts)}</div>
                <div class="profit-label">إجمالي التكاليف</div>
            </div>
            <div class="profit-card">
                <div class="profit-icon"><i class="fas fa-chart-bar"></i></div>
                <div class="profit-value ${netProfitColorClass}">${formatCurrency(netProfit)}</div>
                <div class="profit-label">صافي الربح</div>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

/**
 * Render Final Financial Result Card
 * Displays comprehensive summary of true financial state combining operating profit, expenses, and outstanding balances
 * @param {Object} metrics - The metrics object from /metrics API
 */
function renderFinalFinancialResult(metrics) {
    const container = document.getElementById('finalResultSection');
    if (!container) {
        console.error('Final Result Section container not found');
        return;
    }

    // Calculate all metrics using utility functions
    const totalRevenue = calculateTotalRevenue(metrics);
    const netOperatingResult = calculateNetOperatingResult(metrics);

    // Calculate total expenses (Administrative + Office + Miscellaneous)
    const totalExpenses = (metrics.totalAdministrationCosts || 0) +
        (metrics.operatingExpenses || 0) +
        (metrics.totalLosses || 0);

    const netProfitLoss = calculateNetProfitLoss(netOperatingResult, totalExpenses);

    // Use actual client balances instead of just payments
    const totalDue = metrics.totalClientBalancesPositive || 0;
    console.log('Dashboard - totalClientBalancesPositive:', metrics.totalClientBalancesPositive);
    console.log('Dashboard - totalDue:', totalDue);

    const profitBeforePayment = calculateProfitBeforePayment(netProfitLoss, totalDue);

    // Get color classes
    const netProfitLossColorClass = getNetProfitLossColorClass(netProfitLoss);
    const profitBeforePaymentColorClass = getProfitBeforePaymentColorClass(profitBeforePayment);

    // Build HTML structure with RTL layout
    const html = `
        <div class="final-result-card">
            <div class="final-result-header">
                <h2 class="final-result-title">النتيجة المالية النهائية</h2>
            </div>
            
            <div class="final-result-body">
                <div class="final-result-row">
                    <span class="result-label">نتيجة التشغيل</span>
                    <span class="result-value result-neutral">${formatCurrency(netOperatingResult)}</span>
                </div>
                
                <div class="final-result-row">
                    <span class="result-label">المصروفات</span>
                    <span class="result-value result-neutral">${formatCurrency(totalExpenses)}</span>
                </div>
                
                <div class="final-result-divider"></div>
                
                <div class="final-result-row highlight">
                    <span class="result-label">صافي الربح / الخسارة</span>
                    <span class="result-value ${netProfitLossColorClass}">${formatCurrency(netProfitLoss)}</span>
                </div>
                
                <div class="final-result-row">
                    <span class="result-label">مستحقات العملاء</span>
                    <span class="result-value result-neutral">${formatCurrency(totalDue)}</span>
                </div>
                
                <div class="final-result-divider"></div>
                
                <div class="final-result-row highlight">
                    <span class="result-label">الربح قبل استلام المدفوعات</span>
                    <span class="result-value ${profitBeforePaymentColorClass}">${formatCurrency(profitBeforePayment)}</span>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

/**
 * Render Cost Breakdown Section
 * Displays cost distribution through a pie chart and numeric list
 * @param {Object} metrics - The metrics object from /metrics API
 */
function renderCostBreakdown(metrics) {
    const container = document.getElementById('costBreakdownSection');
    if (!container) {
        console.error('Cost Breakdown Section container not found');
        return;
    }

    // Prepare cost data for all seven categories
    const costData = {
        labels: ['موظفين', 'مقاولين', 'كسارات', 'موردين', 'إدارية', 'مصروفات', 'خسائر'],
        values: [
            metrics.totalEmployeeCosts || 0,
            metrics.totalContractorCosts || 0,
            metrics.totalCrusherCosts || 0,
            metrics.totalSupplierCosts || 0,
            metrics.totalAdministrationCosts || 0,
            metrics.totalExpenses || 0,
            metrics.totalLosses || 0
        ],
        colors: [
            '#3B82F6', // Blue - Employees
            '#10B981', // Green - Contractors
            '#F59E0B', // Amber - Crushers
            '#8B5CF6', // Purple - Suppliers
            '#EC4899', // Pink - Administrative
            '#EF4444', // Red - Expenses
            '#6B7280'  // Gray - Losses
        ]
    };

    // Build numeric list HTML
    let costListHTML = '';
    for (let i = 0; i < costData.labels.length; i++) {
        costListHTML += `
            <div class="cost-item">
                <span class="cost-category">${costData.labels[i]}</span>
                <span class="cost-amount">${formatCurrency(costData.values[i])}</span>
            </div>
        `;
    }

    // Build HTML structure with two-column layout (RTL: chart on right, list on left)
    const html = `
        <h2 class="section-title">توزيع التكاليف</h2>
        <div class="cost-breakdown-grid">
            <div class="cost-list">
                ${costListHTML}
            </div>
            <div class="cost-chart-container">
                <canvas id="costPieChart"></canvas>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Try to render Chart.js pie chart
    // Chart.js is already loaded via CDN in the head section
    if (typeof Chart !== 'undefined') {
        try {
            const ctx = document.getElementById('costPieChart');
            if (ctx) {
                new Chart(ctx, {
                    type: 'pie',
                    data: {
                        labels: costData.labels,
                        datasets: [{
                            data: costData.values,
                            backgroundColor: costData.colors,
                            borderWidth: 2,
                            borderColor: '#ffffff'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                rtl: true,
                                textDirection: 'rtl',
                                labels: {
                                    font: {
                                        family: 'Cairo',
                                        size: 12
                                    },
                                    padding: 15,
                                    usePointStyle: true
                                }
                            },
                            tooltip: {
                                rtl: true,
                                textDirection: 'rtl',
                                callbacks: {
                                    label: function (context) {
                                        const label = context.label || '';
                                        const value = context.parsed || 0;
                                        return label + ': ' + formatCurrency(value);
                                    }
                                }
                            }
                        }
                    }
                });
            }
        } catch (error) {
            console.warn('Chart.js rendering failed:', error);
            // Numeric list is already displayed, so graceful degradation is automatic
        }
    } else {
        console.warn('Chart.js not loaded, showing numeric list only');
        // Numeric list is already displayed, so graceful degradation is automatic
    }
}

/**
 * Render Cash Flow Section
 * Displays two-column layout: Money In (right) and Money Out (left)
 * Shows actual cash movement to understand liquidity
 * @param {Object} metrics - The metrics object from /metrics API
 */
function renderCashFlow(metrics) {
    const container = document.getElementById('cashFlowSection');
    if (!container) {
        console.error('Cash Flow Section container not found');
        return;
    }

    // Calculate Money In and Money Out using utility functions
    const moneyIn = calculateMoneyIn(metrics);
    const moneyOut = calculateMoneyOut(metrics);
    const netCashFlow = calculateNetCashFlow(moneyIn, moneyOut);

    // Get color class for net cash flow
    const netCashFlowColorClass = getNetCashFlowColorClass(netCashFlow);

    // Prepare Money In items
    const clientPayments = metrics.totalClientPayments || 0;
    const positiveAdjustments = metrics.positiveClientAdjustments || 0;

    // Prepare Money Out items
    const supplierPayments = metrics.totalSupplierPayments || 0;
    const crusherPayments = metrics.totalCrusherPayments || 0;
    const contractorPayments = metrics.totalContractorPayments || 0;
    const employeePayments = metrics.totalEmployeePayments || 0;
    const expenses = metrics.totalExpenses || 0;
    const administrativeCosts = metrics.totalAdministrationCosts || 0;

    // Build HTML structure with two-column layout (RTL: Money In on right, Money Out on left)
    const html = `
        <h2 class="section-title">حركة النقد</h2>
        <div class="cash-flow-grid">
            <div class="cash-flow-column money-out">
                <h3 class="column-title">النقد الخارج</h3>
                <div class="cash-flow-items">
                    <div class="cash-flow-item">
                        <span class="item-label">مدفوعات الموردين</span>
                        <span class="item-value">${formatCurrency(supplierPayments)}</span>
                    </div>
                    <div class="cash-flow-item">
                        <span class="item-label">مدفوعات الكسارات</span>
                        <span class="item-value">${formatCurrency(crusherPayments)}</span>
                    </div>
                    <div class="cash-flow-item">
                        <span class="item-label">مدفوعات المقاولين</span>
                        <span class="item-value">${formatCurrency(contractorPayments)}</span>
                    </div>
                    <div class="cash-flow-item">
                        <span class="item-label">مدفوعات الموظفين</span>
                        <span class="item-value">${formatCurrency(employeePayments)}</span>
                    </div>
                    <div class="cash-flow-item">
                        <span class="item-label">المصروفات</span>
                        <span class="item-value">${formatCurrency(expenses)}</span>
                    </div>
                    <div class="cash-flow-item">
                        <span class="item-label">التكاليف الإدارية</span>
                        <span class="item-value">${formatCurrency(administrativeCosts)}</span>
                    </div>
                </div>
                <div class="cash-flow-total">
                    <span>إجمالي النقد الخارج</span>
                    <span class="total-value">${formatCurrency(moneyOut)}</span>
                </div>
            </div>
            
            <div class="cash-flow-column money-in">
                <h3 class="column-title">النقد الداخل</h3>
                <div class="cash-flow-items">
                    <div class="cash-flow-item">
                        <span class="item-label">مدفوعات العملاء</span>
                        <span class="item-value">${formatCurrency(clientPayments)}</span>
                    </div>
                    <div class="cash-flow-item">
                        <span class="item-label">تعديلات إيجابية</span>
                        <span class="item-value">${formatCurrency(positiveAdjustments)}</span>
                    </div>
                </div>
                <div class="cash-flow-total">
                    <span>إجمالي النقد الداخل</span>
                    <span class="total-value">${formatCurrency(moneyIn)}</span>
                </div>
            </div>
        </div>
        
        <div class="net-cash-flow">
            <span class="net-label">صافي حركة النقد</span>
            <span class="net-value ${netCashFlowColorClass}">${formatCurrency(netCashFlow)}</span>
        </div>
    `;

    container.innerHTML = html;
}

/**
 * Render Outstanding Balances Section
 * Displays two-panel layout: Money Owed To Us (right) and Money We Owe (left)
 * Shows receivables and payables to help manage outstanding balances
 * @param {Object} metrics - The metrics object from /metrics API
 */
function renderOutstandingBalances(metrics) {
    const container = document.getElementById('outstandingBalancesSection');
    if (!container) {
        console.error('Outstanding Balances Section container not found');
        return;
    }

    // Calculate Money Owed To Us using utility function
    const moneyOwedToUs = calculateMoneyOwedToUs(metrics);

    // Calculate Money We Owe using utility function
    const moneyWeOwe = calculateMoneyWeOwe(metrics);

    // Prepare breakdown for Money We Owe
    const supplierBalances = metrics.totalSupplierBalances || 0;
    const crusherBalances = metrics.totalCrusherBalances || 0;
    const contractorBalances = metrics.totalContractorBalances || 0;
    const employeeBalances = Math.abs(metrics.totalEmployeeBalancesNegative || 0);

    // Build HTML structure with two-panel layout (RTL: Money Owed To Us on right, Money We Owe on left)
    const html = `
        <h2 class="section-title">الأرصدة المستحقة</h2>
        <div class="balances-grid">
            <div class="balance-panel we-owe">
                <div class="panel-header">
                    <span class="panel-icon">💳</span>
                    <h3 class="panel-title">مستحقات علينا</h3>
                </div>
                <div class="panel-total balance-negative">
                    ${formatCurrency(moneyWeOwe)}
                </div>
                <div class="panel-breakdown">
                    <div class="breakdown-item">
                        <span>موردين</span>
                        <span>${formatCurrency(supplierBalances)}</span>
                    </div>
                    <div class="breakdown-item">
                        <span>كسارات</span>
                        <span>${formatCurrency(crusherBalances)}</span>
                    </div>
                    <div class="breakdown-item">
                        <span>مقاولين</span>
                        <span>${formatCurrency(contractorBalances)}</span>
                    </div>
                    <div class="breakdown-item">
                        <span>موظفين</span>
                        <span>${formatCurrency(employeeBalances)}</span>
                    </div>
                </div>
            </div>
            
            <div class="balance-panel owed-to-us">
                <div class="panel-header">
                    <span class="panel-icon"><i class="fas fa-dollar-sign"></i></span>
                    <h3 class="panel-title">مستحقات لنا</h3>
                </div>
                <div class="panel-total balance-positive">
                    ${formatCurrency(moneyOwedToUs)}
                </div>
                <div class="panel-breakdown">
                    <div class="breakdown-item">
                        <span>أرصدة العملاء</span>
                        <span>${formatCurrency(moneyOwedToUs)}</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

/**
 * Render Operational Metrics Section
 * Displays operational scale metrics (entity counts) with neutral colors
 * @param {Object} metrics - The metrics object from /metrics API
 */
function renderOperationalMetrics(metrics) {
    const container = document.getElementById('operationalMetricsSection');
    if (!container) {
        console.error('Operational Metrics Section container not found');
        return;
    }

    // Extract operational metrics with fallback to 0
    const totalClients = metrics.totalClients || 0;
    const totalCrushers = metrics.totalCrushers || 0;
    const totalSuppliers = metrics.totalSuppliers || 0;
    const totalContractors = metrics.totalContractors || 0;
    const totalProjects = metrics.totalProjects || 0;
    const totalEntries = metrics.totalDeliveries || 0; // Using totalDeliveries for entries

    // Build HTML structure with grid of six metric cards
    const html = `
        <h2 class="section-title">المقاييس التشغيلية</h2>
        <div class="operational-grid">
            <div class="operational-card">
                <div class="operational-icon"><i class="fas fa-building"></i></div>
                <div class="operational-value">${totalClients}</div>
                <div class="operational-label">إجمالي العملاء</div>
            </div>
            <div class="operational-card">
                <div class="operational-icon"><i class="fas fa-industry"></i></div>
                <div class="operational-value">${totalCrushers}</div>
                <div class="operational-label">إجمالي الكسارات</div>
            </div>
            <div class="operational-card">
                <div class="operational-icon"><i class="fas fa-box"></i></div>
                <div class="operational-value">${totalSuppliers}</div>
                <div class="operational-label">إجمالي الموردين</div>
            </div>
            <div class="operational-card">
                <div class="operational-icon"><i class="fas fa-truck"></i></div>
                <div class="operational-value">${totalContractors}</div>
                <div class="operational-label">إجمالي المقاولين</div>
            </div>
            <div class="operational-card">
                <div class="operational-icon"><i class="fas fa-clipboard"></i></div>
                <div class="operational-value">${totalProjects}</div>
                <div class="operational-label">إجمالي المشاريع</div>
            </div>
            <div class="operational-card">
                <div class="operational-icon">📝</div>
                <div class="operational-value">${totalEntries}</div>
                <div class="operational-label">إجمالي التسليمات</div>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

// ============================================
// End of Rendering Functions
// ============================================

/**
 * Display error message in all dashboard sections
 * @param {string} errorMessage - The error message to display in Arabic
 */
function showErrorInAllSections(errorMessage) {
    const errorHtml = `<div class="error">${errorMessage}</div>`;

    // Show error in all main sections
    const sections = [
        'profitOverviewSection',
        'finalResultSection',
        'costBreakdownSection',
        'cashFlowSection',
        'outstandingBalancesSection',
        'operationalMetricsSection',
        'financialOverview',
        'recentActivity'
    ];

    sections.forEach(sectionId => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.innerHTML = errorHtml;
        }
    });
}

async function loadDashboardData() {
    // Check if API utilities are available
    if (typeof apiGet === 'undefined') {
        console.error('API utilities not loaded');
        showErrorInAllSections('فشل في تحميل أدوات النظام');
        return;
    }

    // Check authentication first
    if (!authManager.isAuthenticated()) {
        window.location.href = '/login.html';
        return;
    }

    // Fetch metrics API with error handling
    let metrics = null;
    try {
        metrics = await apiGet('/metrics');
    } catch (error) {
        console.error('Error loading metrics API:', error);
        showErrorInAllSections('خطأ في تحميل البيانات المالية');
        return;
    }

    // Load additional data for recent activity with individual error handling
    // Track which APIs failed for error messaging
    const apiErrors = {};

    const [clientsData, contractorsData, crushersData, employeesData, administrationData, projectsData, suppliersData] = await Promise.all([
        apiGet('/clients?limit=5').catch(err => { console.error('Error loading clients:', err); apiErrors.clients = true; return { data: [], error: true }; }),
        apiGet('/contractors?limit=5').catch(err => { console.error('Error loading contractors:', err); apiErrors.contractors = true; return { data: [], error: true }; }),
        apiGet('/crushers?limit=5').catch(err => { console.error('Error loading crushers:', err); apiErrors.crushers = true; return { data: [], error: true }; }),
        apiGet('/employees?limit=3').catch(err => { console.error('Error loading employees:', err); apiErrors.employees = true; return { data: [], error: true }; }),
        apiGet('/administration?limit=2').catch(err => { console.error('Error loading administration:', err); apiErrors.administration = true; return { data: [], error: true }; }),
        apiGet('/projects?limit=2').catch(err => { console.error('Error loading projects:', err); apiErrors.projects = true; return { data: [], error: true }; }),
        apiGet('/suppliers?limit=2').catch(err => { console.error('Error loading suppliers:', err); apiErrors.suppliers = true; return { data: [], error: true }; })
    ]);

    const clients = clientsData.clients || clientsData.data || [];
    const contractors = contractorsData.contractors || contractorsData.data || [];
    const crushers = crushersData.crushers || crushersData.data || [];
    const employees = employeesData.employees || employeesData.data || [];
    const administration = administrationData.administration || administrationData.data || [];
    const projects = projectsData.projects || projectsData.data || [];
    const suppliers = suppliersData.suppliers || suppliersData.data || [];

    // Render sections - only render financial overview if metrics loaded successfully
    if (metrics) {
        renderProfitOverview(metrics);
        renderFinalFinancialResult(metrics);
        renderCostBreakdown(metrics);
        renderCashFlow(metrics);
        renderOutstandingBalances(metrics);
        renderOperationalMetrics(metrics);
        renderFinancialOverview(metrics);
    }

    renderRecentActivity(clients, contractors, crushers, employees, administration, projects, suppliers, apiErrors);

    // Update last refresh time
    const lastUpdateEl = document.getElementById('lastUpdate');
    if (lastUpdateEl) {
        const now = new Date().toLocaleString('ar-EG');
        lastUpdateEl.textContent = `آخر تحديث: ${now}`;
    }
}

function renderFinancialOverview(metrics) {
    const container = document.getElementById('financialOverview');
    // Old flat structure used <div class="financial-item"> for all 12 metrics
    // New organized structure uses <div class="financial-section-item"> within sections
    container.innerHTML = `
        <section class="financial-section">
            <h3 class="financial-section-header" style="color: var(--gray-50); border-bottom: 2px solid rgba(255, 255, 255, 0.2);">الإيرادات</h3>
            <div class="financial-section-grid">
                <div class="financial-section-item">
                    <div class="financial-value" style="color: var(--gray-50);">${formatCurrency(metrics.totalSales)}</div>
                    <div class="financial-label" style="color: var(--gray-100);">إجمالي المبيعات</div>
                </div>
                <div class="financial-section-item">
                    <div class="financial-value" style="color: var(--gray-50);">${formatCurrency(metrics.totalEarnedSalary || 0)}</div>
                    <div class="financial-label" style="color: var(--gray-100);">إجمالي الرواتب المستحقة</div>
                </div>
            </div>
        </section>

        <section class="financial-section">
            <h3 class="financial-section-header" style="color: var(--gray-50); border-bottom: 2px solid rgba(255, 255, 255, 0.2);">التكاليف</h3>
            <div class="financial-section-grid">
                <div class="financial-section-item">
                    <div class="financial-value" style="color: var(--gray-50);">${formatCurrency(metrics.totalCrusherCosts)}</div>
                    <div class="financial-label" style="color: var(--gray-100);">تكلفة الكسارات</div>
                </div>
                <div class="financial-section-item">
                    <div class="financial-value" style="color: var(--gray-50);">${formatCurrency(metrics.totalContractorCosts)}</div>
                    <div class="financial-label" style="color: var(--gray-100);">تكلفة المقاولين</div>
                </div>
                <div class="financial-section-item">
                    <div class="financial-value" style="color: var(--gray-50);">${formatCurrency(metrics.totalEmployeeCosts || 0)}</div>
                    <div class="financial-label" style="color: var(--gray-100);">صافي تكلفة الموظفين</div>
                </div>
            </div>
        </section>

        <section class="financial-section">
            <h3 class="financial-section-header" style="color: var(--gray-50); border-bottom: 2px solid rgba(255, 255, 255, 0.2);">المصروفات</h3>
            <div class="financial-section-grid">
                <div class="financial-section-item">
                    <div class="financial-value" style="color: var(--gray-50);">${formatCurrency(metrics.operatingExpenses)}</div>
                    <div class="financial-label" style="color: var(--gray-100);">المصروفات التشغيلية</div>
                </div>
                <div class="financial-section-item">
                    <div class="financial-value" style="color: var(--gray-50);">${formatCurrency(metrics.totalAdministrationCosts || 0)}</div>
                    <div class="financial-label" style="color: var(--gray-100);">التكاليف الإدارية</div>
                </div>
                <div class="financial-section-item">
                    <div class="financial-value" style="color: var(--gray-50);">${formatCurrency(metrics.totalExpenses)}</div>
                    <div class="financial-label" style="color: var(--gray-100);">إجمالي المصروفات</div>
                </div>
            </div>
        </section>

        <section class="financial-section">
            <h3 class="financial-section-header" style="color: var(--gray-50); border-bottom: 2px solid rgba(255, 255, 255, 0.2);">الأرصدة</h3>
            <div class="financial-section-grid">
                <div class="financial-section-item">
                    <div class="financial-value" style="color: var(--gray-50);">${formatCurrency(metrics.totalCapitalInjected || 0)}</div>
                    <div class="financial-label" style="color: var(--gray-100);">رأس المال المحقون</div>
                </div>
                <div class="financial-section-item">
                    <div class="financial-value" style="color: var(--gray-50);">${formatCurrency(metrics.totalEmployeePayments || 0)}</div>
                    <div class="financial-label" style="color: var(--gray-100);">مدفوعات الموظفين</div>
                </div>
                <div class="financial-section-item">
                    <div class="financial-value" style="color: var(--gray-50);">${formatCurrency(metrics.totalCashPayments)}</div>
                    <div class="financial-label" style="color: var(--gray-100);">إجمالي المدفوعات النقدية</div>
                </div>
                <div class="financial-section-item">
                    <div class="financial-value ${metrics.netProfit >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(metrics.netProfit)}</div>
                    <div class="financial-label" style="color: var(--gray-100);">صافي الربح</div>
                </div>
            </div>
        </section>
    `;
}


function renderRecentActivity(clients, contractors, crushers, employees, administration, projects, suppliers, apiErrors) {
    const container = document.getElementById('recentActivity');
    const activities = [];
    apiErrors = apiErrors || {};

    // Track if any entity data failed to load
    const hasErrors = apiErrors.employees || apiErrors.administration || apiErrors.projects || apiErrors.suppliers;

    // Add recent employees (up to 3) - or show error
    if (apiErrors.employees) {
        activities.push({
            type: 'error',
            title: 'خطأ في تحميل بيانات الموظفين',
            description: 'فشل في تحميل النشاط الأخير للموظفين',
            time: '',
            icon: '<i class="fas fa-exclamation-triangle"></i>',
            iconBg: 'var(--danger-100)'
        });
    } else if (employees && employees.length > 0) {
        employees.slice(0, 3).forEach(employee => {
            const balance = employee.balance || 0;
            let iconBg;
            if (balance > 0) {
                iconBg = 'var(--success-100)';
            } else if (balance < 0) {
                iconBg = 'var(--danger-100)';
            } else {
                iconBg = 'var(--gray-100)';
            }

            activities.push({
                type: 'employee',
                title: `موظف: ${employee.name}`,
                description: `الرصيد: ${formatCurrency(balance)}`,
                time: formatDate(employee.created_at),
                icon: '👨‍💼',
                iconBg: iconBg
            });
        });
    }

    // Add recent administration (up to 2) - or show error
    if (apiErrors.administration) {
        activities.push({
            type: 'error',
            title: 'خطأ في تحميل بيانات الإدارة',
            description: 'فشل في تحميل النشاط الأخير للإدارة',
            time: '',
            icon: '<i class="fas fa-exclamation-triangle"></i>',
            iconBg: 'var(--danger-100)'
        });
    } else if (administration && administration.length > 0) {
        administration.slice(0, 2).forEach(admin => {
            // Display relevant financial information
            let description = '';
            if (admin.amount) {
                description = `المبلغ: ${formatCurrency(admin.amount)}`;
            } else if (admin.capital) {
                description = `رأس المال: ${formatCurrency(admin.capital)}`;
            } else if (admin.withdrawal) {
                description = `السحب: ${formatCurrency(admin.withdrawal)}`;
            } else {
                description = 'عملية إدارية';
            }

            activities.push({
                type: 'administration',
                title: `إدارة: ${admin.name || admin.entity_name || 'غير محدد'}`,
                description: description,
                time: formatDate(admin.created_at),
                icon: '<i class="fas fa-building"></i>',
                iconBg: 'var(--primary-100)'
            });
        });
    }

    // Add recent projects (up to 2) - or show error
    if (apiErrors.projects) {
        activities.push({
            type: 'error',
            title: 'خطأ في تحميل بيانات المشاريع',
            description: 'فشل في تحميل النشاط الأخير للمشاريع',
            time: '',
            icon: '<i class="fas fa-exclamation-triangle"></i>',
            iconBg: 'var(--danger-100)'
        });
    } else if (projects && projects.length > 0) {
        projects.slice(0, 2).forEach(project => {
            // Display relevant project information
            let description = '';
            if (project.description) {
                description = project.description;
            } else if (project.status) {
                description = `الحالة: ${project.status}`;
            } else if (project.location) {
                description = `الموقع: ${project.location}`;
            } else {
                description = 'مشروع';
            }

            activities.push({
                type: 'project',
                title: `مشروع: ${project.name}`,
                description: description,
                time: formatDate(project.created_at),
                icon: '📁',
                iconBg: 'var(--primary-100)'
            });
        });
    }

    // Add recent suppliers (up to 2) - or show error
    if (apiErrors.suppliers) {
        activities.push({
            type: 'error',
            title: 'خطأ في تحميل بيانات الموردين',
            description: 'فشل في تحميل النشاط الأخير للموردين',
            time: '',
            icon: '<i class="fas fa-exclamation-triangle"></i>',
            iconBg: 'var(--danger-100)'
        });
    } else if (suppliers && suppliers.length > 0) {
        suppliers.slice(0, 2).forEach(supplier => {
            const balance = supplier.balance || 0;

            activities.push({
                type: 'supplier',
                title: `مورد: ${supplier.name}`,
                description: `الرصيد: ${formatCurrency(balance)}`,
                time: formatDate(supplier.created_at),
                icon: '🚚',
                iconBg: 'var(--warning-100)'
            });
        });
    }

    // Add recent clients (those with recent activity)
    if (!apiErrors.clients && clients && clients.length > 0) {
        clients.slice(0, 3).forEach(client => {
            const balance = client.balance || 0;
            const amountClass = balance > 0 ? 'positive' : balance < 0 ? 'negative' : '';
            
            activities.push({
                type: 'client',
                title: client.name,
                description: 'تحديث رصيد العميل',
                time: formatDate(client.created_at),
                amount: formatCurrency(Math.abs(balance)),
                amountClass: amountClass,
                icon: '<i class="fas fa-user"></i>',
                iconBg: balance > 0 ? 'var(--success-100)' : balance < 0 ? 'var(--danger-100)' : 'var(--gray-100)'
            });
        });
    }

    // Add recent contractors
    if (!apiErrors.contractors && contractors && contractors.length > 0) {
        contractors.slice(0, 2).forEach(contractor => {
            const balance = contractor.balance || 0;
            const amountClass = balance > 0 ? 'negative' : 'positive'; // Inverted for contractors
            
            activities.push({
                type: 'contractor',
                title: contractor.name,
                description: 'مستحقات نقل جديدة',
                time: formatDate(contractor.created_at),
                amount: formatCurrency(Math.abs(balance)),
                amountClass: amountClass,
                icon: '<i class="fas fa-truck"></i>',
                iconBg: contractor.balance > 0 ? 'var(--warning-100)' : 'var(--success-100)'
            });
        });
    }

    // Add recent crushers
    if (!apiErrors.crushers && crushers && crushers.length > 0) {
        crushers.slice(0, 2).forEach(crusher => {
            const net = crusher.net || 0;
            const amountClass = net > 0 ? 'positive' : net < 0 ? 'negative' : '';
            
            activities.push({
                type: 'crusher',
                title: crusher.name,
                description: 'تسليمات كسارة جديدة',
                time: formatDate(crusher.created_at),
                amount: formatCurrency(Math.abs(net)),
                amountClass: amountClass,
                icon: '<i class="fas fa-industry"></i>',
                iconBg: 'var(--primary-100)'
            });
        });
    }

    if (activities.length === 0) {
        container.innerHTML = '<div class="loading">لا توجد أنشطة حديثة</div>';
        return;
    }

    container.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon" style="background: ${activity.iconBg}">
                ${activity.icon}
            </div>
            <div class="activity-content">
                <div class="activity-title">${activity.title}</div>
                <div class="activity-time">${activity.time ? activity.time : ''}</div>
            </div>
            ${activity.amount ? `<div class="activity-amount ${activity.amountClass || ''}">${activity.amount}</div>` : ''}
        </div>
    `).join('');
}

// Auto-refresh functionality
let autoRefreshInterval;

function startAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    autoRefreshInterval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// Wait for utilities to load before initializing dashboard
async function initializeDashboard() {
    // Wait for utilities to be available
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max wait

    while (typeof apiGet === 'undefined' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }

    if (typeof apiGet === 'undefined') {
        console.error('API utilities failed to load');
        document.getElementById('financialOverview').innerHTML =
            '<div class="error">فشل في تحميل أدوات النظام</div>';
        return;
    }

    // Now load dashboard data
    loadDashboardData();
    startAutoRefresh();
}

// Load data when page loads and start auto-refresh
document.addEventListener('DOMContentLoaded', initializeDashboard);

// Stop auto-refresh when page is hidden/closed
document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
        stopAutoRefresh();
    } else {
        startAutoRefresh();
    }
});

window.addEventListener('beforeunload', stopAutoRefresh);
