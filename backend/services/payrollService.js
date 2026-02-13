const { Employee, Attendance, EmployeePayment, Adjustment } = require('../models');

const toNumber = (v) => Number(v || 0);

class PayrollService {
    /**
     * Validate calculation preconditions for payroll
     * @param {Object} employee - Employee object
     * @param {Array} attendanceRecords - Attendance records
     * @returns {boolean} True if calculations should proceed
     */
    static validateCalculationPreconditions(employee, attendanceRecords) {
        // Check basic salary is valid number > 0 (support both field names)
        const salary = employee.basic_salary || employee.base_salary || 0;
        if (!salary || typeof salary !== 'number' || salary <= 0) {
            return false;
        }

        // Check at least one valid attendance record exists
        if (!attendanceRecords || attendanceRecords.length === 0) {
            return false;
        }

        // Check all attendance records are valid
        const validRecords = attendanceRecords.filter(record => {
            const periodDays = record.period_days || this.calculatePeriodDays(record.period_start, record.period_end);
            const workedDays = record.worked_days || record.working_days || 0;
            return periodDays > 0 && workedDays >= 0;
        });

        return validRecords.length > 0;
    }

    /**
     * Calculate period days from dates
     * @param {Date} startDate - Period start date
     * @param {Date} endDate - Period end date
     * @returns {number} Number of days in period
     */
    static calculatePeriodDays(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    }

    /**
     * Validate individual attendance record for payroll calculations
     * @param {Object} record - Attendance record
     * @returns {boolean} True if record is valid for payroll
     */
    static validateAttendanceRecordForPayroll(record) {
        // Ensure period_days is calculated
        const periodDays = record.period_days || this.calculatePeriodDays(record.period_start, record.period_end);
        
        // Hard stop: period_days must be > 0
        if (periodDays <= 0) {
            return false;
        }

        // Get worked days (support old and new field names)
        const workedDays = record.worked_days || record.working_days || 0;
        
        // Validate worked days
        if (workedDays < 0) {
            return false;
        }

        return true;
    }

    /**
     * Calculate daily rate for an employee
     * @param {number} basicSalary - Employee's basic monthly salary
     * @param {number} monthDays - Number of days in the month (default 30)
     * @returns {number} Daily rate
     */
    static calculateDailyRate(basicSalary, monthDays = 30) {
        if (!basicSalary || basicSalary <= 0) return 0;
        return Math.round((basicSalary / monthDays) * 100) / 100;
    }

    /**
     * Calculate earned salary for a specific attendance period
     * @param {number} basicSalary - Employee's basic monthly salary
     * @param {number} workedDays - Number of days worked in the period
     * @param {number} periodDays - Total days in the period (for daily rate calculation)
     * @returns {number} Earned salary for the period
     */
    static calculateEarnedSalary(basicSalary, workedDays, periodDays = 30) {
        const dailyRate = this.calculateDailyRate(basicSalary, periodDays);
        return Math.round((dailyRate * workedDays) * 100) / 100;
    }

