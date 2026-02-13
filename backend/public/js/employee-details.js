// Utilities are loaded via utils/index.js - no need to redefine common functions

// Utilities are loaded via utils/index.js - no need to redefine common functions

// Global variables
let currentEmployeeId = null;
let currentEmployee = null;
let clientsData = []; // For project assignment (clients = projects)

// --- Tab Management --- (REMOVED - using sections instead)

// --- Employee Data Loading ---

async function loadEmployeeDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    currentEmployeeId = urlParams.get('id');

    if (!currentEmployeeId) {
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
        const data = await apiGet(`/employees/${currentEmployeeId}`);
        currentEmployee = data.employee;

        displayEmployeeInfo(data.employee);
        displayFinancialSummary(data.totals);
        displayAttendance(data.attendance);
        displayAdjustments(data.adjustments);
        displayPayments(data.payments);

    } catch (error) {
        console.error('Error loading employee details:', error);
        Swal.fire({
            icon: 'error',
            title: 'خطأ',
            text: 'تعذر تحميل بيانات الموظف'
        });
    }
}

function displayEmployeeInfo(employee) {
    document.getElementById('employeeName').textContent = `تفاصيل الموظف: ${employee.name}`;

    // Get assigned projects display text
    let assignedProjectsText = '—';
    if (employee.all_projects) {
        assignedProjectsText = 'جميع المشاريع';
    } else if (employee.assigned_projects && employee.assigned_projects.length > 0) {
        // Find client names for assigned project IDs
        const assignedClientNames = employee.assigned_projects.map(projectId => {
            const client = clientsData.find(c => c.id === projectId);
            return client ? client.name : projectId;
        });
        assignedProjectsText = assignedClientNames.join(', ');
    }

    const infoContainer = document.getElementById('employeeInfo');
    infoContainer.innerHTML = `
        <div class="info-item">
            <span class="info-label">الاسم:</span>
            <span class="info-value">${employee.name}</span>
        </div>
        <div class="info-item">
            <span class="info-label">المسمى الوظيفي:</span>
            <span class="info-value">${employee.job_title || '—'}</span>
        </div>
        <div class="info-item">
            <span class="info-label">رقم الهاتف:</span>
            <span class="info-value">${employee.phone_number || '—'}</span>
        </div>
        <div class="info-item">
            <span class="info-label">الراتب الأساسي:</span>
            <span class="info-value">${(employee.basic_salary || employee.base_salary) ? formatCurrency(employee.basic_salary || employee.base_salary) : '—'}</span>
        </div>
        <div class="info-item">
            <span class="info-label">تاريخ بداية العمل:</span>
            <span class="info-value">${formatDate(employee.start_working_date)}</span>
        </div>
        <div class="info-item">
            <span class="info-label">تاريخ انتهاء العمل:</span>
            <span class="info-value">${formatDate(employee.end_working_date)}</span>
        </div>
        <div class="info-item">
            <span class="info-label">الحالة:</span>
            <span class="info-value status-${employee.status.toLowerCase()}">${employee.status === 'Active' ? 'نشط' : 'غير نشط'}</span>
        </div>
        <div class="info-item">
            <span class="info-label">المشاريع المخصصة:</span>
            <span class="info-value">${assignedProjectsText}</span>
        </div>
        ${employee.notes ? `
        <div class="info-item full-width">
            <span class="info-label">ملاحظات:</span>
            <span class="info-value">${employee.notes}</span>
        </div>
        ` : ''}
    `;
}

