// Utilities are loaded via separate script tags - no need to redefine common functions

// Global variables
let currentClientId = null;
let currentClient = null;
let currentProjectId = null;

// --- Helpers ---

function formatDateTime(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleString('ar-EG');
}

// --- Project Data Loading ---

async function loadProjectDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    currentClientId = urlParams.get('client_id');

    if (!currentClientId) {
        Swal.fire({
            icon: 'error',
            title: 'خطأ',
            text: 'معرف المشروع غير موجود'
        }).then(() => {
            window.location.href = 'projects.html';
        });
        return;
    }

    // Show loaders in financial cards sections
    const cardIds = [
        'capitalCard',
        'operatingResultCard',
        'generalExpensesCard',
        'netOperatingProfitCard',
        'netOpeningBalanceCard',
        'finalFinancialPositionCard',
        'cashPositionCard'
    ];

    cardIds.forEach(cardId => {
        const card = document.getElementById(cardId);
        if (card) {
            showInlineLoader(cardId, 'جاري التحميل...');
        }
    });

    showInlineLoader('expensesTableBody', 'جاري تحميل المصروفات...');
    showInlineLoader('capitalInjectionsTableBody', 'جاري تحميل ضخ رأس المال...');
    showInlineLoader('withdrawalsTableBody', 'جاري تحميل المسحوبات...');
    showInlineLoader('assignedEmployeesTableBody', 'جاري تحميل الموظفين...');

    try {
        const clientData = await apiGet(`/clients/${currentClientId}`);
        currentClient = clientData.client;

        // In this system, clients ARE projects, so currentClientId is the project ID
        currentProjectId = currentClientId;

        await Promise.all([
            displayClientInfo(currentClient),
            displayDetailedFinancialCards(),
            loadProjectExpenses(),
            loadCapitalInjections(),
            loadWithdrawals(),
            loadAssignedEmployees()
        ]);

    } catch (error) {
        console.error('Error loading project details:', error);
        Swal.fire({
            icon: 'error',
            title: 'خطأ',
            text: 'تعذر تحميل بيانات المشروع'
        });
    }
}

function displayClientInfo(client) {
    document.getElementById('projectName').textContent = client.name;
    
    // Update created date
    const createdDateEl = document.getElementById('projectCreatedDate');
    if (createdDateEl) {
        createdDateEl.innerHTML = `
            <span class="material-symbols-outlined text-sm">calendar_today</span>
            تاريخ الإنشاء: ${formatDate(client.created_at)}
        `;
    }

    // Update client info banner
    const banner = document.getElementById('clientInfoBanner');
    const openingBalanceClass = (client.opening_balance || 0) < 0 ? 'text-error-container' : 'text-tertiary-fixed';
    const openingBalanceText = (client.opening_balance || 0) < 0 
        ? `${formatCurrency(Math.abs(client.opening_balance || 0))}- ج.م` 
        : `${formatCurrency(client.opening_balance || 0)} ج.م`;
    
    banner.innerHTML = `
        <div class="flex items-center gap-6">
            <div class="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                <span class="material-symbols-outlined text-3xl">person</span>
            </div>
            <div>
                <h4 class="font-arabic text-xl font-bold">بيانات العميل الأساسية</h4>
                <p class="text-white/70 font-arabic text-sm">${client.name} - عميل مميز</p>
            </div>
        </div>
        <div class="flex gap-12 ml-12">
            <div>
                <p class="text-white/60 text-[10px] font-arabic uppercase mb-1">رقم الهاتف</p>
                <p class="font-headline font-bold">${client.phone || '—'}</p>
            </div>
            <div>
                <p class="text-white/60 text-[10px] font-arabic uppercase mb-1">الرصيد الافتتاحي</p>
                <p class="font-headline font-bold ${openingBalanceClass}">${openingBalanceText}</p>
            </div>
            <div>
                <p class="text-white/60 text-[10px] font-arabic uppercase mb-1">الحالة</p>
                <p class="font-arabic font-bold flex items-center gap-1">
                    <span class="w-2 h-2 bg-tertiary-fixed rounded-full"></span>
                    نشط
                </p>
            </div>
        </div>
    `;
}