    /**
     * Calculate total earned salary for an employee across all attendance records
     * @param {string} employeeId - Employee ID
     * @returns {Promise<Object>} Salary calculation details
     */
    static async calculateTotalEarnedSalary(employeeId) {
        const employee = await Employee.findById(employeeId);
        if (!employee) {
            throw new Error('Employee not found');
        }

        const attendanceRecords = await Attendance.find({ employee_id: employeeId });
        
        // SAFETY GUARD: Check calculation preconditions
        if (!this.validateCalculationPreconditions(employee, attendanceRecords)) {
            // Still calculate actual worked days for display, even if payroll is invalid
            let actualWorkedDays = 0;
            let actualPeriodDays = 0;
            
            for (const record of attendanceRecords) {
                const transformedRecord = { ...record.toObject ? record.toObject() : record };
                
                // Calculate period_days if missing
                if (!transformedRecord.period_days && transformedRecord.period_start && transformedRecord.period_end) {
                    transformedRecord.period_days = this.calculatePeriodDays(transformedRecord.period_start, transformedRecord.period_end);
                }
                
                // Handle old working_days field
                if (transformedRecord.worked_days === undefined && transformedRecord.working_days !== undefined) {
                    transformedRecord.worked_days = transformedRecord.working_days;
                }
                
                // Handle old absence_days logic
                if (!transformedRecord.record_type) {
                    if (transformedRecord.absence_days > 0) {
                        transformedRecord.record_type = 'absence';
                        transformedRecord.worked_days = transformedRecord.period_days - transformedRecord.absence_days;
                    } else {
                        transformedRecord.record_type = 'attendance';
                        if (transformedRecord.worked_days === undefined) {
                            transformedRecord.worked_days = transformedRecord.period_days;
                        }
                    }
                }
                
                // Add to totals for display purposes
                if (transformedRecord.worked_days >= 0 && transformedRecord.period_days > 0) {
                    actualWorkedDays += transformedRecord.worked_days;
                    actualPeriodDays += transformedRecord.period_days;
                }
            }
            
            return {
                employee_id: employeeId,
                basic_salary: employee.basic_salary || employee.base_salary,
                total_earned_salary: 0,
                total_worked_days: actualWorkedDays, // Show actual worked days
                total_period_days: actualPeriodDays, // Show actual period days
                average_daily_rate: 0,
                salary_breakdown: [],
                attendance_records_count: attendanceRecords.length,
                calculation_valid: false,
                validation_error: 'Calculation preconditions not met'
            };
        }

        // Transform and filter valid attendance records for payroll
        const validRecords = [];
        
        for (const record of attendanceRecords) {
            // Transform old data format to new format
            const transformedRecord = { ...record.toObject ? record.toObject() : record };
            
            // Calculate period_days if missing
            if (!transformedRecord.period_days && transformedRecord.period_start && transformedRecord.period_end) {
                transformedRecord.period_days = this.calculatePeriodDays(transformedRecord.period_start, transformedRecord.period_end);
            }
            
            // Handle old working_days field
            if (transformedRecord.worked_days === undefined && transformedRecord.working_days !== undefined) {
                transformedRecord.worked_days = transformedRecord.working_days;
            }
            
            // Handle old absence_days logic
            if (!transformedRecord.record_type) {
                if (transformedRecord.absence_days > 0) {
                    transformedRecord.record_type = 'absence';
                    transformedRecord.worked_days = transformedRecord.period_days - transformedRecord.absence_days;
                } else {
                    transformedRecord.record_type = 'attendance';
                    // If no worked_days and no absence_days, assume full attendance
                    if (transformedRecord.worked_days === undefined) {
                        transformedRecord.worked_days = transformedRecord.period_days;
                    }
                }
            }
            
            // Validate the transformed record
            if (this.validateAttendanceRecordForPayroll(transformedRecord)) {
                validRecords.push(transformedRecord);
            }
        }
        
        if (validRecords.length === 0) {
            return {
                employee_id: employeeId,
                basic_salary: employee.basic_salary || employee.base_salary,
                total_earned_salary: 0,
                total_worked_days: 0,
                total_period_days: 0,
                average_daily_rate: 0,
                salary_breakdown: [],
                attendance_records_count: attendanceRecords.length,
                calculation_valid: false,
                validation_error: 'No valid attendance records for payroll'
            };
        }
        
        let totalEarnedSalary = 0;
        let totalWorkedDays = 0;
        let totalPeriodDays = 0;
        
        const salary = employee.basic_salary || employee.base_salary || 0;
        
        const salaryBreakdown = validRecords.map(record => {
            const earnedForPeriod = this.calculateEarnedSalary(
                salary,
                record.worked_days,
                record.period_days
            );
            
            totalEarnedSalary += earnedForPeriod;
            totalWorkedDays += record.worked_days;
            totalPeriodDays += record.period_days;
            
            return {
                period_start: record.period_start,
                period_end: record.period_end,
                period_days: record.period_days,
                worked_days: record.worked_days,
                daily_rate: this.calculateDailyRate(salary, record.period_days),
                earned_salary: earnedForPeriod,
                record_type: record.record_type,
                attendance_days: record.attendance_days,
                absence_days: record.absence_days
            };
        });

        return {
            employee_id: employeeId,
            basic_salary: salary,
            total_earned_salary: Math.round(totalEarnedSalary * 100) / 100,
            total_worked_days: totalWorkedDays,
            total_period_days: totalPeriodDays,
            average_daily_rate: totalPeriodDays > 0 ? this.calculateDailyRate(salary, totalPeriodDays / validRecords.length) : 0,
            salary_breakdown: salaryBreakdown,
            attendance_records_count: attendanceRecords.length,
            calculation_valid: true
        };
    }