function displayFinancialSummary(totals) {
    const summaryContainer = document.getElementById('financialSummary');
    const balance = totals.balance || 0;
    const earnedSalary = totals.total_earned_salary || 0;
    const totalPayments = totals.total_payments || 0;
    const totalAdjustments = totals.total_adjustments || 0;
    const totalWorkedDays = totals.total_worked_days || 0;
    const attendanceRecordsCount = totals.attendance_records_count || 0;

    // Always show the actual data, but handle balance display based on earned salary
    let balanceDisplay, balanceLabel;

    if (earnedSalary === 0) {
        // When no earned salary, show neutral balance
        balanceDisplay = formatCurrency(0);
        balanceLabel = 'متوازن';
    } else {
        // Normal balance calculation
        if (balance > 0) {
            balanceDisplay = formatCurrency(Math.abs(balance));
            balanceLabel = 'مدفوع زائد';
        } else if (balance < 0) {
            balanceDisplay = formatCurrency(Math.abs(balance));
            balanceLabel = 'مستحق للموظف';
        } else {
            balanceDisplay = formatCurrency(0);
            balanceLabel = 'متوازن';
        }
    }

    summaryContainer.innerHTML = `
        <div class="summary-item">
            <div class="summary-value" style="color: ${balance > 0 ? '#fbbf24' : balance < 0 ? '#ef4444' : 'white'} !important;">
                ${balanceDisplay}
            </div>
            <div class="summary-label">${balanceLabel}</div>
        </div>
        <div class="summary-item">
            <div class="summary-value">${formatCurrency(earnedSalary)}</div>
            <div class="summary-label">إجمالي الراتب المستحق</div>
        </div>
        <div class="summary-item">
            <div class="summary-value">${formatCurrency(totalPayments)}</div>
            <div class="summary-label">إجمالي المدفوعات</div>
        </div>
        <div class="summary-item">
            <div class="summary-value" style="color: ${totalAdjustments >= 0 ? '#10b981' : '#ef4444'} !important;">
                ${formatCurrency(totalAdjustments)}
            </div>
            <div class="summary-label">إجمالي التسويات</div>
        </div>
        <div class="summary-item">
            <div class="summary-value">${totalWorkedDays}</div>
            <div class="summary-label">أيام العمل</div>
        </div>
        <div class="summary-item">
            <div class="summary-value">${attendanceRecordsCount}</div>
            <div class="summary-label">سجلات الحضور</div>
        </div>
    `;
}

function displayAttendance(attendance) {
    const tbody = document.getElementById('attendanceTableBody');

    if (!attendance || attendance.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">لا توجد سجلات حضور</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = attendance.map(record => {
        // Extract month and year from period_start
        const startDate = new Date(record.period_start);
        const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        const monthName = monthNames[startDate.getMonth()];
        const year = startDate.getFullYear();
        const absenceDays = record.period_days - record.worked_days;

        return `
            <tr>
                <td>${monthName}</td>
                <td>${year}</td>
                <td>${record.period_days || 0}</td>
                <td>${record.worked_days || 0}</td>
                <td>${absenceDays}</td>
                <td>${record.record_type === 'attendance' ? 'حضور' : 'غياب'}</td>
                <td>${record.notes || '—'}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="editAttendance('${record.id}')">تعديل</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteAttendance('${record.id}')">حذف</button>
                </td>
            </tr>
        `;
    }).join('');
}

function displayAdjustments(adjustments) {
    const tbody = document.getElementById('adjustmentsTableBody');

    if (!adjustments || adjustments.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">لا توجد تسويات</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = adjustments.map(adjustment => {
        const amount = parseFloat(adjustment.amount) || 0;
        const isPositive = amount >= 0;
        const displayAmount = Math.abs(amount);
        const amountClass = isPositive ? 'amount-positive' : 'amount-negative';
        const amountLabel = isPositive ? '(إضافة)' : '(خصم)';

        return `
            <tr>
                <td class="${amountClass}">
                    ${formatCurrency(displayAmount)}
                    ${amountLabel}
                </td>
                <td>${adjustment.method || '—'}</td>
                <td>${adjustment.details || '—'}</td>
                <td>${adjustment.reason || '—'}</td>
                <td>${formatDateTime(adjustment.created_at)}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="editAdjustment('${adjustment.id}')">تعديل</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteAdjustment('${adjustment.id}')">حذف</button>
                </td>
            </tr>
        `;
    }).join('');
}

