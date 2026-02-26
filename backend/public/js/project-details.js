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
    document.getElementById('projectName').textContent = `المشروع المالي: ${client.name}`;

    const infoContainer = document.getElementById('clientInfo');
    infoContainer.innerHTML = `
        <div class="info-item">
            <span class="info-label">اسم العميل:</span>
            <span class="info-value">${client.name}</span>
        </div>
        <div class="info-item">
            <span class="info-label">رقم الهاتف:</span>
            <span class="info-value">${client.phone || '—'}</span>
        </div>
        <div class="info-item">
            <span class="info-label">الرصيد الافتتاحي:</span>
            <span class="info-value">${formatCurrency(client.opening_balance || 0)}</span>
        </div>
        <div class="info-item">
            <span class="info-label">تاريخ الإنشاء:</span>
            <span class="info-value">${formatDate(client.created_at)}</span>
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
                console.log('📋 Found matching Project for this Client:', projectId);
            }
        } catch (error) {
            console.error('Error finding matching project:', error);
        }

        let materialCosts = 0;
        let contractorCosts = 0;
        let totalRevenue = 0;

        // If deliveries have missing material_price_at_time, we need to look it up
        const deliveriesWithMissingPrices = deliveries.filter(d => !d.material_price_at_time || d.material_price_at_time === 0);
        
        if (deliveriesWithMissingPrices.length > 0) {
            console.warn('⚠️ Found deliveries with missing material_price_at_time:', deliveriesWithMissingPrices.length);
            // We'll calculate costs without these for now, but log a warning
        }

        deliveries.forEach(delivery => {
            const netQuantity = (delivery.net_quantity || delivery.quantity || 0);
            const quantity = delivery.quantity || 0;
            const materialPrice = delivery.material_price_at_time || 0;
            
            materialCosts += materialPrice * netQuantity;
            contractorCosts += (delivery.contractor_charge_per_meter || 0) * netQuantity;
            totalRevenue += (delivery.price_per_meter || 0) * quantity;
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
            
            console.log('💰 Salaries Debug:');
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
                        // Use earned salary, not just payments
                        const totals = empDetailsData.totals || {};
                        const earnedSalary = totals.total_earned_salary || 0;
                        
                        // If employee works on multiple projects, divide salary proportionally
                        if (worksOnAllProjects) {
                            // Get total number of active projects to divide salary
                            const projectsData = await apiGet('/projects');
                            const activeProjects = (projectsData.projects || []).length;
                            if (activeProjects > 0) {
                                salaries += earnedSalary / activeProjects;
                            }
                        } else if (assignedProjects.length > 1) {
                            // Divide by number of assigned projects
                            salaries += earnedSalary / assignedProjects.length;
                        } else {
                            // Employee works only on this project
                            salaries += earnedSalary;
                        }
                        
                        console.log(`Employee ${empDetails.name}: earned=${earnedSalary}, projects=${assignedProjects.length || 'all'}`);
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
            console.log('💰 Capital Injections Debug:');
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
        
        // Net Opening Balance: positive entity balances mean we owe them (subtract from client balance)
        // If client balance is positive (they owe us) and entity balances are positive (we owe them), net is client - entities
        const netOpeningBalance = clientOpeningBalance - totalCrusherOpeningBalances - totalContractorOpeningBalances - totalSupplierOpeningBalances;
        
        console.log('═══════════════════════════════════════════════════════');
        console.log('📊 COMPLETE FINANCIAL CALCULATIONS DEBUG');
        console.log('═══════════════════════════════════════════════════════');
        console.log('');
        console.log('💵 REVENUE & COSTS:');
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
        console.log('💰 CAPITAL:');
        console.log('  Total Capital Injections:', totalCapitalInjections);
        console.log('');
        console.log('📋 OPENING BALANCES:');
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
        console.log('📈 CALCULATED RESULTS:');
        console.log('  Net Profit (Operating Result - Expenses):', netProfit);
        
        // Final Financial Position = Net Operating Profit + Net Opening Balance + Total Adjustments
        const finalFinancialPosition = netProfit + netOpeningBalance + totalAdjustments;
        console.log('  Final Financial Position (Net Profit + Net Opening Balance + Adjustments):', finalFinancialPosition);
        
        // Net Capital Position = Paid-in Capital - (clientOpeningBalance + adjustments + Materials + contractor costs + totalExpenses)
        const netCapitalPosition = totalCapitalInjections - (clientOpeningBalance + totalAdjustments + materialCosts + contractorCosts + totalExpenses);
        console.log('  Net Capital Position (Capital - Client Opening - Adjustments - Materials - Contractors - Expenses):', netCapitalPosition);
        
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

        // Card 1: Capital Position
        // Shows how capital was used vs what was injected
        // All items except capital injection are expenses (reduce capital)
        document.getElementById('capitalCard').innerHTML = `
            <div class="card-line revenue">
                <span class="card-line-value positive">${formatCurrency(totalCapitalInjections)}</span>
                <span class="card-line-label">رأس المال المدفوع</span>
            </div>
            <div class="card-line expense">
                <span class="card-line-value negative">${formatCurrency(Math.abs(clientOpeningBalance))}</span>
                <span class="card-line-label">الرصيد الافتتاحي للعميل</span>
            </div>
            <div class="card-line expense">
                <span class="card-line-value negative">${formatCurrency(Math.abs(totalAdjustments))}</span>
                <span class="card-line-label">التسويات</span>
            </div>
            <div class="card-line expense">
                <span class="card-line-value negative">${formatCurrency(materialCosts)}</span>
                <span class="card-line-label">تكلفة المواد</span>
            </div>
            <div class="card-line expense">
                <span class="card-line-value negative">${formatCurrency(contractorCosts)}</span>
                <span class="card-line-label">تكلفة المقاولين</span>
            </div>
            <div class="card-line expense">
                <span class="card-line-value negative">${formatCurrency(totalExpenses)}</span>
                <span class="card-line-label">المصروفات العامة</span>
            </div>
            <div class="card-line total">
                <span class="card-line-value ${netCapitalPosition >= 0 ? 'positive' : 'negative'}">${formatCurrency(Math.abs(netCapitalPosition))} (${capitalStatus})</span>
                <span class="card-line-label">صافي موقف رأس المال</span>
            </div>
        `;

        // Card 2: Operating Result
        document.getElementById('operatingResultCard').innerHTML = `
            <div class="card-line revenue">
                <span class="card-line-value positive">${formatCurrency(totalRevenue)}</span>
                <span class="card-line-label">إجمالي الإيرادات</span>
            </div>
            <div class="card-line expense">
                <span class="card-line-value negative">${formatCurrency(materialCosts)}</span>
                <span class="card-line-label">تكلفة المواد</span>
            </div>
            <div class="card-line expense">
                <span class="card-line-value negative">${formatCurrency(contractorCosts)}</span>
                <span class="card-line-label">تكلفة المقاولين</span>
            </div>
            <div class="card-line total">
                <span class="card-line-value ${operatingResult >= 0 ? 'positive' : 'negative'}">${formatCurrency(Math.abs(operatingResult))}</span>
                <span class="card-line-label">نتيجة التشغيل</span>
            </div>
        `;

        // Card 3: General Expenses
        document.getElementById('generalExpensesCard').innerHTML = `
            <div class="card-line expense">
                <span class="card-line-value negative">${formatCurrency(administrativeExpenses)}</span>
                <span class="card-line-label">المصروفات الإدارية</span>
            </div>
            <div class="card-line expense">
                <span class="card-line-value negative">${formatCurrency(salaries)}</span>
                <span class="card-line-label">الرواتب</span>
            </div>
            <div class="card-line expense">
                <span class="card-line-value negative">${formatCurrency(operationalExpenses)}</span>
                <span class="card-line-label">المصروفات التشغيلية</span>
            </div>
            <div class="card-line total">
                <span class="card-line-value negative">${formatCurrency(totalExpenses)}</span>
                <span class="card-line-label">إجمالي المصروفات العامة</span>
            </div>
        `;

        // Card 4: Net Operating Profit
        document.getElementById('netOperatingProfitCard').innerHTML = `
            <div class="card-line ${operatingResult >= 0 ? 'revenue' : 'expense'}">
                <span class="card-line-value ${operatingResult >= 0 ? 'positive' : 'negative'}">${formatCurrency(Math.abs(operatingResult))}</span>
                <span class="card-line-label">نتيجة التشغيل</span>
            </div>
            <div class="card-line expense">
                <span class="card-line-value negative">${formatCurrency(totalExpenses)}</span>
                <span class="card-line-label">إجمالي المصروفات العامة</span>
            </div>
            <div class="card-line total">
                <span class="card-line-value ${netProfit >= 0 ? 'positive' : 'negative'}">${formatCurrency(Math.abs(netProfit))}</span>
                <span class="card-line-label">صافي الربح التشغيلي</span>
            </div>
        `;

        // Card 5: Net Opening Balance
        document.getElementById('netOpeningBalanceCard').innerHTML = `
            <div class="card-line ${clientOpeningBalance >= 0 ? 'revenue' : 'expense'}">
                <span class="card-line-value ${clientOpeningBalance >= 0 ? 'positive' : 'negative'}">${formatCurrency(Math.abs(clientOpeningBalance))}</span>
                <span class="card-line-label">رصيد العميل الافتتاحي</span>
            </div>
            <div class="card-line ${totalCrusherOpeningBalances >= 0 ? 'expense' : 'revenue'}">
                <span class="card-line-value ${totalCrusherOpeningBalances >= 0 ? 'negative' : 'positive'}">${formatCurrency(Math.abs(totalCrusherOpeningBalances))}</span>
                <span class="card-line-label">أرصدة الكسارات</span>
            </div>
            <div class="card-line ${totalContractorOpeningBalances >= 0 ? 'expense' : 'revenue'}">
                <span class="card-line-value ${totalContractorOpeningBalances >= 0 ? 'negative' : 'positive'}">${formatCurrency(Math.abs(totalContractorOpeningBalances))}</span>
                <span class="card-line-label">أرصدة المقاولين</span>
            </div>
            <div class="card-line ${totalSupplierOpeningBalances >= 0 ? 'expense' : 'revenue'}">
                <span class="card-line-value ${totalSupplierOpeningBalances >= 0 ? 'negative' : 'positive'}">${formatCurrency(Math.abs(totalSupplierOpeningBalances))}</span>
                <span class="card-line-label">أرصدة الموردين</span>
            </div>
            <div class="card-line total">
                <span class="card-line-value ${netOpeningBalance >= 0 ? 'positive' : 'negative'}">${formatCurrency(Math.abs(netOpeningBalance))}</span>
                <span class="card-line-label">صافي الرصيد الافتتاحي</span>
            </div>
        `;

        // Card 6: Final Financial Position
        // Note: In this card, we show the COMPOSITION of final position
        // Positive net profit = good (green), negative = bad (red)
        // Positive opening balance = good (green), negative = bad (red)
        // Positive adjustments = good (green), negative = bad (red)
        // Final position: positive = good (green), negative = bad (red)
        // Payments are always expenses (red)
        // Net profit/loss upon settlement: positive = profit (green), negative = loss (red)
        document.getElementById('finalFinancialPositionCard').innerHTML = `
            <div class="card-line ${netProfit >= 0 ? 'revenue' : 'expense'}">
                <span class="card-line-value ${netProfit >= 0 ? 'positive' : 'negative'}">${formatCurrency(Math.abs(netProfit))}</span>
                <span class="card-line-label">${netProfit >= 0 ? 'صافي الربح التشغيلي' : 'صافي الخسارة التشغيلية'}</span>
            </div>
            <div class="card-line ${netOpeningBalance >= 0 ? 'revenue' : 'expense'}">
                <span class="card-line-value ${netOpeningBalance >= 0 ? 'positive' : 'negative'}">${formatCurrency(Math.abs(netOpeningBalance))}</span>
                <span class="card-line-label">صافي الرصيد الافتتاحي</span>
            </div>
            <div class="card-line ${totalAdjustments >= 0 ? 'revenue' : 'expense'}">
                <span class="card-line-value ${totalAdjustments >= 0 ? 'positive' : 'negative'}">${formatCurrency(Math.abs(totalAdjustments))}</span>
                <span class="card-line-label">إجمالي التسويات</span>
            </div>
            <div class="card-line highlight">
                <span class="card-line-value ${finalFinancialPosition >= 0 ? 'positive' : 'negative'}">${formatCurrency(Math.abs(finalFinancialPosition))}</span>
                <span class="card-line-label">الموقف المالي النهائي للمشروع</span>
            </div>
            <div class="card-line expense">
                <span class="card-line-value negative">${formatCurrency(totalPayments)}</span>
                <span class="card-line-label">إجمالي المدفوعات</span>
            </div>
            <div class="card-line total">
                <span class="card-line-value ${netProfitLossUponSettlement >= 0 ? 'positive' : 'negative'}">${formatCurrency(Math.abs(netProfitLossUponSettlement))}</span>
                <span class="card-line-label">${netProfitLossUponSettlement >= 0 ? 'صافي الربح عند السداد' : 'الخسارة عند السداد'}</span>
            </div>
            <div class="card-line total">
                <span class="card-line-value ${due >= 0 ? 'positive' : 'negative'}">${formatCurrency(Math.abs(due))}</span>
                <span class="card-line-label">المستحق</span>
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
                <td colspan="4" class="empty-state">لا توجد مصروفات مرتبطة بهذا المشروع</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = expenses.map(expense => `
        <tr>
            <td>${formatDateShort(expense.expense_date || expense.date)}</td>
            <td>${expense.description || '—'}</td>
            <td>${formatCurrency(expense.amount)}</td>
            <td>${expense.notes || '—'}</td>
        </tr>
    `).join('');
}

