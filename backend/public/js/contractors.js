// --- Helpers ---

/**
 * Creates a single contractor card DOM node
 * @param {object} contractor - object (id, name, balance, ...future fields)
 * @returns {HTMLElement}
 */
function createContractorCard(contractor) {
    const card = document.createElement('div');
    card.className = 'contractor-card';

    // Header with name and actions
    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid #f8fafc;';

    const name = document.createElement('h3');
    name.style.cssText = 'font-size: 1.125rem; font-weight: 700; color: var(--on-surface); margin: 0; flex: 1;';
    name.textContent = contractor.name || "—";

    const actions = document.createElement('div');
    actions.className = 'contractor-actions';

    const detailsBtn = document.createElement('button');
    detailsBtn.className = 'action-btn-modern view';
    detailsBtn.innerHTML = '<i class="fas fa-chart-line"></i> التفاصيل';
    detailsBtn.title = 'عرض التفاصيل';
    detailsBtn.onclick = (e) => {
        e.stopPropagation();
        window.location.href = `contractor-details.html?id=${contractor.id}`;
    };

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'action-btn-modern danger';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.title = 'حذف';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deleteContractor(contractor.id, contractor.name);
    };

    actions.appendChild(detailsBtn);
    actions.appendChild(deleteBtn);
    header.appendChild(name);
    header.appendChild(actions);
    card.appendChild(header);

    // Phone number if available
    if (contractor.phone) {
        const phoneDiv = document.createElement('div');
        phoneDiv.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; color: var(--on-surface-variant);';
        phoneDiv.innerHTML = `<i class="fas fa-phone"></i> <span>${contractor.phone}</span>`;
        card.appendChild(phoneDiv);
    }

    // Balance section
    const balance = contractor.balance || 0;
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
        label.textContent = '(مستحق للمقاول)';
        balanceItem.appendChild(balanceLabel);
        balanceItem.appendChild(balanceValue);
        balanceItem.appendChild(label);
    } else if (balance < 0) {
        balanceValue.style.color = '#14532d'; // green-900
        const label = document.createElement('p');
        label.style.cssText = 'font-size: 0.75rem; color: var(--on-surface-variant); margin-top: 0.25rem;';
        label.textContent = '(مستحق لنا)';
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
        { label: 'إجمالي التسليمات', value: contractor.deliveriesCount || 0 },
        { label: 'إجمالي المدفوعات', value: formatCurrency(contractor.totalTrips || contractor.totalEarnings || 0) }
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
    card.onclick = () => window.location.href = `contractor-details.html?id=${contractor.id}`;

    return card;
}