    /**
     * Calculate employee balance (payments vs earned salary)
     * @param {string} employeeId - Employee ID
     * @returns {Promise<Object>} Balance calculation
     */
    static async calculateEmployeeBalance(employeeId) {
        // Get salary calculation
        const salaryData = await this.calculateTotalEarnedSalary(employeeId);
        
        // Get payments
        const payments = await EmployeePayment.find({ employee_id: employeeId });
        const totalPayments = payments.reduce((sum, p) => sum + toNumber(p.amount), 0);
        
        // Get adjustments
        const adjustments = await Adjustment.find({ 
            entity_type: 'employee', 
            entity_id: employeeId 
        });
        const totalAdjustments = adjustments.reduce((sum, a) => sum + toNumber(a.amount), 0);
        
        // SAFETY GUARD: If earned salary is 0 or calculation invalid, force balance to 0
        if (!salaryData.calculation_valid || salaryData.total_earned_salary === 0) {
            return {
                employee_id: employeeId,
                total_earned_salary: 0,
                total_payments: Math.round(totalPayments * 100) / 100,
                total_adjustments: Math.round(totalAdjustments * 100) / 100,
                balance: 0,
                balance_status: 'neutral',
                balance_description: 'متوازن',
                salary_details: salaryData,
                calculation_valid: false,
                validation_error: salaryData.validation_error || 'No earned salary calculated'
            };
        }
        
        // Calculate balance: payments - (earned_salary + adjustments)
        // Adjustments are added to earned salary:
        // - Positive adjustments (bonuses) increase what employee should get
        // - Negative adjustments (deductions) decrease what employee should get
        // Balance = payments - (earned + adjustments)
        // Negative balance = due to employee, Positive balance = overpaid
        const balance = totalPayments - (salaryData.total_earned_salary + totalAdjustments);
        
        return {
            employee_id: employeeId,
            total_earned_salary: salaryData.total_earned_salary,
            total_payments: Math.round(totalPayments * 100) / 100,
            total_adjustments: Math.round(totalAdjustments * 100) / 100,
            balance: Math.round(balance * 100) / 100,
            balance_status: balance > 0 ? 'overpaid' : balance < 0 ? 'due_to_employee' : 'balanced',
            balance_description: balance > 0 ? 'مدفوع زائد' : balance < 0 ? 'مستحق للموظف' : 'متوازن',
            salary_details: salaryData,
            calculation_valid: true
        };
    }