function displayPayments(payments) {
    const tbody = document.getElementById('paymentsTableBody');

    if (!payments || payments.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">لا توجد مدفوعات</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = payments.map(payment => `
        <tr>
            <td>${formatCurrency(payment.amount)}</td>
            <td>${payment.method || '—'}</td>
            <td>${payment.details || '—'}</td>
            <td>${payment.note || '—'}</td>
            <td>${formatDate(payment.paid_at)}</td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="editPayment('${payment.id}')">تعديل</button>
                <button class="btn btn-sm btn-danger" onclick="deletePayment('${payment.id}')">حذف</button>
                ${payment.payment_image ? `<button class="btn btn-sm btn-info" onclick="viewPaymentImage('${payment.payment_image}')">عرض الصورة</button>` : ''}
            </td>
        </tr>
    `).join('');
}

// --- Modal Management ---

function closeAttendanceModal() {
    document.getElementById('attendanceModal').style.display = 'none';
    document.getElementById('attendanceForm').reset();
    delete document.getElementById('attendanceForm').dataset.attendanceId;
    document.getElementById('attendanceModalTitle').textContent = 'إضافة سجل شهري';

    // Reset radio selection and hide input groups
    document.getElementById('attendanceDaysGroup').style.display = 'none';
    document.getElementById('absenceDaysGroup').style.display = 'none';
    document.getElementById('attendanceDays').required = false;
    document.getElementById('absenceDays').required = false;

    // Set default year to current year
    document.getElementById('attendanceYear').value = new Date().getFullYear();
}

function closeAdjustmentModal() {
    document.getElementById('adjustmentModal').style.display = 'none';
    document.getElementById('adjustmentForm').reset();
    delete document.getElementById('adjustmentForm').dataset.adjustmentId;
    document.getElementById('adjustmentModalTitle').textContent = 'إضافة تسوية';
}

function closePaymentModal() {
    document.getElementById('paymentModal').style.display = 'none';
    document.getElementById('paymentForm').reset();
    delete document.getElementById('paymentForm').dataset.paymentId;
    document.getElementById('paymentModalTitle').textContent = 'إضافة دفعة';
}

// --- CRUD Operations ---

// Attendance CRUD
async function handleAttendanceSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const attendanceData = Object.fromEntries(formData.entries());

    // Convert month/year to period dates
    const month = parseInt(attendanceData.month);
    const year = parseInt(attendanceData.year);

    if (!month || !year) {
        Swal.fire({
            icon: 'error',
            title: 'خطأ في البيانات',
            text: 'يجب اختيار الشهر والسنة'
        });
        return;
    }

    // Calculate first and last day of the month
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0); // Last day of the month
    const periodDays = periodEnd.getDate();

    // Validate days don't exceed month days
    const recordType = attendanceData.record_type;
    const daysValue = recordType === 'attendance' ?
        parseInt(attendanceData.attendance_days) :
        parseInt(attendanceData.absence_days);

    if (daysValue > periodDays) {
        Swal.fire({
            icon: 'error',
            title: 'خطأ في الأيام',
            text: `عدد الأيام (${daysValue}) لا يمكن أن يتجاوز أيام الشهر (${periodDays})`
        });
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

    const attendanceId = form.dataset.attendanceId;
    const isEdit = !!attendanceId;

    try {
        const url = isEdit
            ? `/employees/${currentEmployeeId}/attendance/${attendanceId}`
            : `/employees/${currentEmployeeId}/attendance`;
        const method = isEdit ? 'PUT' : 'POST';

        if (isEdit) {
            await apiPut(url, apiData);
        } else {
            await apiPost(url, apiData);
        }

        await Swal.fire({
            icon: 'success',
            title: 'تم الحفظ',
            text: isEdit ? 'تم تحديث سجل الحضور بنجاح' : 'تم إضافة سجل الحضور بنجاح'
        });

        closeAttendanceModal();
        loadEmployeeDetails();
    } catch (error) {
        console.error('Error saving attendance:', error);
        Swal.fire({
            icon: 'error',
            title: 'خطأ',
            text: error.message || 'تعذر حفظ سجل الحضور'
        });
    }
}

async function deleteAttendance(attendanceId) {
    const result = await Swal.fire({
        title: 'تأكيد الحذف',
        text: 'هل أنت متأكد من حذف سجل الحضور؟',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'نعم، احذف',
        cancelButtonText: 'إلغاء'
    });

    if (result.isConfirmed) {
        try {
            await apiDelete(`/employees/${currentEmployeeId}/attendance/${attendanceId}`);

            await Swal.fire({
                icon: 'success',
                title: 'تم الحذف',
                text: 'تم حذف سجل الحضور بنجاح'
            });

            loadEmployeeDetails();
        } catch (error) {
            console.error('Error deleting attendance:', error);
            Swal.fire({
                icon: 'error',
                title: 'خطأ',
                text: 'تعذر حذف سجل الحضور'
            });
        }
    }
}

function editAttendance(attendanceId) {
    // Find the attendance record from the loaded data
    let attendanceRecord = null;

    // Look in the attendance table rows to get the data
    const tableRows = document.querySelectorAll('#attendanceTableBody tr');
    for (let row of tableRows) {
        const editButton = row.querySelector(`button[onclick="editAttendance('${attendanceId}')"]`);
        if (editButton) {
            const cells = row.querySelectorAll('td');
            const monthName = cells[0].textContent;
            const year = cells[1].textContent;
            const periodDays = parseInt(cells[2].textContent);
            const workedDays = parseInt(cells[3].textContent);
            const absenceDays = parseInt(cells[4].textContent);
            const recordType = cells[5].textContent === 'حضور' ? 'attendance' : 'absence';
            const notes = cells[6].textContent === '—' ? '' : cells[6].textContent;

            // Convert month name to number
            const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
            const monthNumber = monthNames.indexOf(monthName) + 1;

            attendanceRecord = {
                id: attendanceId,
                month: monthNumber,
                year: parseInt(year),
                period_days: periodDays,
                worked_days: workedDays,
                absence_days: absenceDays,
                record_type: recordType,
                notes: notes
            };
            break;
        }
    }

    if (!attendanceRecord) {
        console.error('Attendance record not found:', attendanceId);
        return;
    }

    // Set modal title
    document.getElementById('attendanceModalTitle').textContent = 'تعديل سجل الحضور';

    // Fill form with existing data
    document.getElementById('attendanceMonth').value = attendanceRecord.month;
    document.getElementById('attendanceYear').value = attendanceRecord.year;
    document.getElementById('attendanceNotes').value = attendanceRecord.notes || '';

    // Set record type and show appropriate field
    if (attendanceRecord.record_type === 'absence') {
        document.getElementById('recordTypeAbsence').checked = true;
        document.getElementById('absenceDaysGroup').style.display = 'block';
        document.getElementById('attendanceDaysGroup').style.display = 'none';
        document.getElementById('absenceDays').value = attendanceRecord.absence_days;
        document.getElementById('absenceDays').required = true;
        document.getElementById('attendanceDays').required = false;
    } else {
        document.getElementById('recordTypeAttendance').checked = true;
        document.getElementById('attendanceDaysGroup').style.display = 'block';
        document.getElementById('absenceDaysGroup').style.display = 'none';
        document.getElementById('attendanceDays').value = attendanceRecord.worked_days;
        document.getElementById('attendanceDays').required = true;
        document.getElementById('absenceDays').required = false;
    }

    // Store attendance ID for update
    document.getElementById('attendanceForm').dataset.attendanceId = attendanceId;

    // Show modal
    document.getElementById('attendanceModal').style.display = 'block';
}

// Adjustment CRUD
async function handleAdjustmentSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const adjustmentData = Object.fromEntries(formData.entries());

    // Ensure amount is properly converted to number
    adjustmentData.amount = parseFloat(adjustmentData.amount) || 0;

    console.log('Submitting adjustment data:', adjustmentData);

    const adjustmentId = form.dataset.adjustmentId;
    const isEdit = !!adjustmentId;

    try {
        const url = isEdit
            ? `/employees/${currentEmployeeId}/adjustments/${adjustmentId}`
            : `/employees/${currentEmployeeId}/adjustments`;

        if (isEdit) {
            await apiPut(url, adjustmentData);
        } else {
            await apiPost(url, adjustmentData);
        }

        await Swal.fire({
            icon: 'success',
            title: 'تم الحفظ',
            text: isEdit ? 'تم تحديث التسوية بنجاح' : 'تم إضافة التسوية بنجاح'
        });

        closeAdjustmentModal();
        loadEmployeeDetails();
    } catch (error) {
        console.error('Error saving adjustment:', error);
        Swal.fire({
            icon: 'error',
            title: 'خطأ',
            text: error.message || 'تعذر حفظ التسوية'
        });
    }
}

async function deleteAdjustment(adjustmentId) {
    const result = await Swal.fire({
        title: 'تأكيد الحذف',
        text: 'هل أنت متأكد من حذف التسوية؟',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'نعم، احذف',
        cancelButtonText: 'إلغاء'
    });

    if (result.isConfirmed) {
        try {
            await apiDelete(`/employees/${currentEmployeeId}/adjustments/${adjustmentId}`);

            await Swal.fire({
                icon: 'success',
                title: 'تم الحذف',
                text: 'تم حذف التسوية بنجاح'
            });

            loadEmployeeDetails();
        } catch (error) {
            console.error('Error deleting adjustment:', error);
            Swal.fire({
                icon: 'error',
                title: 'خطأ',
                text: 'تعذر حذف التسوية'
            });
        }
    }
}

function editAdjustment(adjustmentId) {
    // Find the adjustment record from the table
    let adjustmentRecord = null;

    const tableRows = document.querySelectorAll('#adjustmentsTableBody tr');
    for (let row of tableRows) {
        const editButton = row.querySelector(`button[onclick="editAdjustment('${adjustmentId}')"]`);
        if (editButton) {
            const cells = row.querySelectorAll('td');
            const amountText = cells[0].textContent;
            const isAddition = amountText.includes('(إضافة)');
            const isDeduction = amountText.includes('(خصم)');

            // Extract numeric value
            const numericValue = amountText.replace(/[^\d.-]/g, '').replace(/[,٬]/g, '');
            const absoluteAmount = parseFloat(numericValue) || 0;

            // Determine the actual amount based on the display text
            let actualAmount;
            if (isAddition) {
                actualAmount = absoluteAmount; // Positive for additions
            } else if (isDeduction) {
                actualAmount = -absoluteAmount; // Negative for deductions
            } else {
                // Fallback: try to determine from the CSS class
                const amountCell = cells[0];
                if (amountCell.classList.contains('amount-positive')) {
                    actualAmount = absoluteAmount;
                } else if (amountCell.classList.contains('amount-negative')) {
                    actualAmount = -absoluteAmount;
                } else {
                    actualAmount = absoluteAmount; // Default to positive
                }
            }

            adjustmentRecord = {
                id: adjustmentId,
                amount: actualAmount,
                method: cells[1].textContent === '—' ? '' : cells[1].textContent,
                details: cells[2].textContent === '—' ? '' : cells[2].textContent,
                reason: cells[3].textContent === '—' ? '' : cells[3].textContent
            };
            break;
        }
    }

    if (!adjustmentRecord) {
        console.error('Adjustment record not found:', adjustmentId);
        return;
    }

    // Set modal title
    document.getElementById('adjustmentModalTitle').textContent = 'تعديل التسوية';

    // Fill form with existing data - use the actual amount (positive or negative)
    document.getElementById('adjustmentAmount').value = adjustmentRecord.amount;
    document.getElementById('adjustmentMethod').value = adjustmentRecord.method || '';
    document.getElementById('adjustmentDetails').value = adjustmentRecord.details || '';
    document.getElementById('adjustmentReason').value = adjustmentRecord.reason || '';

    // Store adjustment ID for update
    document.getElementById('adjustmentForm').dataset.adjustmentId = adjustmentId;

    // Show modal
    document.getElementById('adjustmentModal').style.display = 'block';
}

// Payment CRUD
async function handlePaymentSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const paymentData = Object.fromEntries(formData.entries());

    // Handle image upload
    const imageFile = document.getElementById('paymentImage').files[0];
    if (imageFile) {
        const reader = new FileReader();
        reader.onload = function (e) {
            paymentData.payment_image = e.target.result;
            submitPayment(paymentData, form.dataset.paymentId);
        };
        reader.readAsDataURL(imageFile);
    } else {
        submitPayment(paymentData, form.dataset.paymentId);
    }
}

async function submitPayment(paymentData, paymentId) {
    const isEdit = !!paymentId;

    try {
        const url = isEdit
            ? `/employees/${currentEmployeeId}/payments/${paymentId}`
            : `/employees/${currentEmployeeId}/payments`;

        if (isEdit) {
            await apiPut(url, paymentData);
        } else {
            await apiPost(url, paymentData);
        }

        await Swal.fire({
            icon: 'success',
            title: 'تم الحفظ',
            text: isEdit ? 'تم تحديث الدفعة بنجاح' : 'تم إضافة الدفعة بنجاح'
        });

        closePaymentModal();
        loadEmployeeDetails();
    } catch (error) {
        console.error('Error saving payment:', error);
        Swal.fire({
            icon: 'error',
            title: 'خطأ',
            text: error.message || 'تعذر حفظ الدفعة'
        });
    }
}

async function deletePayment(paymentId) {
    const result = await Swal.fire({
        title: 'تأكيد الحذف',
        text: 'هل أنت متأكد من حذف الدفعة؟',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'نعم، احذف',
        cancelButtonText: 'إلغاء'
    });

    if (result.isConfirmed) {
        try {
            await apiDelete(`/employees/${currentEmployeeId}/payments/${paymentId}`);

            await Swal.fire({
                icon: 'success',
                title: 'تم الحذف',
                text: 'تم حذف الدفعة بنجاح'
            });

            loadEmployeeDetails();
        } catch (error) {
            console.error('Error deleting payment:', error);
            Swal.fire({
                icon: 'error',
                title: 'خطأ',
                text: 'تعذر حذف الدفعة'
            });
        }
    }
}

function editPayment(paymentId) {
    // Find the payment record from the table
    let paymentRecord = null;

    const tableRows = document.querySelectorAll('#paymentsTableBody tr');
    for (let row of tableRows) {
        const editButton = row.querySelector(`button[onclick="editPayment('${paymentId}')"]`);
        if (editButton) {
            const cells = row.querySelectorAll('td');
            const amountText = cells[0].textContent.replace(/[^\d.-]/g, '');

            paymentRecord = {
                id: paymentId,
                amount: parseFloat(amountText),
                method: cells[1].textContent === '—' ? '' : cells[1].textContent,
                details: cells[2].textContent === '—' ? '' : cells[2].textContent,
                note: cells[3].textContent === '—' ? '' : cells[3].textContent,
                paid_at: cells[4].textContent
            };
            break;
        }
    }

    if (!paymentRecord) {
        console.error('Payment record not found:', paymentId);
        return;
    }

    // Set modal title
    document.getElementById('paymentModalTitle').textContent = 'تعديل الدفعة';

    // Fill form with existing data
    document.getElementById('paymentAmount').value = paymentRecord.amount;
    document.getElementById('paymentMethod').value = paymentRecord.method || '';
    document.getElementById('paymentDetails').value = paymentRecord.details || '';
    document.getElementById('paymentNote').value = paymentRecord.note || '';
    document.getElementById('paidAt').value = parseArabicDate(paymentRecord.paid_at);

    // Store payment ID for update
    document.getElementById('paymentForm').dataset.paymentId = paymentId;

    // Show modal
    document.getElementById('paymentModal').style.display = 'block';
}

function viewPaymentImage(imageData) {
    Swal.fire({
        title: 'صورة الإيصال',
        imageUrl: imageData,
        imageAlt: 'صورة الإيصال',
        showCloseButton: true,
        showConfirmButton: false
    });
}

// --- Load Clients (Projects) for Assignment ---

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
        label.className = 'checkbox-label';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = 'assigned_projects';
        checkbox.value = client.id;

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(client.name));
        projectsList.appendChild(label);
    });
}

// --- Edit Employee Modal Functions ---

function openEditEmployeeModal() {
    if (!currentEmployee) return;

    // Fill form with current employee data
    document.getElementById('editEmployeeName').value = currentEmployee.name || '';
    document.getElementById('editJobTitle').value = currentEmployee.job_title || '';
    document.getElementById('editPhoneNumber').value = currentEmployee.phone_number || '';
    document.getElementById('editBasicSalary').value = currentEmployee.basic_salary || currentEmployee.base_salary || '';
    document.getElementById('editStartWorkingDate').value = currentEmployee.start_working_date ? currentEmployee.start_working_date.split('T')[0] : '';
    document.getElementById('editStatus').value = currentEmployee.status || 'Active';
    document.getElementById('editNotes').value = currentEmployee.notes || '';

    // Handle project assignment
    const allProjectsCheckbox = document.getElementById('editAllProjects');
    const projectsList = document.getElementById('editProjectsList');

    if (currentEmployee.all_projects) {
        allProjectsCheckbox.checked = true;
        projectsList.style.display = 'none';
    } else {
        allProjectsCheckbox.checked = false;
        projectsList.style.display = 'block';

        // Clear all project checkboxes first
        const projectCheckboxes = projectsList.querySelectorAll('input[name="assigned_projects"]');
        projectCheckboxes.forEach(cb => cb.checked = false);

        // Check assigned projects
        if (currentEmployee.assigned_projects && Array.isArray(currentEmployee.assigned_projects)) {
            currentEmployee.assigned_projects.forEach(projectId => {
                const checkbox = projectsList.querySelector(`input[value="${projectId}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }
    }

    // Show modal
    document.getElementById('editEmployeeModal').style.display = 'block';
}

function closeEditEmployeeModal() {
    document.getElementById('editEmployeeModal').style.display = 'none';
    document.getElementById('editEmployeeForm').reset();

    // Reset project assignment
    document.getElementById('editAllProjects').checked = false;
    document.getElementById('editProjectsList').style.display = 'none';
    const projectCheckboxes = document.querySelectorAll('input[name="assigned_projects"]');
    projectCheckboxes.forEach(cb => cb.checked = false);
}

async function handleEditEmployeeSubmit(event) {
    event.preventDefault();

    const form = event.target;
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

    // Convert empty strings to null for optional fields
    Object.keys(employeeData).forEach(key => {
        if (employeeData[key] === '' && key !== 'assigned_projects') {
            employeeData[key] = null;
        }
    });

    try {
        await apiPut(`/employees/${currentEmployeeId}`, employeeData);

        await Swal.fire({
            icon: 'success',
            title: 'تم الحفظ',
            text: 'تم تحديث معلومات الموظف بنجاح'
        });

        closeEditEmployeeModal();
        loadEmployeeDetails(); // Reload to show updated data
    } catch (error) {
        console.error('Error updating employee:', error);
        Swal.fire({
            icon: 'error',
            title: 'خطأ',
            text: error.message || 'تعذر تحديث معلومات الموظف'
        });
    }
}

// --- Event Listeners ---

// Toggle date range inputs
function toggleDateRange() {
    const checkbox = document.getElementById('useCustomDateRange');
    const dateInputs = document.getElementById('dateRangeInputs');
    dateInputs.style.display = checkbox.checked ? 'block' : 'none';
}

// Generate account statement
function generateAccountStatement() {
    const useCustomRange = document.getElementById('useCustomDateRange').checked;
    let url = `/api/employees/${currentEmployeeId}/reports/statement`;
    
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
    
    // Open in new tab to download PDF
    window.open(url, '_blank');
}

document.addEventListener('DOMContentLoaded', function () {
    // Check authentication first
    if (!authManager.checkAuth()) {
        return;
    }

    // Wait for utilities to load before initializing
    const checkUtilities = setInterval(() => {
        if (typeof apiGet !== 'undefined') {
            clearInterval(checkUtilities);
            // Load employee details and clients on page load
            loadEmployeeDetails();
            loadClients();
        }
    }, 100);

    // Radio button logic for attendance modal
    const recordTypeRadios = document.querySelectorAll('input[name="record_type"]');
    const attendanceDaysGroup = document.getElementById('attendanceDaysGroup');
    const absenceDaysGroup = document.getElementById('absenceDaysGroup');
    const attendanceDaysInput = document.getElementById('attendanceDays');
    const absenceDaysInput = document.getElementById('absenceDays');

    recordTypeRadios.forEach(radio => {
        radio.addEventListener('change', function () {
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
    document.getElementById('addAttendanceBtn').addEventListener('click', function () {
        // Set default year to current year when opening modal
        document.getElementById('attendanceYear').value = new Date().getFullYear();
        document.getElementById('attendanceModal').style.display = 'block';
    });

    document.getElementById('addAdjustmentBtn').addEventListener('click', function () {
        // Clear any previous values and show helpful message
        document.getElementById('adjustmentAmount').value = '';
        document.getElementById('adjustmentAmount').placeholder = 'مثال: 500 للإضافة، -200 للخصم';
        document.getElementById('adjustmentModal').style.display = 'block';
    });

    document.getElementById('addPaymentBtn').addEventListener('click', function () {
        // Set default date to today
        document.getElementById('paidAt').value = new Date().toISOString().split('T')[0];
        document.getElementById('paymentModal').style.display = 'block';
    });

    // Form submissions
    document.getElementById('attendanceForm').addEventListener('submit', handleAttendanceSubmit);
    document.getElementById('adjustmentForm').addEventListener('submit', handleAdjustmentSubmit);
    document.getElementById('paymentForm').addEventListener('submit', handlePaymentSubmit);

    // Add real-time feedback for adjustment amount
    document.getElementById('adjustmentAmount').addEventListener('input', function () {
        const amount = parseFloat(this.value);
        const helpText = this.parentElement.querySelector('.form-help');

        if (!isNaN(amount)) {
            if (amount > 0) {
                helpText.innerHTML = `
                    <strong style="color: var(--green-600);">✓ إضافة ${formatCurrency(Math.abs(amount))}</strong> - سيزيد من استحقاق الموظف<br>
                    <small>المبالغ الموجبة (+): تزيد من استحقاق الموظف (مكافآت، علاوات)<br>
                    المبالغ السالبة (-): تقلل من استحقاق الموظف (خصومات، غرامات)</small>
                `;
            } else if (amount < 0) {
                helpText.innerHTML = `
                    <strong style="color: var(--red-600);">✓ خصم ${formatCurrency(Math.abs(amount))}</strong> - سيقلل من استحقاق الموظف<br>
                    <small>المبالغ الموجبة (+): تزيد من استحقاق الموظف (مكافآت، علاوات)<br>
                    المبالغ السالبة (-): تقلل من استحقاق الموظف (خصومات، غرامات)</small>
                `;
            } else {
                helpText.innerHTML = `
                    <strong>المبالغ الموجبة (+):</strong> تزيد من استحقاق الموظف (مكافآت، علاوات)<br>
                    <strong>المبالغ السالبة (-):</strong> تقلل من استحقاق الموظف (خصومات، غرامات)
                `;
            }
        } else {
            helpText.innerHTML = `
                <strong>المبالغ الموجبة (+):</strong> تزيد من استحقاق الموظف (مكافآت، علاوات)<br>
                <strong>المبالغ السالبة (-):</strong> تقلل من استحقاق الموظف (خصومات، غرامات)
            `;
        }
    });

    // Edit employee button and form
    document.getElementById('editEmployeeBtn').addEventListener('click', openEditEmployeeModal);
    document.getElementById('editEmployeeForm').addEventListener('submit', handleEditEmployeeSubmit);

    // All projects checkbox toggle
    document.getElementById('editAllProjects').addEventListener('change', function () {
        const projectsList = document.getElementById('editProjectsList');
        if (this.checked) {
            projectsList.style.display = 'none';
            // Uncheck all project checkboxes
            const projectCheckboxes = projectsList.querySelectorAll('input[name="assigned_projects"]');
            projectCheckboxes.forEach(cb => cb.checked = false);
        } else {
            projectsList.style.display = 'block';
        }
    });

    // Close modals when clicking outside
    window.addEventListener('click', function (event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });

    // Account statement button
    const generateAccountStatementBtn = document.getElementById('generateAccountStatementBtn');
    if (generateAccountStatementBtn) {
        generateAccountStatementBtn.addEventListener('click', generateAccountStatement);
    }
});