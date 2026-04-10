// Utilities are loaded via utils/index.js - no need to redefine common functions

// State
let employeeData = null;
let allAttendance = [];
let allPayments = [];
let allAdjustments = [];
let clientsData = []; // For project assignment

// Helpers
function getEmployeeIdFromURL() {
    return getUrlParameter('id');
}

// Render Functions
function renderSummary(totals) {
    const container = document.getElementById('summaryGrid');
    const balance = totals.balance || 0;
    const earnedSalary = totals.total_earned_salary || 0;
    const totalPayments = totals.total_payments || 0;
    const totalAdjustments = totals.total_adjustments || 0;

    // Balance logic for employees: Negative = we owe them (مستحق للموظف), Positive = they owe us (مدفوع زائد)
    let balanceClass, balanceLabel;
    if (earnedSalary === 0) {
        balanceClass = '';
        balanceLabel = 'متوازن';
    } else if (balance > 0) {
        balanceClass = 'text-warning';
        balanceLabel = '(مدفوع زائد)';
    } else if (balance < 0) {
        balanceClass = 'text-danger';
        balanceLabel = '(مستحق للموظف)';
    } else {
        balanceClass = '';
        balanceLabel = 'متوازن';
    }

    container.innerHTML = `
        <div class="summary-item-modern">
            <div class="summary-value-modern ${balanceClass}">${formatCurrency(Math.abs(balance))} <small style="font-size: 0.75rem;">${balanceLabel}</small></div>
            <div class="summary-label-modern">الرصيد الصافي</div>
        </div>
        <div class="summary-item-modern">
            <div class="summary-value-modern text-success">${formatCurrency(earnedSalary)}</div>
            <div class="summary-label-modern">إجمالي الراتب المستحق</div>
        </div>
        <div class="summary-item-modern">
            <div class="summary-value-modern text-danger">${formatCurrency(totalPayments)}</div>
            <div class="summary-label-modern">إجمالي المدفوعات</div>
        </div>
        <div class="summary-item-modern">
            <div class="summary-value-modern ${totalAdjustments >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(Math.abs(totalAdjustments))} <small style="font-size: 0.75rem;">${totalAdjustments >= 0 ? '(إضافة)' : '(خصم)'}</small></div>
            <div class="summary-label-modern">إجمالي التسويات</div>
        </div>
    `;

    // Update additional stats
    document.getElementById('totalWorkedDays').textContent = totals.total_worked_days || 0;
    document.getElementById('attendanceRecordsCount').textContent = totals.attendance_records_count || 0;
}

function renderEmployeeInfo(employee) {
    const container = document.getElementById('employeeInfo');

    // Get assigned projects display text
    let assignedProjectsText = '—';
    if (employee.all_projects) {
        assignedProjectsText = 'جميع المشاريع';
    } else if (employee.assigned_projects && employee.assigned_projects.length > 0) {
        const assignedClientNames = employee.assigned_projects.map(projectId => {
            const client = clientsData.find(c => c.id === projectId);
            return client ? client.name : projectId;
        });
        assignedProjectsText = assignedClientNames.join(', ');
    }

    container.innerHTML = `
        <div class="info-item-modern">
            <span class="info-label-modern">الاسم</span>
            <span class="info-value-modern">${employee.name}</span>
        </div>
        <div class="info-item-modern">
            <span class="info-label-modern">المسمى الوظيفي</span>
            <span class="info-value-modern">${employee.job_title || '—'}</span>
        </div>
        <div class="info-item-modern">
            <span class="info-label-modern">رقم الهاتف</span>
            <span class="info-value-modern">${employee.phone_number || '—'}</span>
        </div>
        <div class="info-item-modern">
            <span class="info-label-modern">الراتب الأساسي</span>
            <span class="info-value-modern">${(employee.basic_salary || employee.base_salary) ? formatCurrency(employee.basic_salary || employee.base_salary) : '—'}</span>
        </div>
        <div class="info-item-modern">
            <span class="info-label-modern">تاريخ بداية العمل</span>
            <span class="info-value-modern">${formatDate(employee.start_working_date)}</span>
        </div>
        <div class="info-item-modern">
            <span class="info-label-modern">تاريخ انتهاء العمل</span>
            <span class="info-value-modern">${formatDate(employee.end_working_date)}</span>
        </div>
        <div class="info-item-modern" style="grid-column: 1 / -1;">
            <span class="info-label-modern">المشاريع المخصصة</span>
            <span class="info-value-modern">${assignedProjectsText}</span>
        </div>
        ${employee.notes ? `
        <div class="info-item-modern" style="grid-column: 1 / -1;">
            <span class="info-label-modern">ملاحظات</span>
            <span class="info-value-modern">${employee.notes}</span>
        </div>
        ` : ''}
    `;
}