    /**
     * Validate attendance record before saving (for form submissions)
     * @param {Object} attendanceData - Attendance data to validate
     * @returns {Object} Validated and processed attendance data
     */
    static validateAttendanceRecordForSaving(attendanceData) {
        const { period_start, period_end, record_type, attendance_days, absence_days } = attendanceData;
        
        // Calculate period days
        const start = new Date(period_start);
        const end = new Date(period_end);
        const periodDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        
        // Validation
        if (periodDays <= 0) {
            throw new Error('Invalid period: end date must be after start date');
        }
        
        if (record_type === 'attendance') {
            if (attendance_days === null || attendance_days === undefined) {
                throw new Error('Attendance days must be specified when recording attendance');
            }
            if (attendance_days > periodDays) {
                throw new Error(`Attendance days (${attendance_days}) cannot exceed period days (${periodDays})`);
            }
            if (attendance_days < 0) {
                throw new Error('Attendance days cannot be negative');
            }
            
            return {
                ...attendanceData,
                period_days: periodDays,
                worked_days: attendance_days,
                absence_days: null
            };
        } else if (record_type === 'absence') {
            if (absence_days === null || absence_days === undefined) {
                throw new Error('Absence days must be specified when recording absence');
            }
            if (absence_days > periodDays) {
                throw new Error(`Absence days (${absence_days}) cannot exceed period days (${periodDays})`);
            }
            if (absence_days < 0) {
                throw new Error('Absence days cannot be negative');
            }
            
            const workedDays = periodDays - absence_days;
            
            return {
                ...attendanceData,
                period_days: periodDays,
                worked_days: workedDays,
                attendance_days: null
            };
        } else {
            throw new Error('Record type must be either "attendance" or "absence"');
        }
    }

    /**
     * Get payroll summary for all employees (with dashboard safety guards)
     * @returns {Promise<Array>} Array of employee payroll summaries
     */
    static async getPayrollSummary() {
        const employees = await Employee.find({ status: 'Active' });
        
        const summaries = await Promise.all(
            employees.map(async (employee) => {
                try {
                    const balance = await this.calculateEmployeeBalance(employee._id);
                    return {
                        employee_id: employee._id,
                        employee_name: employee.name,
                        job_title: employee.job_title,
                        basic_salary: employee.basic_salary,
                        ...balance
                    };
                } catch (error) {
                    return {
                        employee_id: employee._id,
                        employee_name: employee.name,
                        job_title: employee.job_title,
                        basic_salary: employee.basic_salary,
                        error: error.message,
                        total_earned_salary: 0,
                        total_payments: 0,
                        total_adjustments: 0,
                        balance: 0,
                        balance_status: 'error',
                        calculation_valid: false
                    };
                }
            })
        );
        
        return summaries;
    }

    /**
     * Get dashboard-safe employee totals (only valid calculations)
     * @returns {Promise<Object>} Aggregated totals for dashboard
     */
    static async getDashboardSafeTotals() {
        const summaries = await this.getPayrollSummary();
        
        // SAFETY GUARD: Only include employees with valid calculations and earned salary > 0
        const validEmployees = summaries.filter(emp => 
            emp.calculation_valid !== false && 
            emp.total_earned_salary > 0
        );
        
        const totals = validEmployees.reduce((acc, emp) => {
            acc.totalEarnedSalary += emp.total_earned_salary;
            acc.totalPayments += emp.total_payments;
            acc.totalAdjustments += emp.total_adjustments;
            acc.netEmployeeCosts += Math.max(0, emp.total_earned_salary - emp.total_payments - emp.total_adjustments);
            acc.validEmployeeCount += 1;
            return acc;
        }, {
            totalEarnedSalary: 0,
            totalPayments: 0,
            totalAdjustments: 0,
            netEmployeeCosts: 0,
            validEmployeeCount: 0,
            totalEmployeeCount: summaries.length
        });
        
        return {
            ...totals,
            totalEarnedSalary: Math.round(totals.totalEarnedSalary * 100) / 100,
            totalPayments: Math.round(totals.totalPayments * 100) / 100,
            totalAdjustments: Math.round(totals.totalAdjustments * 100) / 100,
            netEmployeeCosts: Math.round(totals.netEmployeeCosts * 100) / 100
        };
    }
}

module.exports = PayrollService;