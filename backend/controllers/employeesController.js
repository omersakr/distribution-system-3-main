const employeeService = require('../services/employeeService');
const { Adjustment } = require('../models');

class EmployeesController {
    // Get all employees
    async getAllEmployees(req, res, next) {
        try {
            const result = await employeeService.getAllEmployees();
            res.json(result);
        } catch (err) {
            next(err);
        }
    }

    // Get employee by ID
    async getEmployeeById(req, res, next) {
        try {
            const employee = await employeeService.getEmployeeById(req.params.id);

            if (!employee) {
                return res.status(404).json({ message: 'الموظف غير موجود' });
            }

            res.json(employee);
        } catch (err) {
            next(err);
        }
    }

    // Create new employee
    async createEmployee(req, res, next) {
        try {
            const { name, job_title, phone_number, basic_salary, start_working_date, end_working_date, status, notes, all_projects, assigned_projects } = req.body;

            if (!name || name.trim() === '') {
                return res.status(400).json({ message: 'اسم الموظف مطلوب' });
            }

            if (!basic_salary || basic_salary <= 0) {
                return res.status(400).json({ message: 'الراتب الأساسي مطلوب ويجب أن يكون أكبر من صفر' });
            }

            const employee = await employeeService.createEmployee({
                name: name.trim(),
                job_title: job_title?.trim(),
                phone_number: phone_number?.trim(),
                basic_salary: parseFloat(basic_salary),
                start_working_date: start_working_date ? new Date(start_working_date) : new Date(),
                end_working_date: end_working_date ? new Date(end_working_date) : null,
                status: status || 'Active',
                notes: notes?.trim(),
                all_projects: all_projects || false,
                assigned_projects: assigned_projects || []
            });

            res.status(201).json(employee);
        } catch (err) {
            if (err.code === 11000) {
                return res.status(400).json({ message: 'اسم الموظف موجود بالفعل' });
            }
            next(err);
        }
    }

    // Update employee
    async updateEmployee(req, res, next) {
        try {
            const { name, job_title, phone_number, basic_salary, start_working_date, end_working_date, status, notes, all_projects, assigned_projects } = req.body;

            if (!name || name.trim() === '') {
                return res.status(400).json({ message: 'اسم الموظف مطلوب' });
            }

            if (basic_salary !== undefined && basic_salary <= 0) {
                return res.status(400).json({ message: 'الراتب الأساسي يجب أن يكون أكبر من صفر' });
            }

            const employee = await employeeService.updateEmployee(req.params.id, {
                name: name.trim(),
                job_title: job_title?.trim(),
                phone_number: phone_number?.trim(),
                basic_salary: basic_salary ? parseFloat(basic_salary) : undefined,
                start_working_date: start_working_date ? new Date(start_working_date) : undefined,
                end_working_date: end_working_date ? new Date(end_working_date) : null,
                status: status || 'Active',
                notes: notes?.trim(),
                all_projects: all_projects !== undefined ? all_projects : undefined,
                assigned_projects: assigned_projects !== undefined ? assigned_projects : undefined
            });

            if (!employee) {
                return res.status(404).json({ message: 'الموظف غير موجود' });
            }

            res.json(employee);
        } catch (err) {
            if (err.code === 11000) {
                return res.status(400).json({ message: 'اسم الموظف موجود بالفعل' });
            }
            next(err);
        }
    }

    // Delete employee
    async deleteEmployee(req, res, next) {
        try {
            const employee = await employeeService.deleteEmployee(req.params.id);

            if (!employee) {
                return res.status(404).json({ message: 'الموظف غير موجود' });
            }

            res.json({ message: 'تم حذف الموظف بنجاح' });
        } catch (err) {
            if (err.message.includes('لا يمكن حذف الموظف')) {
                return res.status(400).json({ message: err.message });
            }
            next(err);
        }
    }

    // ============================================================================
    // EMPLOYEE PAYMENTS MANAGEMENT
    // ============================================================================

    // Get employee payments
    async getEmployeePayments(req, res, next) {
        try {
            const employee = await employeeService.getEmployeeById(req.params.id);
            if (!employee) {
                return res.status(404).json({ message: 'الموظف غير موجود' });
            }

            res.json({ payments: employee.payments });
        } catch (err) {
            next(err);
        }
    }