function renderAttendance(attendance) {
    const container = document.getElementById('attendanceContainer');

    if (!attendance || attendance.length === 0) {
        container.innerHTML = `
            <div class="empty-state-modern">
                <i class="fas fa-calendar-check"></i>
                <h3>لا توجد سجلات حضور</h3>
                <p>لم يتم تسجيل أي سجلات حضور لهذا الموظف بعد</p>
            </div>
        `;
        return;
    }

    const table = document.createElement('table');
    table.className = 'table-modern';

    // Header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = ['الشهر', 'السنة', 'أيام الشهر', 'أيام العمل', 'أيام الغياب', 'نوع التسجيل', 'ملاحظات', 'إجراءات'];

    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');
    attendance.forEach(record => {
        const row = document.createElement('tr');

        // Extract month and year from period_start
        const startDate = new Date(record.period_start);
        const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        const monthName = monthNames[startDate.getMonth()];
        const year = startDate.getFullYear();
        
        // Calculate absence days correctly
        const periodDays = record.period_days || 0;
        const workedDays = record.worked_days || 0;
        const absenceDays = periodDays - workedDays;

        const cells = [
            monthName,
            year,
            periodDays,
            workedDays,
            absenceDays,
            record.record_type === 'attendance' ? 'حضور' : 'غياب',
            record.notes || '—'
        ];

        cells.forEach(cellText => {
            const td = document.createElement('td');
            td.textContent = cellText;
            row.appendChild(td);
        });

        // Actions cell
        const actionsCell = document.createElement('td');
        actionsCell.innerHTML = `
            <div class="action-btn-group">
                <button class="action-btn-modern edit crud-btn" data-action="edit" data-type="attendance" data-id="${record.id}" title="تعديل">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn-modern danger crud-btn" data-action="delete" data-type="attendance" data-id="${record.id}" title="حذف">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        row.appendChild(actionsCell);

        tbody.appendChild(row);
    });
    table.appendChild(tbody);

    container.innerHTML = '';
    container.appendChild(table);
}

function renderPayments(payments) {
    const container = document.getElementById('paymentsContainer');

    if (!payments || payments.length === 0) {
        container.innerHTML = `
            <div class="empty-state-modern">
                <i class="fas fa-money-bill-wave"></i>
                <h3>لا توجد مدفوعات مسجلة</h3>
                <p>لم يتم تسجيل أي مدفوعات لهذا الموظف بعد</p>
            </div>
        `;
        return;
    }

    const table = document.createElement('table');
    table.className = 'table-modern';

    // Header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = ['التاريخ', 'المبلغ', 'الطريقة', 'التفاصيل', 'إجراءات'];

    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');
    payments.forEach(payment => {
        const row = document.createElement('tr');

        // Date
        const dateCell = document.createElement('td');
        dateCell.textContent = formatDate(payment.paid_at);
        row.appendChild(dateCell);

        // Amount
        const amountCell = document.createElement('td');
        amountCell.textContent = formatCurrency(payment.amount);
        amountCell.style.fontWeight = '600';
        amountCell.style.color = 'var(--tertiary)';
        row.appendChild(amountCell);

        // Method
        const methodCell = document.createElement('td');
        methodCell.textContent = payment.method || '—';
        row.appendChild(methodCell);

        // Details (combined details and note)
        const detailsCell = document.createElement('td');
        detailsCell.textContent = payment.details || payment.note || '—';
        detailsCell.title = payment.details || payment.note || '—';
        row.appendChild(detailsCell);

        // Actions cell
        const actionsCell = document.createElement('td');
        actionsCell.innerHTML = `
            <div class="action-btn-group">
                ${payment.payment_image_url ? `<button class="action-btn-modern view" onclick="showImageModal('${payment.payment_image_url}')" title="عرض الصورة">
                    <i class="fas fa-image"></i>
                </button>` : ''}
                <button class="action-btn-modern edit crud-btn" data-action="edit" data-type="payment" data-id="${payment.id}" title="تعديل">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn-modern danger crud-btn" data-action="delete" data-type="payment" data-id="${payment.id}" title="حذف">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        row.appendChild(actionsCell);

        tbody.appendChild(row);
    });
    table.appendChild(tbody);

    container.innerHTML = '';
    container.appendChild(table);
}