function renderContractors(contractors) {
    const container = document.getElementById('contractorsContainer');
    if (!container) return;

    container.innerHTML = '';

    if (!contractors || contractors.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fas fa-truck"></i></div>
                <div class="empty-text">لا توجد مقاولين مسجلين</div>
                <button class="btn-modern btn-primary-modern" onclick="document.getElementById('addContractorBtn').click()">
                    <i class="fas fa-plus"></i> إضافة مقاول جديد
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
document.addEventListener('DOMContentLoaded', async function () {
    // Check authentication first
    if (authManager.checkAuth()) {
        // Load projects first
        await loadContractorProjectsList();
        
        // Add contractor button
        document.getElementById('addContractorBtn').addEventListener('click', () => {
            showAddContractorModal();
        });

        // Add opening balance button
        document.getElementById('addContractorOpeningBalanceBtn').addEventListener('click', addContractorOpeningBalanceRow);

        // Form submission
        document.getElementById('addContractorForm').addEventListener('submit', handleAddContractor);
        
        // Override modal close buttons to use our custom close function
        const modal = document.getElementById('addContractorModal');
        if (modal) {
            const closeButtons = modal.querySelectorAll('.modal-close');
            closeButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    closeAddContractorModal();
                });
            });
            
            // Close on background click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeAddContractorModal();
                }
            });
        }
        
        // Load contractors
        showInlineLoader('contractorsContainer', 'جاري تحميل المقاولين...');
        fetchContractors()
            .then(renderContractors)
            .catch(err => {
                console.error(err);
                const container = document.getElementById('contractorsContainer');
                if (container) {
                    container.innerHTML = `
                        <div class="error-state">
                            <div class="error-icon"><i class="fas fa-times-circle"></i></div>
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

// Show add contractor modal
function showAddContractorModal() {
    document.getElementById('addContractorModal').style.display = 'flex';
    document.getElementById('contractorName').focus();
}

// Close add contractor modal
function closeAddContractorModal() {
    document.getElementById('addContractorModal').style.display = 'none';
    document.getElementById('addContractorForm').reset();
    document.getElementById('contractorOpeningBalancesContainer').innerHTML = '';
    document.getElementById('addContractorMessage').innerHTML = '';
    contractorOpeningBalanceCounter = 0;
}

// Handle add contractor form submission
let isSubmittingContractor = false;

async function handleAddContractor(e) {
    e.preventDefault();

    // Prevent double submission
    if (isSubmittingContractor) {
        console.log('Already submitting, please wait...');
        return;
    }

    const name = document.getElementById('contractorName').value.trim();
    const openingBalances = getContractorOpeningBalances();

    if (!name) {
        await Swal.fire({
            title: 'خطأ',
            text: 'يرجى إدخال اسم المقاول',
            icon: 'error',
            confirmButtonText: 'موافق'
        });
        return;
    }

    isSubmittingContractor = true;
    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalButtonText = submitButton ? submitButton.textContent : 'حفظ';
    
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'جاري الإضافة...';
    }

    try {
        const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/contractors`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: name,
                opening_balances: openingBalances
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'فشل في إضافة المقاول');
        }

        await Swal.fire({
            icon: 'success',
            title: 'تم الحفظ',
            text: 'تم إضافة المقاول بنجاح',
            confirmButtonText: 'موافق',
            timer: 2000
        });

        closeAddContractorModal();
        location.reload();

    } catch (error) {
        console.error('Error adding contractor:', error);
        
        await Swal.fire({
            title: 'خطأ',
            text: error.message || 'فشل في إضافة المقاول',
            icon: 'error',
            confirmButtonText: 'موافق'
        });
    } finally {
        // Always reset the flag and button state
        isSubmittingContractor = false;
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    }
}



// Make functions globally available
window.closeAddContractorModal = closeAddContractorModal;


// ============================================================================
// OPENING BALANCE MANAGEMENT (Project-Based) - ADD & EDIT FORMS
// ============================================================================

let contractorOpeningBalanceCounter = 0;
let contractorProjectsList = [];
let editContractorOpeningBalanceCounter = 0;

async function loadContractorProjectsList() {
    try {
        const response = await authManager.makeAuthenticatedRequest(`${API_BASE}/clients`);
        const data = await response.json();
        console.log('Clients API response:', data);
        contractorProjectsList = data.clients || data;
        console.log('Clients loaded:', contractorProjectsList.length, 'clients');
    } catch (error) {
        console.error('Error loading clients:', error);
        contractorProjectsList = [];
    }
}