    // Add employee payment
    async addEmployeePayment(req, res, next) {
        try {
            const { amount, method, details, note, payment_image, paid_at } = req.body;

            if (!amount || amount <= 0) {
                return res.status(400).json({ message: 'مبلغ الدفع مطلوب ويجب أن يكون أكبر من صفر' });
            }

            const payment = await employeeService.addEmployeePayment(req.params.id, {
                amount: parseFloat(amount),
                method: method?.trim(),
                details: details?.trim(),
                note: note?.trim(),
                payment_image,
                paid_at: paid_at ? new Date(paid_at) : new Date()
            });

            res.status(201).json(payment);
        } catch (err) {
            next(err);
        }
    }

    // Update employee payment
    async updateEmployeePayment(req, res, next) {
        try {
            const { amount, method, details, note, payment_image, paid_at } = req.body;

            if (!amount || amount <= 0) {
                return res.status(400).json({ message: 'مبلغ الدفع مطلوب ويجب أن يكون أكبر من صفر' });
            }

            const payment = await employeeService.updateEmployeePayment(
                req.params.id,
                req.params.paymentId,
                {
                    amount: parseFloat(amount),
                    method: method?.trim(),
                    details: details?.trim(),
                    note: note?.trim(),
                    payment_image,
                    paid_at: paid_at ? new Date(paid_at) : undefined
                }
            );

            if (!payment) {
                return res.status(404).json({ message: 'الدفعة غير موجودة' });
            }

            res.json(payment);
        } catch (err) {
            next(err);
        }
    }

    // Delete employee payment
    async deleteEmployeePayment(req, res, next) {
        try {
            const payment = await employeeService.deleteEmployeePayment(
                req.params.id,
                req.params.paymentId
            );

            if (!payment) {
                return res.status(404).json({ message: 'الدفعة غير موجودة' });
            }

            res.json({ message: 'تم حذف الدفعة بنجاح' });
        } catch (err) {
            next(err);
        }
    }

    // ============================================================================
    // EMPLOYEE ADJUSTMENTS MANAGEMENT
    // ============================================================================

    // Get employee adjustments
    async getEmployeeAdjustments(req, res, next) {
        try {
            const employee = await employeeService.getEmployeeById(req.params.id);
            if (!employee) {
                return res.status(404).json({ message: 'الموظف غير موجود' });
            }

            res.json({ adjustments: employee.adjustments });
        } catch (err) {
            next(err);
        }
    }

    // Add employee adjustment
    async addEmployeeAdjustment(req, res, next) {
        try {
            const { amount, method, details, reason } = req.body;

            if (amount === undefined || amount === null) {
                return res.status(400).json({ message: 'مبلغ التسوية مطلوب' });
            }

            const adjustment = new Adjustment({
                entity_type: 'employee',
                entity_id: req.params.id,
                amount: parseFloat(amount),
                method: method?.trim(),
                details: details?.trim(),
                reason: reason?.trim()
            });

            await adjustment.save();
            res.status(201).json(adjustment);
        } catch (err) {
            next(err);
        }
    }

    // Update employee adjustment
    async updateEmployeeAdjustment(req, res, next) {
        try {
            const { amount, method, details, reason } = req.body;

            if (amount === undefined || amount === null) {
                return res.status(400).json({ message: 'مبلغ التسوية مطلوب' });
            }

            const adjustment = await Adjustment.findOneAndUpdate(
                {
                    _id: req.params.adjustmentId,
                    entity_type: 'employee',
                    entity_id: req.params.id
                },
                {
                    amount: parseFloat(amount),
                    method: method?.trim(),
                    details: details?.trim(),
                    reason: reason?.trim()
                },
                { new: true }
            );

            if (!adjustment) {
                return res.status(404).json({ message: 'التسوية غير موجودة' });
            }

            res.json(adjustment);
        } catch (err) {
            next(err);
        }
    }

    // Delete employee adjustment
    async deleteEmployeeAdjustment(req, res, next) {
        try {
            const adjustment = await Adjustment.findOneAndDelete({
                _id: req.params.adjustmentId,
                entity_type: 'employee',
                entity_id: req.params.id
            });

            if (!adjustment) {
                return res.status(404).json({ message: 'التسوية غير موجودة' });
            }

            res.json({ message: 'تم حذف التسوية بنجاح' });
        } catch (err) {
            next(err);
        }
    }