function renderAdjustments(adjustments) {
    const container = document.getElementById('adjustmentsContainer');

    if (!adjustments || adjustments.length === 0) {
        container.innerHTML = `
            <div class="empty-state-modern">
                <i class="fas fa-balance-scale"></i>
                <h3>لا توجد تسويات مسجلة</h3>
                <p>لم يتم تسجيل أي تسويات لهذا الموظف بعد</p>
            </div>
        `;
        return;
    }

    const table = document.createElement('table');
    table.className = 'table-modern';

    // Header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = ['التاريخ', 'المبلغ', 'النوع', 'السبب', 'إجراءات'];

    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');
    adjustments.forEach(adjustment => {
        const row = document.createElement('tr');

        // Date
        const dateCell = document.createElement('td');
        dateCell.textContent = formatDateTime(adjustment.created_at);
        row.appendChild(dateCell);

        // Amount
        const amountCell = document.createElement('td');
        const amount = parseFloat(adjustment.amount) || 0;
        const displayAmount = Math.abs(amount);
        amountCell.textContent = formatCurrency(displayAmount);
        amountCell.style.fontWeight = '600';
        row.appendChild(amountCell);

        // Type
        const typeCell = document.createElement('td');
        const isPositive = amount >= 0;
        typeCell.className = isPositive ? 'text-success' : 'text-danger';
        typeCell.textContent = isPositive ? 'إضافة' : 'خصم';
        typeCell.style.fontWeight = '600';
        row.appendChild(typeCell);

        // Reason
        const reasonCell = document.createElement('td');
        reasonCell.textContent = adjustment.reason || '—';
        reasonCell.title = adjustment.reason || '—';
        row.appendChild(reasonCell);

        // Actions cell
        const actionsCell = document.createElement('td');
        actionsCell.innerHTML = `
            <div class="action-btn-group">
                <button class="action-btn-modern edit crud-btn" data-action="edit" data-type="adjustment" data-id="${adjustment.id}" title="تعديل">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn-modern danger crud-btn" data-action="delete" data-type="adjustment" data-id="${adjustment.id}" title="حذف">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        row.appendChild(actionsCell);

        tbody.appendChild(row);
    });
    table.appendChild(tbody);

    container.innerHTML = '';
    container.appendChild(table);
}

// Load Data
async function loadEmployeeDetails() {
    const employeeId = getEmployeeIdFromURL();

    if (!employeeId) {
        Swal.fire({
            icon: 'error',
            title: 'خطأ',
            text: 'معرف الموظف غير موجود'
        }).then(() => {
            window.location.href = 'employees.html';
        });
        return;
    }

    try {
        const data = await apiGet(`/employees/${employeeId}`);
        employeeData = data.employee;
        allAttendance = data.attendance || [];
        allPayments = data.payments || [];
        allAdjustments = data.adjustments || [];

        // Update page title
        document.getElementById('employeeName').innerHTML = `<i class="fas fa-user-tie"></i> تفاصيل الموظف: ${employeeData.name}`;

        // Render all sections
        renderSummary(data.totals);
        renderEmployeeInfo(employeeData);
        renderAttendance(allAttendance);
        renderPayments(allPayments);
        renderAdjustments(allAdjustments);

    } catch (error) {
        console.error('Error loading employee details:', error);
        Swal.fire({
            icon: 'error',
            title: 'خطأ',
            text: 'تعذر تحميل بيانات الموظف'
        });
    }
}

async function loadClients() {
    try {
        const data = await apiGet('/clients');
        clientsData = data.clients || data.data || [];
        populateProjectsList();
    } catch (error) {
        console.error('Error loading clients:', error);
    }
}

function populateProjectsList() {
    const projectsList = document.getElementById('editProjectsList');
    if (!projectsList) return;

    projectsList.innerHTML = '';

    clientsData.forEach(client => {
        const label = document.createElement('label');
        label.style.display = 'flex';
        label.style.alignItems = 'center';
        label.style.gap = '0.5rem';
        label.style.cursor = 'pointer';
        label.style.padding = '0.5rem';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = 'assigned_projects';
        checkbox.value = client.id;

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(client.name));
        projectsList.appendChild(label);
    });
}

// CRUD Functions - Attendance
async function editAttendance(attendanceId) {
    try {
        const attendance = allAttendance.find(a => a.id === attendanceId);
        if (!attendance) {
            showAlert('لم يتم العثور على سجل الحضور');
            return;
        }

        // Extract month and year
        const startDate = new Date(attendance.period_start);
        const month = startDate.getMonth() + 1;
        const year = startDate.getFullYear();

        // Populate form
        document.getElementById('attendanceMonth').value = month;
        document.getElementById('attendanceYear').value = year;
        document.getElementById('attendanceNotes').value = attendance.notes || '';

        // Set record type and show appropriate field
        if (attendance.record_type === 'absence') {
            document.getElementById('recordTypeAbsence').checked = true;
            document.getElementById('absenceDaysGroup').style.display = 'block';
            document.getElementById('attendanceDaysGroup').style.display = 'none';
            document.getElementById('absenceDays').value = attendance.period_days - attendance.worked_days;
            document.getElementById('absenceDays').required = true;
            document.getElementById('attendanceDays').required = false;
        } else {
            document.getElementById('recordTypeAttendance').checked = true;
            document.getElementById('attendanceDaysGroup').style.display = 'block';
            document.getElementById('absenceDaysGroup').style.display = 'none';
            document.getElementById('attendanceDays').value = attendance.worked_days;
            document.getElementById('attendanceDays').required = true;
            document.getElementById('absenceDays').required = false;
        }

        // Store attendance ID for update
        const form = document.getElementById('attendanceForm');
        form.dataset.editId = attendanceId;

        showModal('attendanceModal');
    } catch (error) {
        console.error('Error editing attendance:', error);
        showAlert('حدث خطأ في تحميل بيانات الحضور');
    }
}

async function deleteAttendance(attendanceId) {
    const confirmed = await showConfirmDialog(
        'تأكيد الحذف',
        'هل أنت متأكد من حذف سجل الحضور؟',
        'نعم، احذف',
        'إلغاء'
    );

    if (!confirmed) return;

    try {
        const employeeId = getEmployeeIdFromURL();
        await apiDelete(`/employees/${employeeId}/attendance/${attendanceId}`);
        showAlert('تم حذف سجل الحضور بنجاح');
        loadEmployeeDetails();
    } catch (error) {
        console.error('Error deleting attendance:', error);
        showAlert('حدث خطأ في حذف سجل الحضور');
    }
}

// CRUD Functions - Payments
async function editPayment(paymentId) {
    try {
        const payment = allPayments.find(p => p.id === paymentId);
        if (!payment) {
            showAlert('لم يتم العثور على الدفعة');
            return;
        }

        // Populate form
        document.getElementById('paymentAmount').value = payment.amount;
        document.getElementById('paymentMethod').value = payment.method || '';
        document.getElementById('paymentDetails').value = payment.details || '';
        document.getElementById('paymentNote').value = payment.note || '';
        document.getElementById('paidAt').value = payment.paid_at ? payment.paid_at.split('T')[0] : '';

        // Show/hide details field based on method
        const detailsGroup = document.getElementById('paymentDetailsGroup');
        const imageGroup = document.getElementById('paymentImageGroup');
        if (['بنكي', 'شيك', 'انستاباي', 'فودافون كاش'].includes(payment.method)) {
            detailsGroup.style.display = 'block';
            imageGroup.style.display = 'block';
        }

        // Store payment ID for update
        const form = document.getElementById('paymentForm');
        form.dataset.editId = paymentId;

        showModal('paymentModal');
    } catch (error) {
        console.error('Error editing payment:', error);
        showAlert('حدث خطأ في تحميل بيانات الدفعة');
    }
}

async function deletePayment(paymentId) {
    const confirmed = await showConfirmDialog(
        'تأكيد الحذف',
        'هل أنت متأكد من حذف الدفعة؟',
        'نعم، احذف',
        'إلغاء'
    );

    if (!confirmed) return;

    try {
        const employeeId = getEmployeeIdFromURL();
        await apiDelete(`/employees/${employeeId}/payments/${paymentId}`);
        showAlert('تم حذف الدفعة بنجاح');
        loadEmployeeDetails();
    } catch (error) {
        console.error('Error deleting payment:', error);
        showAlert('حدث خطأ في حذف الدفعة');
    }
}

// CRUD Functions - Adjustments
async function editAdjustment(adjustmentId) {
    try {
        const adjustment = allAdjustments.find(a => a.id === adjustmentId);
        if (!adjustment) {
            showAlert('لم يتم العثور على التسوية');
            return;
        }

        // Populate form
        document.getElementById('adjustmentAmount').value = adjustment.amount;
        document.getElementById('adjustmentReason').value = adjustment.reason || '';

        // Store adjustment ID for update
        const form = document.getElementById('adjustmentForm');
        form.dataset.editId = adjustmentId;

        showModal('adjustmentModal');
    } catch (error) {
        console.error('Error editing adjustment:', error);
        showAlert('حدث خطأ في تحميل بيانات التسوية');
    }
}

async function deleteAdjustment(adjustmentId) {
    const confirmed = await showConfirmDialog(
        'تأكيد الحذف',
        'هل أنت متأكد من حذف التسوية؟',
        'نعم، احذف',
        'إلغاء'
    );

    if (!confirmed) return;

    try {
        const employeeId = getEmployeeIdFromURL();
        await apiDelete(`/employees/${employeeId}/adjustments/${adjustmentId}`);
        showAlert('تم حذف التسوية بنجاح');
        loadEmployeeDetails();
    } catch (error) {
        console.error('Error deleting adjustment:', error);
        showAlert('حدث خطأ في حذف التسوية');
    }
}

// Form Submissions
async function handleAttendanceSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);
    const attendanceData = Object.fromEntries(formData.entries());

    const month = parseInt(attendanceData.month);
    const year = parseInt(attendanceData.year);

    if (!month || !year) {
        showMessage('attendanceMessage', 'يجب اختيار الشهر والسنة', 'error');
        return;
    }

    // Calculate period dates
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0);
    const periodDays = periodEnd.getDate();

    // Validate days
    const recordType = attendanceData.record_type;
    const daysValue = recordType === 'attendance' ?
        parseInt(attendanceData.attendance_days) :
        parseInt(attendanceData.absence_days);

    if (daysValue > periodDays) {
        showMessage('attendanceMessage', `عدد الأيام (${daysValue}) لا يمكن أن يتجاوز أيام الشهر (${periodDays})`, 'error');
        return;
    }

    // Prepare data for API
    const apiData = {
        period_start: periodStart.toISOString().split('T')[0],
        period_end: periodEnd.toISOString().split('T')[0],
        record_type: recordType,
        notes: attendanceData.notes
    };

    if (recordType === 'attendance') {
        apiData.attendance_days = parseInt(attendanceData.attendance_days);
    } else {
        apiData.absence_days = parseInt(attendanceData.absence_days);
    }

    const editId = form.dataset.editId;
    const employeeId = getEmployeeIdFromURL();

    try {
        if (editId) {
            await apiPut(`/employees/${employeeId}/attendance/${editId}`, apiData);
            showMessage('attendanceMessage', 'تم تحديث سجل الحضور بنجاح', 'success');
        } else {
            await apiPost(`/employees/${employeeId}/attendance`, apiData);
            showMessage('attendanceMessage', 'تم إضافة سجل الحضور بنجاح', 'success');
        }

        setTimeout(() => {
            closeModal('attendanceModal');
            loadEmployeeDetails();
        }, 1000);
    } catch (error) {
        console.error('Error saving attendance:', error);
        showMessage('attendanceMessage', error.message || 'تعذر حفظ سجل الحضور', 'error');
    }
}

async function handlePaymentSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const amount = document.getElementById('paymentAmount').value;
    const paid_at = document.getElementById('paidAt').value;
    const note = document.getElementById('paymentNote').value;
    const method = document.getElementById('paymentMethod').value;
    const details = document.getElementById('paymentDetails').value;

    const paymentData = { amount, paid_at, note, method };
    if (details) paymentData.details = details;

    // Handle image upload
    const imageFile = document.getElementById('paymentImage').files[0];
    if (imageFile) {
        if (imageFile.size > 5 * 1024 * 1024) {
            showMessage('paymentMessage', 'حجم الصورة كبير جداً (الحد الأقصى 5 ميجابايت)', 'error');
            return;
        }

        if (!imageFile.type.startsWith('image/')) {
            showMessage('paymentMessage', 'يرجى اختيار ملف صورة صالح', 'error');
            return;
        }

        try {
            const payment_image = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = () => reject(new Error('فشل في قراءة الصورة'));
                reader.readAsDataURL(imageFile);
            });
            paymentData.payment_image = payment_image;
        } catch (error) {
            showMessage('paymentMessage', 'خطأ في قراءة الصورة: ' + error.message, 'error');
            return;
        }
    }

    const editId = form.dataset.editId;
    const employeeId = getEmployeeIdFromURL();

    try {
        if (editId) {
            await apiPut(`/employees/${employeeId}/payments/${editId}`, paymentData);
            showMessage('paymentMessage', 'تم تحديث الدفعة بنجاح', 'success');
        } else {
            await apiPost(`/employees/${employeeId}/payments`, paymentData);
            showMessage('paymentMessage', 'تم إضافة الدفعة بنجاح', 'success');
        }

        setTimeout(() => {
            closeModal('paymentModal');
            loadEmployeeDetails();
        }, 1000);
    } catch (error) {
        console.error('Error saving payment:', error);
        showMessage('paymentMessage', error.message || 'تعذر حفظ الدفعة', 'error');
    }
}

async function handleAdjustmentSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const type = document.getElementById('adjustmentType').value;
    const amountValue = parseFloat(document.getElementById('adjustmentAmount').value) || 0;
    const reason = document.getElementById('adjustmentReason').value;

    // Convert type to positive/negative amount
    const amount = type === 'addition' ? amountValue : -amountValue;

    const adjustmentData = { amount, reason };

    const editId = form.dataset.editId;
    const employeeId = getEmployeeIdFromURL();

    try {
        if (editId) {
            await apiPut(`/employees/${employeeId}/adjustments/${editId}`, adjustmentData);
            showMessage('adjustmentMessage', 'تم تحديث التسوية بنجاح', 'success');
        } else {
            await apiPost(`/employees/${employeeId}/adjustments`, adjustmentData);
            showMessage('adjustmentMessage', 'تم إضافة التسوية بنجاح', 'success');
        }

        setTimeout(() => {
            closeModal('adjustmentModal');
            loadEmployeeDetails();
        }, 1000);
    } catch (error) {
        console.error('Error saving adjustment:', error);
        showMessage('adjustmentMessage', error.message || 'تعذر حفظ التسوية', 'error');
    }
}

async function handleEditEmployeeSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);
    const employeeData = Object.fromEntries(formData.entries());

    // Handle project assignment
    const allProjectsChecked = document.getElementById('editAllProjects').checked;
    if (allProjectsChecked) {
        employeeData.all_projects = true;
        employeeData.assigned_projects = [];
    } else {
        employeeData.all_projects = false;
        const checkedProjects = Array.from(document.querySelectorAll('#editProjectsList input[name="assigned_projects"]:checked'))
            .map(cb => cb.value);
        employeeData.assigned_projects = checkedProjects;
    }

    // Convert empty strings to null
    Object.keys(employeeData).forEach(key => {
        if (employeeData[key] === '' && key !== 'assigned_projects') {
            employeeData[key] = null;
        }
    });

    const employeeId = getEmployeeIdFromURL();

    try {
        await apiPut(`/employees/${employeeId}`, employeeData);
        showMessage('editEmployeeMessage', 'تم تحديث معلومات الموظف بنجاح', 'success');

        setTimeout(() => {
            closeModal('editEmployeeModal');
            loadEmployeeDetails();
        }, 1000);
    } catch (error) {
        console.error('Error updating employee:', error);
        showMessage('editEmployeeMessage', error.message || 'تعذر تحديث معلومات الموظف', 'error');
    }
}

// Edit Employee Modal
function openEditEmployeeModal() {
    if (!employeeData) return;

    // Fill form
    document.getElementById('editEmployeeName').value = employeeData.name || '';
    document.getElementById('editJobTitle').value = employeeData.job_title || '';
    document.getElementById('editPhoneNumber').value = employeeData.phone_number || '';
    document.getElementById('editBasicSalary').value = employeeData.basic_salary || employeeData.base_salary || '';
    document.getElementById('editStartWorkingDate').value = employeeData.start_working_date ? employeeData.start_working_date.split('T')[0] : '';
    document.getElementById('editStatus').value = employeeData.status || 'Active';
    document.getElementById('editNotes').value = employeeData.notes || '';

    // Handle project assignment
    const allProjectsCheckbox = document.getElementById('editAllProjects');
    const projectsList = document.getElementById('editProjectsList');

    if (employeeData.all_projects) {
        allProjectsCheckbox.checked = true;
        projectsList.style.display = 'none';
    } else {
        allProjectsCheckbox.checked = false;
        projectsList.style.display = 'block';

        // Clear and check assigned projects
        const projectCheckboxes = projectsList.querySelectorAll('input[name="assigned_projects"]');
        projectCheckboxes.forEach(cb => cb.checked = false);

        if (employeeData.assigned_projects && Array.isArray(employeeData.assigned_projects)) {
            employeeData.assigned_projects.forEach(projectId => {
                const checkbox = projectsList.querySelector(`input[value="${projectId}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }
    }

    showModal('editEmployeeModal');
}

// Filter Functions
function clearPaymentsFilters() {
    document.getElementById('paymentsSearch').value = '';
    document.getElementById('paymentsDateFrom').value = '';
    document.getElementById('paymentsDateTo').value = '';
    document.getElementById('paymentsSort').value = 'date-desc';
    renderPayments(allPayments);
}

function clearAdjustmentsFilters() {
    document.getElementById('adjustmentsSearch').value = '';
    document.getElementById('adjustmentsDateFrom').value = '';
    document.getElementById('adjustmentsDateTo').value = '';
    document.getElementById('adjustmentsSort').value = 'date-desc';
    renderAdjustments(allAdjustments);
}

// Toggle date range
function toggleDateRange() {
    const checkbox = document.getElementById('useCustomDateRange');
    const dateInputs = document.getElementById('dateRangeInputs');
    dateInputs.style.display = checkbox.checked ? 'block' : 'none';
}

// Generate account statement
function generateAccountStatement() {
    const useCustomRange = document.getElementById('useCustomDateRange').checked;
    const employeeId = getEmployeeIdFromURL();
    let url = `/api/employees/${employeeId}/reports/statement`;

    if (useCustomRange) {
        const fromDate = document.getElementById('statementFromDate').value;
        const toDate = document.getElementById('statementToDate').value;

        if (!fromDate || !toDate) {
            Swal.fire({
                icon: 'warning',
                title: 'تنبيه',
                text: 'يرجى تحديد تاريخ البداية والنهاية'
            });
            return;
        }

        url += `?from=${fromDate}&to=${toDate}`;
    }

    window.open(url, '_blank');
}

// Show image modal
function showImageModal(imageUrl) {
    document.getElementById('modalImage').src = imageUrl;
    showModal('imageModal');
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function () {
    // Check authentication
    if (!authManager.checkAuth()) {
        return;
    }

    // Wait for utilities to load
    const checkUtilities = setInterval(() => {
        if (typeof apiGet !== 'undefined') {
            clearInterval(checkUtilities);
            loadEmployeeDetails();
            loadClients();
        }
    }, 100);

    // Radio button logic for attendance modal
    const recordTypeRadios = document.querySelectorAll('input[name="record_type"]');
    recordTypeRadios.forEach(radio => {
        radio.addEventListener('change', function () {
            const attendanceDaysGroup = document.getElementById('attendanceDaysGroup');
            const absenceDaysGroup = document.getElementById('absenceDaysGroup');
            const attendanceDaysInput = document.getElementById('attendanceDays');
            const absenceDaysInput = document.getElementById('absenceDays');

            if (this.value === 'attendance') {
                attendanceDaysGroup.style.display = 'block';
                absenceDaysGroup.style.display = 'none';
                attendanceDaysInput.required = true;
                absenceDaysInput.required = false;
                absenceDaysInput.value = '';
            } else if (this.value === 'absence') {
                attendanceDaysGroup.style.display = 'none';
                absenceDaysGroup.style.display = 'block';
                attendanceDaysInput.required = false;
                absenceDaysInput.required = true;
                attendanceDaysInput.value = '';
            }
        });
    });

    // Modal buttons
    document.getElementById('addAttendanceBtn').addEventListener('click', () => {
        document.getElementById('attendanceYear').value = new Date().getFullYear();
        showModal('attendanceModal');
    });

    document.getElementById('addPaymentBtn').addEventListener('click', () => {
        document.getElementById('paidAt').value = new Date().toISOString().split('T')[0];
        showModal('paymentModal');
    });

    document.getElementById('addAdjustmentBtn').addEventListener('click', () => {
        showModal('adjustmentModal');
    });

    document.getElementById('editEmployeeBtn').addEventListener('click', openEditEmployeeModal);

    // Payment method change handler
    document.getElementById('paymentMethod').addEventListener('change', (e) => {
        const detailsGroup = document.getElementById('paymentDetailsGroup');
        const imageGroup = document.getElementById('paymentImageGroup');
        const detailsInput = document.getElementById('paymentDetails');

        if (['بنكي', 'شيك', 'انستاباي', 'فودافون كاش'].includes(e.target.value)) {
            detailsGroup.style.display = 'block';
            imageGroup.style.display = 'block';
            detailsInput.required = true;
        } else {
            detailsGroup.style.display = 'none';
            imageGroup.style.display = 'none';
            detailsInput.required = false;
        }
    });

    // Form submissions
    document.getElementById('attendanceForm').addEventListener('submit', handleAttendanceSubmit);
    document.getElementById('paymentForm').addEventListener('submit', handlePaymentSubmit);
    document.getElementById('adjustmentForm').addEventListener('submit', handleAdjustmentSubmit);
    document.getElementById('editEmployeeForm').addEventListener('submit', handleEditEmployeeSubmit);

    // All projects checkbox toggle
    document.getElementById('editAllProjects').addEventListener('change', function () {
        const projectsList = document.getElementById('editProjectsList');
        if (this.checked) {
            projectsList.style.display = 'none';
            const projectCheckboxes = projectsList.querySelectorAll('input[name="assigned_projects"]');
            projectCheckboxes.forEach(cb => cb.checked = false);
        } else {
            projectsList.style.display = 'block';
        }
    });

    // Account statement button
    document.getElementById('generateAccountStatementBtn').addEventListener('click', generateAccountStatement);

    // Close modals when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
});
