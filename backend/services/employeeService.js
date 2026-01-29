const { Employee, EmployeePayment, Adjustment, Attendance } = require('../models');
const PayrollService = require('./payrollService');

const toNumber = (v) => Number(v || 0);

class EmployeeService {
    static async getAllEmployees() {
        const employees = await Employee.find().sort({ name: 1 });

        // Calculate totals for each employee using payroll service
        const result = await Promise.all(
            employees.map(async (employee) => {
                try {
                    const balanceData = await PayrollService.calculateEmployeeBalance(employee._id);
                    const attendanceCount = await Attendance.countDocuments({ employee_id: employee._id });
                    
                    return {
                        id: employee._id,
                        name: employee.name,
                        job_title: employee.job_title,
                        phone_number: employee.phone_number,
                        basic_salary: employee.basic_salary || employee.base_salary,
                        start_working_date: employee.start_working_date,
                        end_working_date: employee.end_working_date,
                        status: employee.status,
                        notes: employee.notes,
                        created_at: employee.created_at,
                        // Payroll calculations
                        balance: balanceData.balance,
                        balance_status: balanceData.balance_status,
                        balance_description: balanceData.balance_description,
                        total_earned_salary: balanceData.total_earned_salary,
                        total_payments: balanceData.total_payments,
                        total_adjustments: balanceData.total_adjustments,
                        total_worked_days: balanceData.salary_details.total_worked_days,
                        attendanceCount: attendanceCount
                    };
                } catch (error) {
                    // Return employee with zero calculations if payroll calculation fails
                    return {
                        id: employee._id,
                        name: employee.name,
                        job_title: employee.job_title,
                        phone_number: employee.phone_number,
                        basic_salary: employee.basic_salary || employee.base_salary,
                        start_working_date: employee.start_working_date,
                        end_working_date: employee.end_working_date,
                        status: employee.status,
                        notes: employee.notes,
                        created_at: employee.created_at,
                        balance: 0,
                        balance_status: 'error',
                        balance_description: 'خطأ في الحساب',
                        total_earned_salary: 0,
                        total_payments: 0,
                        total_adjustments: 0,
                        total_worked_days: 0,
                        attendanceCount: 0,
                        error: error.message
                    };
                }
            })
        );

        return { employees: result };
    }

    static async getEmployeeById(id) {
        const employee = await Employee.findById(id);

        if (!employee) {
            return null;
        }

        // Get related data
        const payments = await EmployeePayment.find({ employee_id: id })
            .sort({ paid_at: -1 });

        const adjustments = await Adjustment.find({
            entity_type: 'employee',
            entity_id: id
        }).sort({ created_at: -1 });

        const attendance = await Attendance.find({ employee_id: id })
            .sort({ period_start: -1 });

        // Calculate payroll data using payroll service
        const balanceData = await PayrollService.calculateEmployeeBalance(id);

        return {
            employee: {
                id: employee._id,
                name: employee.name,
                job_title: employee.job_title,
                phone_number: employee.phone_number,
                basic_salary: employee.basic_salary,
                start_working_date: employee.start_working_date,
                end_working_date: employee.end_working_date,
                status: employee.status,
                notes: employee.notes,
                created_at: employee.created_at
            },
            payments: payments.map(p => ({
                id: p._id,
                amount: p.amount,
                method: p.method,
                details: p.details,
                note: p.note,
                payment_image: p.payment_image,
                paid_at: p.paid_at,
                created_at: p.created_at
            })),
            adjustments: adjustments.map(a => ({
                id: a._id,
                amount: a.amount,
                method: a.method,
                details: a.details,
                reason: a.reason,
                created_at: a.created_at
            })),
            attendance: attendance.map(a => ({
                id: a._id,
                period_start: a.period_start,
                period_end: a.period_end,
                period_days: a.period_days,
                record_type: a.record_type,
                attendance_days: a.attendance_days,
                absence_days: a.absence_days,
                worked_days: a.worked_days,
                notes: a.notes,
                created_at: a.created_at
            })),
            // Payroll calculations
            totals: {
                balance: balanceData.balance,
                balance_status: balanceData.balance_status,
                balance_description: balanceData.balance_description,
                total_earned_salary: balanceData.total_earned_salary,
                total_payments: balanceData.total_payments,
                total_adjustments: balanceData.total_adjustments,
                total_worked_days: balanceData.salary_details.total_worked_days,
                total_period_days: balanceData.salary_details.total_period_days,
                attendance_records_count: balanceData.salary_details.attendance_records_count,
                average_daily_rate: balanceData.salary_details.average_daily_rate
            }
        };
    }