async function displayDetailedFinancialCards() {
    try {
        const data = await apiGet(`/clients/${currentClientId}`);
        const client = data.client;
        const deliveries = data.deliveries || [];
        const totals = data.totals || {};

        const totalPayments = totals.totalPayments || 0;

        // First, find the Project that corresponds to this Client
        let projectId = null;
        try {
            const projectsData = await apiGet('/projects');
            const projects = projectsData.projects || [];
            const matchingProject = projects.find(p => String(p.client_id) === String(currentClientId));
            if (matchingProject) {
                projectId = matchingProject.id;
                console.log('✅ Found matching Project for this Client:', projectId);
            } else {
                // Fallback: use currentClientId as projectId
                projectId = currentClientId;
                console.log('⚠️ No matching Project found, using Client ID as Project ID:', projectId);
            }
        } catch (error) {
            console.error('Error finding matching project:', error);
            // Fallback: use currentClientId as projectId
            projectId = currentClientId;
        }

        let materialCosts = 0;
        let contractorCosts = 0;
        let totalRevenue = 0;

        // If deliveries have missing material_price_at_time, we need to look it up
        const deliveriesWithMissingPrices = deliveries.filter(d => !d.material_price_at_time || d.material_price_at_time === 0);

        if (deliveriesWithMissingPrices.length > 0) {
            console.warn('<i class="fas fa-exclamation-triangle"></i> Found deliveries with missing material_price_at_time:', deliveriesWithMissingPrices.length);
            // We'll calculate costs without these for now, but log a warning
        }

        deliveries.forEach(delivery => {
            const netQuantity = (delivery.net_quantity || delivery.quantity || 0);
            const quantity = delivery.quantity || 0;
            const materialPrice = delivery.material_price_at_time || 0;

            materialCosts += materialPrice * quantity;
            contractorCosts += (delivery.contractor_charge_per_meter || 0) * quantity;
            totalRevenue += (delivery.price_per_meter || 0) * quantity;
            console.log(delivery.price_per_meter, delivery._id)
        });

        console.log('🚚 Deliveries Debug:');
        console.log('Total deliveries:', deliveries.length);
        if (deliveries.length > 0) {
            console.log('Sample delivery:', deliveries[0]);
            console.log('Delivery fields:', {
                material_price_at_time: deliveries[0].material_price_at_time,
                contractor_charge_per_meter: deliveries[0].contractor_charge_per_meter,
                price_per_meter: deliveries[0].price_per_meter,
                quantity: deliveries[0].quantity,
                net_quantity: deliveries[0].net_quantity,
                crusher_id: deliveries[0].crusher_id,
                supplier_id: deliveries[0].supplier_id
            });
        }
        console.log('Material costs calculated:', materialCosts);
        console.log('Contractor costs calculated:', contractorCosts);

        let totalExpenses = 0;
        let administrativeExpenses = 0;  // This will be withdrawals
        let salaries = 0;  // This will be employee payments for this project
        let operationalExpenses = 0;

        try {
            // Get withdrawals for this project (Administrative Expenses)
            const withdrawalsData = await apiGet('/administration/withdrawals');
            const allWithdrawals = withdrawalsData.withdrawals || [];

            // Filter withdrawals by Project ID
            const projectWithdrawals = allWithdrawals.filter(w => {
                const wProjectId = w.project_id?._id || w.project_id;
                return projectId && String(wProjectId) === String(projectId);
            });

            administrativeExpenses = projectWithdrawals.reduce((sum, w) => sum + (w.amount || 0), 0);

            console.log('💸 Administrative Expenses (Withdrawals) Debug:');
            console.log('Total withdrawals in system:', allWithdrawals.length);
            console.log('Filtered withdrawals for this project:', projectWithdrawals.length);
            console.log('Total administrative expenses:', administrativeExpenses);
        } catch (error) {
            console.error('Error loading withdrawals:', error);
        }

        try {
            // Get employee salaries for this project
            const employeesData = await apiGet('/employees');
            const allEmployees = employeesData.employees || [];

            console.log('<i class="fas fa-money-bill-wave"></i> Salaries Debug:');
            console.log('Total employees in system:', allEmployees.length);

            // For each employee, check if they're assigned to this project
            for (const employee of allEmployees) {
                try {
                    const empDetailsData = await apiGet(`/employees/${employee.id}`);
                    const empDetails = empDetailsData.employee || {};

                    // Check if employee works on all projects or is assigned to this specific project
                    const worksOnAllProjects = empDetails.all_projects === true;
                    const assignedProjects = empDetails.assigned_projects || [];

                    const isAssignedToProject = worksOnAllProjects || assignedProjects.some(projectId => {
                        return String(projectId) === String(currentClientId) ||
                            (projectId && String(projectId) === String(projectId));
                    });

                    if (isAssignedToProject) {
                        // Use actual payments, not earned salary
                        const totals = empDetailsData.totals || {};
                        const totalPayments = totals.total_payments || 0;

                        // If employee works on multiple projects, divide payments proportionally
                        if (worksOnAllProjects) {
                            // Get total number of active projects (clients) to divide payments
                            const clientsData = await apiGet('/clients');
                            const activeProjects = (clientsData.clients || []).length;
                            if (activeProjects > 0) {
                                salaries += totalPayments / activeProjects;
                            }
                        } else if (assignedProjects.length > 1) {
                            // Divide by number of assigned projects
                            salaries += totalPayments / assignedProjects.length;
                        } else {
                            // Employee works only on this project
                            salaries += totalPayments;
                        }

                        console.log(`Employee ${empDetails.name}: payments=${totalPayments}, projects=${assignedProjects.length || 'all'}`);
                    }
                } catch (error) {
                    console.error(`Error loading employee ${employee.id} details:`, error);
                }
            }

            console.log('Total salaries for this project:', salaries);
        } catch (error) {
            console.error('Error loading employee salaries:', error);
        }

        try {
            // Get regular expenses (Operational Expenses only)
            const expensesData = await apiGet(`/expenses`);
            const allExpenses = expensesData.expenses || [];

            // Filter by either Client ID or Project ID
            const expenses = allExpenses.filter(expense => {
                const expProjectId = expense.project_id?._id || expense.project_id;
                return String(expProjectId) === String(currentClientId) ||
                    (projectId && String(expProjectId) === String(projectId));
            });

            console.log('🔧 Operational Expenses Debug:');
            console.log('Total expenses in system:', allExpenses.length);
            console.log('Filtered expenses found:', expenses.length);

            expenses.forEach(expense => {
                const amount = expense.amount || 0;
                operationalExpenses += amount;
            });

            console.log('Total operational expenses:', operationalExpenses);
        } catch (error) {
            console.error('Error loading expenses:', error);
        }

        // Total expenses = Administrative (Withdrawals) + Salaries (Employee Payments) + Operational (Regular Expenses)
        totalExpenses = administrativeExpenses + salaries + operationalExpenses;

        let totalCapitalInjections = 0;
        try {
            // Use the projectId we found earlier
            const injectionsData = await apiGet('/administration/capital-injections');
            const allInjections = injectionsData.capital_injections || injectionsData.capitalInjections || [];

            let projectInjections = [];
            if (projectId) {
                // Filter by the Project ID we found
                projectInjections = allInjections.filter(inj => {
                    const injProjectId = inj.project_id?._id || inj.project_id;
                    return String(injProjectId) === String(projectId);
                });
            }

            totalCapitalInjections = projectInjections.reduce((sum, inj) => sum + (inj.amount || 0), 0);
            console.log('<i class="fas fa-money-bill-wave"></i> Capital Injections Debug:');
            console.log('All injections:', allInjections.length);
            console.log('Current Client ID:', currentClientId);
            console.log('Matching Project ID:', projectId);
            console.log('Filtered injections for this project:', projectInjections);
            console.log('Total capital for this project:', totalCapitalInjections);
        } catch (error) {
            console.error('Error loading capital injections:', error);
        }

        // Get opening balances for crushers, contractors, and suppliers
        let totalCrusherOpeningBalances = 0;
        let totalContractorOpeningBalances = 0;
        let totalSupplierOpeningBalances = 0;

        try {
            const crusherBalancesData = await apiGet(`/crushers/opening-balances?project_id=${currentClientId}`);
            const crusherBalances = crusherBalancesData.opening_balances || [];
            totalCrusherOpeningBalances = crusherBalances.reduce((sum, balance) => sum + (balance.amount || 0), 0);
        } catch (error) {
            console.error('Error loading crusher opening balances:', error);
        }

        try {
            const contractorBalancesData = await apiGet(`/contractors/opening-balances?project_id=${currentClientId}`);
            const contractorBalances = contractorBalancesData.opening_balances || [];
            totalContractorOpeningBalances = contractorBalances.reduce((sum, balance) => sum + (balance.amount || 0), 0);
        } catch (error) {
            console.error('Error loading contractor opening balances:', error);
        }

        try {
            const supplierBalancesData = await apiGet(`/suppliers/opening-balances?project_id=${currentClientId}`);
            const supplierBalances = supplierBalancesData.opening_balances || [];
            totalSupplierOpeningBalances = supplierBalances.reduce((sum, balance) => sum + (balance.amount || 0), 0);
        } catch (error) {
            console.error('Error loading supplier opening balances:', error);
        }

        // Get total adjustments from client data
        const totalAdjustments = totals.totalAdjustments || 0;

        // Calculations
        const clientOpeningBalance = client.opening_balance || 0;
        const totalCosts = materialCosts + contractorCosts;
        const operatingResult = totalRevenue - totalCosts;
        const netProfit = operatingResult - totalExpenses;

        // Net Opening Balance calculation:
        // Client positive = they owe us (add to our position)
        // Crusher/Supplier positive = we owe them (subtract from our position)
        // Contractor positive = we owe them (subtract from our position)
        // Contractor negative = they owe us (add to our position)
        // Formula: client balance - (crusher + contractor + supplier balances)
        // This correctly handles negative contractor balances
        const netOpeningBalance = clientOpeningBalance - totalCrusherOpeningBalances - totalContractorOpeningBalances - totalSupplierOpeningBalances;

        console.log('═══════════════════════════════════════════════════════');
        console.log('<i class="fas fa-chart-line"></i> COMPLETE FINANCIAL CALCULATIONS DEBUG');
        console.log('═══════════════════════════════════════════════════════');
        console.log('');
        console.log('<i class="fas fa-dollar-sign"></i> REVENUE & COSTS:');
        console.log('  Total Revenue:', totalRevenue);
        console.log('  Material Costs:', materialCosts);
        console.log('  Contractor Costs:', contractorCosts);
        console.log('  Total Costs:', totalCosts);
        console.log('  Operating Result (Revenue - Costs):', operatingResult);
        console.log('');
        console.log('💸 EXPENSES:');
        console.log('  Administrative Expenses:', administrativeExpenses);
        console.log('  Salaries:', salaries);
        console.log('  Operational Expenses:', operationalExpenses);
        console.log('  Total Expenses:', totalExpenses);
        console.log('');
        console.log('<i class="fas fa-money-bill-wave"></i> CAPITAL:');
        console.log('  Total Capital Injections:', totalCapitalInjections);
        console.log('');
        console.log('<i class="fas fa-clipboard"></i> OPENING BALANCES:');
        console.log('  Client Opening Balance:', clientOpeningBalance);
        console.log('  Crusher Opening Balances:', totalCrusherOpeningBalances);
        console.log('  Contractor Opening Balances:', totalContractorOpeningBalances);
        console.log('  Supplier Opening Balances:', totalSupplierOpeningBalances);
        console.log('  Net Opening Balance (Client - Entities):', netOpeningBalance);
        console.log('');
        console.log('🔧 ADJUSTMENTS:');
        console.log('  Total Adjustments:', totalAdjustments);
        console.log('');
        console.log('💳 PAYMENTS:');
        console.log('  Total Payments:', totalPayments);
        console.log('');
        console.log('<i class="fas fa-chart-bar"></i> CALCULATED RESULTS:');
        console.log('  Net Profit (Operating Result - Expenses):', netProfit);

        // Final Financial Position = Net Operating Profit + Net Opening Balance + Total Adjustments
        const finalFinancialPosition = netProfit + netOpeningBalance + totalAdjustments;
        console.log('  Final Financial Position (Net Profit + Net Opening Balance + Adjustments):', finalFinancialPosition);

        // Net Capital Position = Paid-in Capital - (|clientOpeningBalance| + Materials + contractor costs + totalExpenses)
        const netCapitalPosition = totalCapitalInjections - (Math.abs(clientOpeningBalance) + materialCosts + contractorCosts + totalExpenses);
        console.log('  Net Capital Position (Capital - Client Opening - Materials - Contractors - Expenses):', netCapitalPosition);

        // Net Profit/Loss Upon Settlement = Final Financial Position - Total Payments
        const netProfitLossUponSettlement = finalFinancialPosition - totalPayments;
        console.log('  Net Profit/Loss Upon Settlement (Final Position - Payments):', netProfitLossUponSettlement);

        const due = netProfitLossUponSettlement;
        console.log('  Due (same as Net Profit/Loss Upon Settlement):', due);
        console.log('');
        console.log('═══════════════════════════════════════════════════════');

        // Determine capital status
        let capitalStatus = '';
        if (netCapitalPosition > 0) {
            capitalStatus = 'فائض';  // Surplus
        } else if (netCapitalPosition < 0) {
            capitalStatus = 'عجز';   // Shortage
        } else {
            capitalStatus = 'متوازن'; // Balanced
        }

        // Card 1: Capital Position (موقف رأس المال)
        document.getElementById('capitalCard').innerHTML = `
            <div class="flex justify-between text-sm mb-2">
                <span class="font-arabic text-on-surface-variant">رأس المال المدفوع:</span>
                <span class="font-headline font-bold text-base text-success">${formatCurrency(totalCapitalInjections)}</span>
            </div>
            <div class="flex justify-between text-sm mb-2">
                <span class="font-arabic text-on-surface-variant">رصيد افتتاحي:</span>
                <span class="font-headline font-bold text-base text-error">-${formatCurrency(Math.abs(clientOpeningBalance))}</span>
            </div>
            <div class="flex justify-between text-sm mb-2">
                <span class="font-arabic text-on-surface-variant">تكلفة مواد:</span>
                <span class="font-headline font-bold text-base text-error">-${formatCurrency(materialCosts)}</span>
            </div>
            <div class="flex justify-between text-sm mb-2">
                <span class="font-arabic text-on-surface-variant">تكلفة مقاولين:</span>
                <span class="font-headline font-bold text-base text-error">-${formatCurrency(contractorCosts)}</span>
            </div>
            <div class="flex justify-between text-sm mb-2">
                <span class="font-arabic text-on-surface-variant">مصروفات عامة:</span>
                <span class="font-headline font-bold text-base text-error">-${formatCurrency(totalExpenses)}</span>
            </div>
            <div class="pt-3 border-t border-outline-variant/20 flex justify-between items-center ${netCapitalPosition >= 0 ? 'text-success' : 'text-error'}">
                <span class="font-arabic font-bold text-base">${netCapitalPosition >= 0 ? 'فائض رأس المال' : 'عجز رأس المال'}</span>
                <span class="font-headline font-extrabold text-2xl">${netCapitalPosition >= 0 ? '' : ''}${formatCurrency(netCapitalPosition)} <span class="text-xs">ج.م</span></span>
            </div>
        `;

        // Card 2: Operating Result (نتيجة التشغيل)
        document.getElementById('operatingResultCard').innerHTML = `
            <div class="flex justify-between text-sm mb-2">
                <span class="text-on-surface-variant font-arabic">إجمالي الإيرادات</span>
                <span class="font-headline font-bold text-base">${formatCurrency(totalRevenue)}</span>
            </div>
            <div class="flex justify-between text-sm mb-2">
                <span class="text-on-surface-variant font-arabic">تكلفة المواد</span>
                <span class="font-headline font-bold text-base">${formatCurrency(materialCosts)}</span>
            </div>
            <div class="flex justify-between text-sm mb-2">
                <span class="text-on-surface-variant font-arabic">تكلفة المقاولين</span>
                <span class="font-headline font-bold text-base">${formatCurrency(contractorCosts)}</span>
            </div>
            <div class="pt-3 border-t border-outline-variant/20 flex justify-between items-center text-tertiary">
                <span class="font-arabic font-bold text-base">نتيجة التشغيل</span>
                <span class="font-headline font-extrabold text-2xl">${formatCurrency(Math.abs(operatingResult))}</span>
            </div>
        `;

        // Card 3: General Expenses (المصروفات العامة)
        document.getElementById('generalExpensesCard').innerHTML = `
            <div class="flex justify-between text-sm mb-2">
                <span class="text-on-surface-variant font-arabic">المصروفات الإدارية</span>
                <span class="font-headline font-bold text-base">${formatCurrency(administrativeExpenses)}</span>
            </div>
            <div class="flex justify-between text-sm mb-2">
                <span class="text-on-surface-variant font-arabic">الرواتب</span>
                <span class="font-headline font-bold text-base">${formatCurrency(salaries)}</span>
            </div>
            <div class="flex justify-between text-sm mb-2">
                <span class="text-on-surface-variant font-arabic">المصروفات التشغيلية</span>
                <span class="font-headline font-bold text-base">${formatCurrency(operationalExpenses)}</span>
            </div>
            <div class="pt-3 border-t border-outline-variant/20 flex justify-between items-center text-primary">
                <span class="font-arabic font-bold text-base">إجمالي المصروفات</span>
                <span class="font-headline font-extrabold text-2xl">${formatCurrency(totalExpenses)} <span class="text-xs">ج.م</span></span>
            </div>
        `;

        // Card 4: Net Operating Profit (صافي الربح التشغيلي)
        document.getElementById('netOperatingProfitCard').innerHTML = `
            <div class="space-y-3 mb-6">
                <div class="flex justify-between text-sm">
                    <span class="font-arabic text-on-surface-variant">نتيجة التشغيل</span>
                    <span class="font-headline font-bold text-base">${formatCurrency(Math.abs(operatingResult))}</span>
                </div>
                <div class="flex justify-between text-sm">
                    <span class="font-arabic text-on-surface-variant">إجمالي المصروفات العامة</span>
                    <span class="font-headline font-bold text-base">${formatCurrency(totalExpenses)}</span>
                </div>
            </div>
            <div class="pt-4 border-t-2 border-dashed border-outline-variant/30 flex flex-col items-center gap-1">
                <span class="font-arabic text-xs text-on-surface-variant">إجمالي الربح المحقق</span>
                <span class="font-headline font-extrabold text-4xl text-tertiary">${formatCurrency(Math.abs(netProfit))} <span class="text-base font-arabic">ج.م</span></span>
            </div>
        `;

        // Card 5: Net Opening Balance (صافي الرصيد الافتتاحي)
        document.getElementById('netOpeningBalanceCard').innerHTML = `
            <div class="grid grid-cols-1 gap-2 mb-4">
                <div class="flex justify-between text-sm px-2 py-1 rounded hover:bg-surface-container-low transition-colors">
                    <span class="font-arabic text-on-surface-variant">رصيد العميل الافتتاحي</span>
                    <span class="font-headline font-bold text-base ${clientOpeningBalance >= 0 ? 'text-success' : 'text-error'}">${clientOpeningBalance >= 0 ? '' : ''}${formatCurrency(clientOpeningBalance)}</span>
                </div>
                <div class="flex justify-between text-sm px-2 py-1 rounded hover:bg-surface-container-low transition-colors">
                    <span class="font-arabic text-on-surface-variant">أرصدة الكسارات</span>
                    <span class="font-headline font-bold text-base text-error">-${formatCurrency(Math.abs(totalCrusherOpeningBalances))}</span>
                </div>
                <div class="flex justify-between text-sm px-2 py-1 rounded hover:bg-surface-container-low transition-colors">
                    <span class="font-arabic text-on-surface-variant">أرصدة المقاولين</span>
                    <span class="font-headline font-bold text-base text-error">-${formatCurrency(Math.abs(totalContractorOpeningBalances))}</span>
                </div>
                <div class="flex justify-between text-sm px-2 py-1 rounded hover:bg-surface-container-low transition-colors">
                    <span class="font-arabic text-on-surface-variant">أرصدة الموردين</span>
                    <span class="font-headline font-bold text-base text-error">-${formatCurrency(Math.abs(totalSupplierOpeningBalances))}</span>
                </div>
            </div>
            <div class="pt-3 border-t border-outline-variant/20 flex justify-between items-center ${netOpeningBalance >= 0 ? 'text-success' : 'text-error'}">
                <span class="font-arabic font-bold text-base">الصافي الإجمالي</span>
                <span class="font-headline font-extrabold text-2xl">${netOpeningBalance >= 0 ? '' : ''}${formatCurrency(netOpeningBalance)} <span class="text-xs">ج.م</span></span>
            </div>
        `;

        // Card 6: Final Financial Position (الموقف المالي النهائي)
        document.getElementById('finalFinancialPositionCard').innerHTML = `
            <div class="space-y-2 text-sm mb-4">
                <div class="flex justify-between">
                    <span class="font-arabic text-on-surface-variant">${netProfit >= 0 ? 'صافي ربح تشغيلي' : 'صافي خسارة تشغيلية'}</span>
                    <span class="font-headline font-bold text-base ${netProfit >= 0 ? 'text-success' : 'text-error'}">${netProfit >= 0 ? '' : ''}${formatCurrency(netProfit)}</span>
                </div>
                <div class="flex justify-between">
                    <span class="font-arabic text-on-surface-variant">صافي رصيد افتتاحي</span>
                    <span class="font-headline font-bold text-base ${netOpeningBalance >= 0 ? 'text-success' : 'text-error'}">${netOpeningBalance >= 0 ? '' : ''}${formatCurrency(netOpeningBalance)}</span>
                </div>
                <div class="flex justify-between">
                    <span class="font-arabic text-on-surface-variant">إجمالي التسويات</span>
                    <span class="font-headline font-bold text-base ${totalAdjustments >= 0 ? 'text-success' : 'text-error'}">${totalAdjustments >= 0 ? '' : ''}${formatCurrency(totalAdjustments)}</span>
                </div>
            </div>
            <div class="bg-primary/5 p-3 rounded-lg flex justify-between items-center ${finalFinancialPosition >= 0 ? 'text-success' : 'text-error'}">
                <span class="font-arabic font-bold text-base">الموقف المالي (استحقاق)</span>
                <span class="font-headline font-extrabold text-2xl">${finalFinancialPosition >= 0 ? '' : ''}${formatCurrency(finalFinancialPosition)} <span class="text-xs">ج.م</span></span>
            </div>
        `;

        // Card 7: Cash Position (الموقف النقدي الفعلي)
        // Calculate actual cash position by adjusting for unpaid balances
        const clientBalance = totals.balance || 0; // Positive = client owes us (we haven't collected)
        
        // Get entity balances (positive = we owe them, negative = they owe us)
        let crusherBalances = 0;
        let supplierBalances = 0;
        let contractorBalances = 0;
        let employeeBalances = 0;
        
        // Track overpayments (money we paid extra - owed to us)
        let crusherOverpayments = 0;
        let supplierOverpayments = 0;
        let contractorOverpayments = 0;
        let employeeOverpayments = 0;

        try {
            // Get crusher balances
            const crushersData = await apiGet('/crushers');
            const crushers = crushersData.crushers || [];
            for (const crusher of crushers) {
                try {
                    const crusherDetails = await apiGet(`/crushers/${crusher.id}`);
                    const crusherTotals = crusherDetails.totals || {};
                    const net = crusherTotals.net || 0;
                    if (net > 0) {
                        crusherBalances += net; // Money we owe them
                    } else if (net < 0) {
                        crusherOverpayments += Math.abs(net); // Money they owe us
                    }
                } catch (err) {
                    console.error(`Error loading crusher ${crusher.id}:`, err);
                }
            }

            // Get supplier balances
            const suppliersData = await apiGet('/suppliers');
            const suppliers = suppliersData.suppliers || [];
            for (const supplier of suppliers) {
                try {
                    const supplierDetails = await apiGet(`/suppliers/${supplier.id}`);
                    const supplierTotals = supplierDetails.totals || {};
                    const balance = supplierTotals.balance || 0;
                    if (balance > 0) {
                        supplierBalances += balance; // Money we owe them
                    } else if (balance < 0) {
                        supplierOverpayments += Math.abs(balance); // Money they owe us
                    }
                } catch (err) {
                    console.error(`Error loading supplier ${supplier.id}:`, err);
                }
            }

            // Get contractor balances
            const contractorsData = await apiGet('/contractors');
            const contractors = contractorsData.contractors || [];
            for (const contractor of contractors) {
                try {
                    const contractorDetails = await apiGet(`/contractors/${contractor.id}`);
                    const contractorTotals = contractorDetails.totals || {};
                    const balance = contractorTotals.balance || 0;
                    if (balance > 0) {
                        contractorBalances += balance; // Money we owe them
                    } else if (balance < 0) {
                        contractorOverpayments += Math.abs(balance); // Money they owe us
                    }
                } catch (err) {
                    console.error(`Error loading contractor ${contractor.id}:`, err);
                }
            }

            // Get employee balances
            const employeesData = await apiGet('/employees');
            const employees = employeesData.employees || [];
            for (const employee of employees) {
                try {
                    const employeeDetails = await apiGet(`/employees/${employee.id}`);
                    const employeeTotals = employeeDetails.totals || {};
                    const balance = employeeTotals.balance || 0;
                    if (balance < 0) {
                        employeeBalances += Math.abs(balance); // Money we owe them
                    } else if (balance > 0) {
                        employeeOverpayments += balance; // Money they owe us
                    }
                } catch (err) {
                    console.error(`Error loading employee ${employee.id}:`, err);
                }
            }
        } catch (error) {
            console.error('Error loading entity balances:', error);
        }

        // Cash Position = Financial Position - unpaid debts + money we still have (haven't paid yet)
        // Subtract: money we haven't collected from clients (reduces our cash)
        // Add: money we owe but haven't paid yet (still in our hands)
        // Add: overpayments (money entities owe us - already paid extra)
        const totalDebts = crusherBalances + supplierBalances + contractorBalances + employeeBalances;
        const totalOverpayments = crusherOverpayments + supplierOverpayments + contractorOverpayments + employeeOverpayments;
        const cashPosition = finalFinancialPosition - clientBalance + totalDebts + totalOverpayments;
        const difference = finalFinancialPosition - cashPosition;

        document.getElementById('cashPositionCard').innerHTML = `
            <div class="space-y-2 text-sm mb-4">
                <div class="flex justify-between">
                    <span class="font-arabic text-on-surface-variant">الموقف المالي (استحقاق)</span>
                    <span class="font-headline font-bold text-base">${formatCurrency(finalFinancialPosition)}</span>
                </div>
                <div class="flex justify-between">
                    <span class="font-arabic text-on-surface-variant">ديون العميل (لم تُحصّل)</span>
                    <span class="font-headline font-bold text-base text-error">-${formatCurrency(clientBalance)}</span>
                </div>
                ${crusherBalances > 0 ? `
                <div class="flex justify-between">
                    <span class="font-arabic text-on-surface-variant">ديون الكسارات (لم تُدفع)</span>
                    <span class="font-headline font-bold text-base text-success">${formatCurrency(crusherBalances)}</span>
                </div>` : ''}
                ${crusherOverpayments > 0 ? `
                <div class="flex justify-between">
                    <span class="font-arabic text-on-surface-variant">فلوس زيادة للكسارات (لنا)</span>
                    <span class="font-headline font-bold text-base text-success">${formatCurrency(crusherOverpayments)}</span>
                </div>` : ''}
                ${supplierBalances > 0 ? `
                <div class="flex justify-between">
                    <span class="font-arabic text-on-surface-variant">ديون الموردين (لم تُدفع)</span>
                    <span class="font-headline font-bold text-base text-success">${formatCurrency(supplierBalances)}</span>
                </div>` : ''}
                ${supplierOverpayments > 0 ? `
                <div class="flex justify-between">
                    <span class="font-arabic text-on-surface-variant">فلوس زيادة للموردين (لنا)</span>
                    <span class="font-headline font-bold text-base text-success">${formatCurrency(supplierOverpayments)}</span>
                </div>` : ''}
                ${contractorBalances > 0 ? `
                <div class="flex justify-between">
                    <span class="font-arabic text-on-surface-variant">ديون المقاولين (لم تُدفع)</span>
                    <span class="font-headline font-bold text-base text-success">${formatCurrency(contractorBalances)}</span>
                </div>` : ''}
                ${contractorOverpayments > 0 ? `
                <div class="flex justify-between">
                    <span class="font-arabic text-on-surface-variant">فلوس زيادة للمقاولين (لنا)</span>
                    <span class="font-headline font-bold text-base text-success">${formatCurrency(contractorOverpayments)}</span>
                </div>` : ''}
                ${employeeBalances > 0 ? `
                <div class="flex justify-between">
                    <span class="font-arabic text-on-surface-variant">ديون الموظفين (لم تُدفع)</span>
                    <span class="font-headline font-bold text-base text-success">${formatCurrency(employeeBalances)}</span>
                </div>` : ''}
                ${employeeOverpayments > 0 ? `
                <div class="flex justify-between">
                    <span class="font-arabic text-on-surface-variant">فلوس زيادة للموظفين (لنا)</span>
                    <span class="font-headline font-bold text-base text-success">${formatCurrency(employeeOverpayments)}</span>
                </div>` : ''}
            </div>
            <div class="bg-tertiary/10 p-3 rounded-lg flex justify-between items-center ${cashPosition >= 0 ? 'text-success' : 'text-error'}">
                <span class="font-arabic font-bold text-base">الموقف النقدي الفعلي</span>
                <span class="font-headline font-extrabold text-2xl">${cashPosition >= 0 ? '' : ''}${formatCurrency(cashPosition)} <span class="text-xs">ج.م</span></span>
            </div>
            <div class="mt-2 text-center text-xs text-on-surface-variant font-arabic">
                الفرق: ${formatCurrency(Math.abs(difference))} ج.م (${difference >= 0 ? 'ديون لنا' : 'ديون علينا'})
            </div>
        `;

    } catch (error) {
        console.error('Error loading detailed financial cards:', error);
    }
}