function addContractorOpeningBalanceRow(existingData = null) {
    console.log('Adding opening balance row, clients available:', contractorProjectsList.length);
    
    if (contractorProjectsList.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'تنبيه',
            text: 'لا توجد عملاء متاحين. يرجى إضافة عميل أولاً من صفحة العملاء.',
            confirmButtonText: 'حسناً'
        });
        return;
    }
    
    const container = document.getElementById('contractorOpeningBalancesContainer');
    const rowId = `contractorOpeningBalance_${contractorOpeningBalanceCounter++}`;
    
    const row = document.createElement('div');
    row.className = 'opening-balance-row';
    row.id = rowId;
    row.style.cssText = 'display: grid; grid-template-columns: 2fr 1fr 2fr auto; gap: 0.75rem; align-items: end; padding: 0.75rem; background: #f8fafc; border-radius: 0.5rem; border: 1px solid #e2e8f0;';
    
    // Project column
    const projectCol = document.createElement('div');
    const projectLabel = document.createElement('label');
    projectLabel.className = 'form-label-modern';
    projectLabel.style.fontSize = '0.75rem';
    projectLabel.textContent = 'العميل';
    const projectSelect = document.createElement('select');
    projectSelect.className = 'form-input-modern contractor-opening-balance-project';
    projectSelect.style.padding = '0.5rem 0.75rem';
    projectSelect.style.fontSize = '0.8125rem';
    projectSelect.required = true;
    projectSelect.innerHTML = '<option value="">اختر العميل</option>';
    contractorProjectsList.forEach(project => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.name;
        if (existingData && existingData.project_id === project.id) {
            option.selected = true;
        }
        projectSelect.appendChild(option);
    });
    projectCol.appendChild(projectLabel);
    projectCol.appendChild(projectSelect);
    
    // Amount column
    const amountCol = document.createElement('div');
    const amountLabel = document.createElement('label');
    amountLabel.className = 'form-label-modern';
    amountLabel.style.fontSize = '0.75rem';
    amountLabel.textContent = 'المبلغ';
    const amountInput = document.createElement('input');
    amountInput.type = 'number';
    amountInput.className = 'form-input-modern contractor-opening-balance-amount';
    amountInput.style.padding = '0.5rem 0.75rem';
    amountInput.style.fontSize = '0.8125rem';
    amountInput.placeholder = '0.00';
    amountInput.step = '0.01';
    amountInput.required = true;
    if (existingData) {
        amountInput.value = existingData.amount || 0;
    }
    amountCol.appendChild(amountLabel);
    amountCol.appendChild(amountInput);
    
    // Description column
    const descCol = document.createElement('div');
    const descLabel = document.createElement('label');
    descLabel.className = 'form-label-modern';
    descLabel.style.fontSize = '0.75rem';
    descLabel.textContent = 'الوصف';
    const descInput = document.createElement('input');
    descInput.type = 'text';
    descInput.className = 'form-input-modern contractor-opening-balance-description';
    descInput.style.padding = '0.5rem 0.75rem';
    descInput.style.fontSize = '0.8125rem';
    descInput.placeholder = 'وصف اختياري';
    descInput.maxLength = 500;
    if (existingData && existingData.description) {
        descInput.value = existingData.description;
    }
    descCol.appendChild(descLabel);
    descCol.appendChild(descInput);
    
    // Delete button column
    const deleteCol = document.createElement('div');
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn-modern btn-danger-modern';
    deleteBtn.style.cssText = 'padding: 0.5rem 0.75rem; font-size: 0.875rem;';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.onclick = () => document.getElementById(rowId).remove();
    deleteCol.appendChild(deleteBtn);
    
    row.appendChild(projectCol);
    row.appendChild(amountCol);
    row.appendChild(descCol);
    row.appendChild(deleteCol);
    
    container.appendChild(row);
}

function getContractorOpeningBalances() {
    const container = document.getElementById('contractorOpeningBalancesContainer');
    const rows = container.querySelectorAll('.opening-balance-row');
    const balances = [];
    
    rows.forEach(row => {
        const projectSelect = row.querySelector('.contractor-opening-balance-project');
        const amountInput = row.querySelector('.contractor-opening-balance-amount');
        const descInput = row.querySelector('.contractor-opening-balance-description');
        
        if (projectSelect.value && amountInput.value) {
            balances.push({
                project_id: projectSelect.value,
                amount: parseFloat(amountInput.value) || 0,
                description: descInput.value || ''
            });
        }
    });
    
    return balances;
}