    static async createEmployee(data) {
        // Remove opening_balance if provided (not used in new system)
        const { opening_balance, ...employeeData } = data;
        
        const employee = new Employee(employeeData);
        await employee.save();
        return {
            id: employee._id,
            name: employee.name,
            job_title: employee.job_title,
            phone_number: employee.phone_number,
            basic_salary: employee.basic_salary,
            start_working_date: employee.start_working_date,
            end_working_date: employee.end_working_date,
            status: employee.status,
            notes: employee.notes,
            created_at: employee.created_at
        };
    }

    static async updateEmployee(id, data) {
        // Remove opening_balance if provided (not used in new system)
        const { opening_balance, ...updateData } = data;
        
        const employee = await Employee.findByIdAndUpdate(id, updateData, { new: true });
        if (!employee) return null;

        return {
            id: employee._id,
            name: employee.name,
            job_title: employee.job_title,
            phone_number: employee.phone_number,
            basic_salary: employee.basic_salary,
            start_working_date: employee.start_working_date,
            end_working_date: employee.end_working_date,
            status: employee.status,
            notes: employee.notes,
            created_at: employee.created_at
        };
    }

    static async deleteEmployee(id) {
        // Check if employee has related records
        const paymentsCount = await EmployeePayment.countDocuments({ employee_id: id });
        const adjustmentsCount = await Adjustment.countDocuments({ entity_type: 'employee', entity_id: id });
        const attendanceCount = await Attendance.countDocuments({ employee_id: id });

        if (paymentsCount > 0 || adjustmentsCount > 0 || attendanceCount > 0) {
            throw new Error('لا يمكن حذف الموظف لوجود سجلات مرتبطة به');
        }

        const employee = await Employee.findByIdAndDelete(id);
        return employee;
    }

    // Payment methods (unchanged)
    static async addEmployeePayment(employeeId, paymentData) {
        const payment = new EmployeePayment({
            employee_id: employeeId,
            ...paymentData
        });
        await payment.save();
        return payment;
    }

    static async updateEmployeePayment(employeeId, paymentId, paymentData) {
        const payment = await EmployeePayment.findOneAndUpdate(
            { _id: paymentId, employee_id: employeeId },
            paymentData,
            { new: true }
        );
        return payment;
    }

    static async deleteEmployeePayment(employeeId, paymentId) {
        const payment = await EmployeePayment.findOneAndDelete({
            _id: paymentId,
            employee_id: employeeId
        });
        return payment;
    }

    // Attendance methods (updated with validation)
    static async addAttendanceRecord(employeeId, attendanceData) {
        try {
            // Validate using payroll service
            const validatedData = PayrollService.validateAttendanceRecordForSaving(attendanceData);
            
            const attendance = new Attendance({
                employee_id: employeeId,
                ...validatedData
            });
            await attendance.save();
            return attendance;
        } catch (error) {
            console.error('Error in addAttendanceRecord:', error);
            throw error;
        }
    }

    static async updateAttendanceRecord(employeeId, attendanceId, attendanceData) {
        try {
            // Validate using payroll service
            const validatedData = PayrollService.validateAttendanceRecordForSaving(attendanceData);
            
            const attendance = await Attendance.findOneAndUpdate(
                { _id: attendanceId, employee_id: employeeId },
                validatedData,
                { new: true, runValidators: true }
            );
            return attendance;
        } catch (error) {
            console.error('Error in updateAttendanceRecord:', error);
            throw error;
        }
    }

    static async deleteAttendanceRecord(employeeId, attendanceId) {
        const attendance = await Attendance.findOneAndDelete({
            _id: attendanceId,
            employee_id: employeeId
        });
        return attendance;
    }
}

module.exports = EmployeeService;