    // ============================================================================
    // EMPLOYEE ATTENDANCE MANAGEMENT
    // ============================================================================

    // Get employee attendance records
    async getEmployeeAttendance(req, res, next) {
        try {
            const employee = await employeeService.getEmployeeById(req.params.id);
            if (!employee) {
                return res.status(404).json({ message: 'الموظف غير موجود' });
            }

            res.json({ attendance: employee.attendance });
        } catch (err) {
            next(err);
        }
    }

    // Add attendance record
    async addAttendanceRecord(req, res, next) {
        try {
            const { period_start, period_end, record_type, attendance_days, absence_days, notes } = req.body;

            if (!period_start || !period_end) {
                return res.status(400).json({ message: 'تاريخ بداية ونهاية الفترة مطلوبان' });
            }

            if (!record_type || !['attendance', 'absence'].includes(record_type)) {
                return res.status(400).json({ message: 'نوع السجل يجب أن يكون "attendance" أو "absence"' });
            }

            // Calculate period days
            const startDate = new Date(period_start);
            const endDate = new Date(period_end);
            const periodDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

            if (periodDays <= 0) {
                return res.status(400).json({ message: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية' });
            }

            const attendanceData = {
                period_start: startDate,
                period_end: endDate,
                period_days: periodDays,
                record_type,
                notes: notes?.trim()
            };

            if (record_type === 'attendance') {
                if (attendance_days === undefined || attendance_days === null || attendance_days < 0) {
                    return res.status(400).json({ message: 'أيام الحضور مطلوبة عند تسجيل الحضور' });
                }
                const attendanceDaysInt = parseInt(attendance_days);
                if (attendanceDaysInt > periodDays) {
                    return res.status(400).json({ message: `أيام الحضور (${attendanceDaysInt}) لا يمكن أن تتجاوز أيام الفترة (${periodDays})` });
                }
                attendanceData.attendance_days = attendanceDaysInt;
                attendanceData.worked_days = attendanceDaysInt;
                attendanceData.absence_days = null;
            } else {
                if (absence_days === undefined || absence_days === null || absence_days < 0) {
                    return res.status(400).json({ message: 'أيام الغياب مطلوبة عند تسجيل الغياب' });
                }
                const absenceDaysInt = parseInt(absence_days);
                if (absenceDaysInt > periodDays) {
                    return res.status(400).json({ message: `أيام الغياب (${absenceDaysInt}) لا يمكن أن تتجاوز أيام الفترة (${periodDays})` });
                }
                attendanceData.absence_days = absenceDaysInt;
                attendanceData.worked_days = periodDays - absenceDaysInt;
                attendanceData.attendance_days = null;
            }

            const attendance = await employeeService.addAttendanceRecord(req.params.id, attendanceData);

            res.status(201).json(attendance);
        } catch (err) {
            if (err.code === 11000) {
                return res.status(400).json({ message: 'سجل الحضور لهذه الفترة موجود بالفعل' });
            }
            console.error('Error adding attendance record:', err);

            // Handle validation errors
            if (err.message && err.message.includes('validation')) {
                return res.status(400).json({ message: err.message });
            }

            // Handle custom validation errors from payroll service
            if (err.message && (
                err.message.includes('days') ||
                err.message.includes('period') ||
                err.message.includes('attendance') ||
                err.message.includes('absence')
            )) {
                return res.status(400).json({ message: err.message });
            }

            next(err);
        }
    }

    // Update attendance record
    async updateAttendanceRecord(req, res, next) {
        try {
            const { period_start, period_end, record_type, attendance_days, absence_days, notes } = req.body;

            if (!period_start || !period_end) {
                return res.status(400).json({ message: 'تاريخ بداية ونهاية الفترة مطلوبان' });
            }

            if (!record_type || !['attendance', 'absence'].includes(record_type)) {
                return res.status(400).json({ message: 'نوع السجل يجب أن يكون "attendance" أو "absence"' });
            }

            // Calculate period days
            const startDate = new Date(period_start);
            const endDate = new Date(period_end);
            const periodDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

            if (periodDays <= 0) {
                return res.status(400).json({ message: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية' });
            }

            const attendanceData = {
                period_start: startDate,
                period_end: endDate,
                period_days: periodDays,
                record_type,
                notes: notes?.trim()
            };

            if (record_type === 'attendance') {
                if (attendance_days === undefined || attendance_days === null || attendance_days < 0) {
                    return res.status(400).json({ message: 'أيام الحضور مطلوبة عند تسجيل الحضور' });
                }
                const attendanceDaysInt = parseInt(attendance_days);
                if (attendanceDaysInt > periodDays) {
                    return res.status(400).json({ message: `أيام الحضور (${attendanceDaysInt}) لا يمكن أن تتجاوز أيام الفترة (${periodDays})` });
                }
                attendanceData.attendance_days = attendanceDaysInt;
                attendanceData.worked_days = attendanceDaysInt;
                attendanceData.absence_days = null;
            } else {
                if (absence_days === undefined || absence_days === null || absence_days < 0) {
                    return res.status(400).json({ message: 'أيام الغياب مطلوبة عند تسجيل الغياب' });
                }
                const absenceDaysInt = parseInt(absence_days);
                if (absenceDaysInt > periodDays) {
                    return res.status(400).json({ message: `أيام الغياب (${absenceDaysInt}) لا يمكن أن تتجاوز أيام الفترة (${periodDays})` });
                }
                attendanceData.absence_days = absenceDaysInt;
                attendanceData.worked_days = periodDays - absenceDaysInt;
                attendanceData.attendance_days = null;
            }

            const attendance = await employeeService.updateAttendanceRecord(
                req.params.id,
                req.params.attendanceId,
                attendanceData
            );

            if (!attendance) {
                return res.status(404).json({ message: 'سجل الحضور غير موجود' });
            }

            res.json(attendance);
        } catch (err) {
            if (err.code === 11000) {
                return res.status(400).json({ message: 'سجل الحضور لهذه الفترة موجود بالفعل' });
            }
            console.error('Error updating attendance record:', err);

            // Handle validation errors
            if (err.message && err.message.includes('validation')) {
                return res.status(400).json({ message: err.message });
            }

            // Handle custom validation errors from payroll service
            if (err.message && (
                err.message.includes('days') ||
                err.message.includes('period') ||
                err.message.includes('attendance') ||
                err.message.includes('absence')
            )) {
                return res.status(400).json({ message: err.message });
            }

            next(err);
        }
    }

    // Delete attendance record
    async deleteAttendanceRecord(req, res, next) {
        try {
            const attendance = await employeeService.deleteAttendanceRecord(
                req.params.id,
                req.params.attendanceId
            );

            if (!attendance) {
                return res.status(404).json({ message: 'سجل الحضور غير موجود' });
            }

            res.json({ message: 'تم حذف سجل الحضور بنجاح' });
        } catch (err) {
            next(err);
        }
    }

    // Get employee account statement
    async getEmployeeAccountStatement(req, res, next) {
        try {
            const PDFService = require('../services/pdfServiceUltraFast');
            const reportService = require('../services/reportService');
            
            const { from, to } = req.query;

            const reportData = await reportService.getEmployeeAccountStatementData(req.params.id, from, to);
            const html = reportService.generateEmployeeAccountStatementHTML(reportData);

            // Generate PDF using smart method for optimal performance
            const pdfBuffer = await PDFService.generatePDFSmart(html);

            // Create filename
            const filename = PDFService.formatFilename(
                'كشف_حساب_موظف',
                reportData.employee.name,
                from,
                to
            );

            // Set headers for PDF download
            const headers = PDFService.getDownloadHeaders(filename);
            Object.entries(headers).forEach(([key, value]) => {
                res.setHeader(key, value);
            });

            // Set content length
            res.setHeader('Content-Length', pdfBuffer.length);

            // Send the PDF buffer
            res.end(pdfBuffer, 'binary');
        } catch (err) {
            console.error('PDF generation error:', err);
            if (err.message === 'الموظف غير موجود') {
                return res.status(404).json({ message: err.message });
            }
            next(err);
        }
    }
}

module.exports = new EmployeesController();