async function loadProjectExpenses() {
    try {
        const data = await apiGet(`/expenses?project_id=${currentClientId}`);
        const expenses = data.expenses || [];
        displayExpenses(expenses);
    } catch (error) {
        console.error('Error loading project expenses:', error);
        displayExpenses([]);
    }
}

function displayExpenses(expenses) {
    const tbody = document.getElementById('expensesTableBody');

    if (!expenses || expenses.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="px-4 py-12 text-center">
                    <div class="flex flex-col items-center opacity-40">
                        <span class="material-symbols-outlined text-4xl mb-2">inbox</span>
                        <p class="font-arabic text-sm">لا توجد مصروفات مرتبطة بهذا المشروع</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = expenses.map(expense => `
        <tr class="hover:bg-surface-container-low/30 transition-colors">
            <td class="px-6 py-4 font-headline text-sm">${formatDateShort(expense.expense_date || expense.date)}</td>
            <td class="px-6 py-4 font-arabic text-sm">${expense.description || '—'}</td>
            <td class="px-6 py-4 font-headline font-bold text-primary">${formatCurrency(expense.amount)} <span class="text-[10px] font-arabic font-normal">ج.م</span></td>
            <td class="px-6 py-4 font-arabic text-sm text-on-surface-variant">${expense.notes || '—'}</td>
        </tr>
    `).join('');
}

async function loadCapitalInjections() {
    try {
        const data = await apiGet('/administration/capital-injections');
        const allInjections = data.capital_injections || data.capitalInjections || [];

        // Find the matching project ID first
        let projectId = null;
        try {
            const projectsData = await apiGet('/projects');
            const projects = projectsData.projects || [];
            const matchingProject = projects.find(p => String(p.client_id) === String(currentClientId));
            if (matchingProject) {
                projectId = matchingProject.id;
            } else {
                // Fallback: use currentClientId as projectId
                projectId = currentClientId;
            }
        } catch (error) {
            console.error('Error finding matching project:', error);
            // Fallback: use currentClientId as projectId
            projectId = currentClientId;
        }

        // Filter by Project ID (not Client ID)
        const injections = allInjections.filter(injection => {
            const injProjectId = injection.project_id?._id || injection.project_id;
            return projectId && String(injProjectId) === String(projectId);
        });

        displayCapitalInjections(injections);
    } catch (error) {
        console.error('Error loading capital injections:', error);
        displayCapitalInjections([]);
    }
}

function displayCapitalInjections(injections) {
    const tbody = document.getElementById('capitalInjectionsTableBody');

    if (!injections || injections.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td class="px-4 py-12 text-center" colspan="3">
                    <div class="flex flex-col items-center opacity-40">
                        <span class="material-symbols-outlined text-4xl mb-2">inbox</span>
                        <p class="font-arabic text-sm">لا توجد حقن رأسمالية</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = injections.map(injection => `
        <tr class="hover:bg-surface-container-low/30 transition-colors">
            <td class="px-4 py-4 font-headline font-bold text-sm">${formatCurrency(injection.amount)} <span class="text-[10px] font-arabic font-normal">ج.م</span></td>
            <td class="px-4 py-4 font-arabic text-sm">${injection.administration_name || '—'}</td>
            <td class="px-4 py-4 font-headline text-sm">${formatDate(injection.date)}</td>
        </tr>
    `).join('');
}

async function loadWithdrawals() {
    try {
        const data = await apiGet('/administration/withdrawals');
        const allWithdrawals = data.withdrawals || [];

        // Find the matching project ID first
        let projectId = null;
        try {
            const projectsData = await apiGet('/projects');
            const projects = projectsData.projects || [];
            const matchingProject = projects.find(p => String(p.client_id) === String(currentClientId));
            if (matchingProject) {
                projectId = matchingProject.id;
            } else {
                // Fallback: use currentClientId as projectId
                projectId = currentClientId;
            }
        } catch (error) {
            console.error('Error finding matching project:', error);
            // Fallback: use currentClientId as projectId
            projectId = currentClientId;
        }

        // Filter by Project ID (not Client ID)
        const withdrawals = allWithdrawals.filter(withdrawal => {
            const wProjectId = withdrawal.project_id?._id || withdrawal.project_id;
            return projectId && String(wProjectId) === String(projectId);
        });

        displayWithdrawals(withdrawals);
    } catch (error) {
        console.error('Error loading withdrawals:', error);
        displayWithdrawals([]);
    }
}

function displayWithdrawals(withdrawals) {
    const tbody = document.getElementById('withdrawalsTableBody');

    if (!withdrawals || withdrawals.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td class="px-4 py-12 text-center" colspan="3">
                    <div class="flex flex-col items-center opacity-40">
                        <span class="material-symbols-outlined text-4xl mb-2">remove_circle_outline</span>
                        <p class="font-arabic text-sm">لا توجد سحوبات</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = withdrawals.map(withdrawal => `
        <tr class="hover:bg-surface-container-low/30 transition-colors">
            <td class="px-4 py-4 font-headline font-bold text-sm">${formatCurrency(withdrawal.amount)} <span class="text-[10px] font-arabic font-normal">ج.م</span></td>
            <td class="px-4 py-4 font-arabic text-sm">${withdrawal.administration_name || '—'}</td>
            <td class="px-4 py-4 font-headline text-sm">${formatDate(withdrawal.date)}</td>
        </tr>
    `).join('');
}

async function loadAssignedEmployees() {
    try {
        const data = await apiGet('/employees');
        const allEmployees = data.employees || [];
        const assignedEmployees = allEmployees.filter(employee => {
            return employee.all_projects || (employee.assigned_projects && employee.assigned_projects.includes(currentClientId));
        });
        displayAssignedEmployees(assignedEmployees);
    } catch (error) {
        console.error('Error loading assigned employees:', error);
        displayAssignedEmployees([]);
    }
}

function displayAssignedEmployees(employees) {
    const tbody = document.getElementById('assignedEmployeesTableBody');

    if (!employees || employees.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-12 text-center">
                    <div class="flex flex-col items-center opacity-40">
                        <span class="material-symbols-outlined text-4xl mb-2">group_off</span>
                        <p class="font-arabic text-sm">لا توجد موظفين مخصصين لهذا المشروع</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = employees.map(employee => {
        const initials = employee.name ? employee.name.charAt(0).toUpperCase() : 'M';
        return `
            <tr class="hover:bg-surface-container-low/30 transition-colors">
                <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-primary-container text-primary flex items-center justify-center font-bold font-headline text-xs">${initials}</div>
                        <a href="employee-details.html?id=${employee.id}" class="font-arabic font-bold text-sm hover:text-primary">${employee.name}</a>
                    </div>
                </td>
                <td class="px-6 py-4 font-arabic text-sm">${employee.job_title || '—'}</td>
                <td class="px-6 py-4">
                    <span class="px-3 py-1 bg-surface-container-high rounded-full text-[10px] font-arabic font-bold text-on-secondary-container">
                        ${employee.all_projects ? 'جميع المشاريع' : 'مشاريع محددة'}
                    </span>
                </td>
                <td class="px-6 py-4 font-headline font-bold text-sm">
                    ${employee.basic_salary || employee.base_salary ? formatCurrency(employee.basic_salary || employee.base_salary) + ' <span class="text-[10px] font-arabic font-normal">ج.م</span>' : '—'}
                </td>
                <td class="px-6 py-4">
                    <span class="flex items-center gap-1.5 font-arabic text-xs ${employee.status === 'Active' ? 'text-tertiary' : 'text-error'}">
                        <span class="w-1.5 h-1.5 rounded-full ${employee.status === 'Active' ? 'bg-tertiary' : 'bg-error'}"></span>
                        ${employee.status === 'Active' ? 'نشط' : 'غير نشط'}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

// --- Event Listeners ---

document.addEventListener('DOMContentLoaded', function () {
    loadProjectDetails();
    window.currentClientId = currentClientId;
});