async function loadCapitalInjections() {
    try {
        const data = await apiGet('/administration/capital-injections');
        const allInjections = data.capital_injections || data.capitalInjections || [];
        // Filter by currentClientId since clients ARE projects in this system
        const injections = allInjections.filter(injection => injection.project_id === currentClientId);
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
                <td colspan="4" class="empty-state">لا توجد حقن رأسمالية</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = injections.map(injection => `
        <tr>
            <td>${formatCurrency(injection.amount)}</td>
            <td>${injection.administration_name || '—'}</td>
            <td>${formatDate(injection.date)}</td>
            <td>${injection.notes || '—'}</td>
        </tr>
    `).join('');
}

async function loadWithdrawals() {
    try {
        const data = await apiGet('/administration/withdrawals');
        const allWithdrawals = data.withdrawals || [];
        // Filter by currentClientId since clients ARE projects in this system
        const withdrawals = allWithdrawals.filter(withdrawal => withdrawal.project_id === currentClientId);
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
                <td colspan="4" class="empty-state">لا توجد سحوبات</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = withdrawals.map(withdrawal => `
        <tr>
            <td>${formatCurrency(withdrawal.amount)}</td>
            <td>${withdrawal.administration_name || '—'}</td>
            <td>${formatDate(withdrawal.date)}</td>
            <td>${withdrawal.notes || '—'}</td>
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
    const tbody = document.getElementById('employeesTableBody');

    if (!employees || employees.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">لا توجد موظفين مخصصين لهذا المشروع</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = employees.map(employee => `
        <tr>
            <td>
                <a href="employee-details.html?id=${employee.id}" class="link">
                    ${employee.name}
                </a>
            </td>
            <td>${employee.job_title || '—'}</td>
            <td>${employee.all_projects ? 'جميع المشاريع' : 'مشاريع محددة'}</td>
            <td>${employee.basic_salary || employee.base_salary ? formatCurrency(employee.basic_salary || employee.base_salary) : '—'}</td>
            <td>
                <span class="status-${employee.status.toLowerCase()}">
                    ${employee.status === 'Active' ? 'نشط' : 'غير نشط'}
                </span>
            </td>
        </tr>
    `).join('');
}

// --- Event Listeners ---

document.addEventListener('DOMContentLoaded', function () {
    loadProjectDetails();
    window.currentClientId = currentClientId;
});