// Edit contractor opening balances
function addEditContractorOpeningBalanceRow(existingData = null) {
    const container = document.getElementById('editContractorOpeningBalancesContainer');
    const rowId = `editContractorOpeningBalance_${editContractorOpeningBalanceCounter++}`;
    
    const row = document.createElement('div');
    row.className = 'opening-balance-row';
    row.id = rowId;
    row.style.cssText = 'display: grid; grid-template-columns: 2fr 1fr 2fr auto; gap: 0.75rem; align-items: end; padding: 0.75rem; background: #f8fafc; border-radius: 0.5rem; border: 1px solid #e2e8f0;';
    if (existingData && existingData.id) {
        row.dataset.balanceId = existingData.id;
    }
    
    // Project column
    const projectCol = document.createElement('div');
    const projectLabel = document.createElement('label');
    projectLabel.className = 'form-label-modern';
    projectLabel.style.fontSize = '0.75rem';
    projectLabel.textContent = 'العميل';
    const projectSelect = document.createElement('select');
    projectSelect.className = 'form-input-modern contractor-opening-balance-project';
    projectSelect.style.padding = '0.5rem 0.75rem';
    projectSelect.style.fontSize = '0.8125rem';
    projectSelect.required = true;
    projectSelect.innerHTML = '<option value="">اختر العميل</option>';
    contractorProjectsList.forEach(project => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.name;
        if (existingData && existingData.project_id === project.id) {
            option.selected = true;
        }
        projectSelect.appendChild(option);
    });
    projectCol.appendChild(projectLabel);
    projectCol.appendChild(projectSelect);
    
    // Amount column
    const amountCol = document.createElement('div');
    const amountLabel = document.createElement('label');
    amountLabel.className = 'form-label-modern';
    amountLabel.style.fontSize = '0.75rem';
    amountLabel.textContent = 'المبلغ';
    const amountInput = document.createElement('input');
    amountInput.type = 'number';
    amountInput.className = 'form-input-modern contractor-opening-balance-amount';
    amountInput.style.padding = '0.5rem 0.75rem';
    amountInput.style.fontSize = '0.8125rem';
    amountInput.placeholder = '0.00';
    amountInput.step = '0.01';
    amountInput.required = true;
    if (existingData) {
        amountInput.value = existingData.amount || 0;
    }
    amountCol.appendChild(amountLabel);
    amountCol.appendChild(amountInput);
    
    // Description column
    const descCol = document.createElement('div');
    const descLabel = document.createElement('label');
    descLabel.className = 'form-label-modern';
    descLabel.style.fontSize = '0.75rem';
    descLabel.textContent = 'الوصف';
    const descInput = document.createElement('input');
    descInput.type = 'text';
    descInput.className = 'form-input-modern contractor-opening-balance-description';
    descInput.style.padding = '0.5rem 0.75rem';
    descInput.style.fontSize = '0.8125rem';
    descInput.placeholder = 'وصف اختياري';
    descInput.maxLength = 500;
    if (existingData && existingData.description) {
        descInput.value = existingData.description;
    }
    descCol.appendChild(descLabel);
    descCol.appendChild(descInput);
    
    // Delete button column
    const deleteCol = document.createElement('div');
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn-modern btn-danger-modern';
    deleteBtn.style.cssText = 'padding: 0.5rem 0.75rem; font-size: 0.875rem;';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.onclick = () => document.getElementById(rowId).remove();
    deleteCol.appendChild(deleteBtn);
    
    row.appendChild(projectCol);
    row.appendChild(amountCol);
    row.appendChild(descCol);
    row.appendChild(deleteCol);
    
    container.appendChild(row);
}

function getEditContractorOpeningBalances() {
    const container = document.getElementById('editContractorOpeningBalancesContainer');
    const rows = container.querySelectorAll('.opening-balance-row');
    const balances = [];
    
    rows.forEach(row => {
        const projectSelect = row.querySelector('.contractor-opening-balance-project');
        const amountInput = row.querySelector('.contractor-opening-balance-amount');
        const descInput = row.querySelector('.contractor-opening-balance-description');
        const balanceId = row.dataset.balanceId;
        
        if (projectSelect.value && amountInput.value) {
            const balance = {
                project_id: projectSelect.value,
                amount: parseFloat(amountInput.value) || 0,
                description: descInput.value || ''
            };
            
            if (balanceId) {
                balance.id = balanceId;
            }
            
            balances.push(balance);
        }
    });
    
    return balances;
}




// Search functionality
let currentContractorSearch = '';

function filterContractors() {
    const searchTerm = currentContractorSearch.toLowerCase().trim();
    
    if (!searchTerm) {
        renderContractors(contractorsData);
        return;
    }
    
    const filtered = contractorsData.filter(contractor => {
        return contractor.name && contractor.name.toLowerCase().includes(searchTerm);
    });
    
    renderContractors(filtered);
}

// Setup search event listeners
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('contractorSearch');
    const searchBtn = document.getElementById('searchBtn');
    const clearBtn = document.getElementById('clearSearchBtn');
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentContractorSearch = e.target.value;
            filterContractors();
        });
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                currentContractorSearch = e.target.value;
                filterContractors();
            }
        });
    }
    
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            currentContractorSearch = searchInput.value;
            filterContractors();
        });
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            currentContractorSearch = '';
            if (searchInput) searchInput.value = '';
            filterContractors();
        });
    }
});
