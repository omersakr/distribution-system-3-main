const administrationService = require('../services/administrationService');
const { Client, Project } = require('../models');

class AdministrationController {
    // Get all administration entities
    async getAllAdministration(req, res, next) {
        try {
            const result = await administrationService.getAllAdministration();
            res.json(result);
        } catch (err) {
            next(err);
        }
    }

    // Get administration by ID
    async getAdministrationById(req, res, next) {
        try {
            const administration = await administrationService.getAdministrationById(req.params.id);

            if (!administration) {
                return res.status(404).json({ message: 'الإدارة غير موجودة' });
            }

            res.json(administration);
        } catch (err) {
            next(err);
        }
    }

    // Create new administration
    async createAdministration(req, res, next) {
        try {
            const { name, type, phone_number, notes, status } = req.body;

            if (!name || name.trim() === '') {
                return res.status(400).json({ message: 'اسم الإدارة مطلوب' });
            }

            if (!type || !['Partner', 'Funder'].includes(type)) {
                return res.status(400).json({ message: 'نوع الإدارة يجب أن يكون Partner أو Funder' });
            }

            const administration = await administrationService.createAdministration({
                name: name.trim(),
                type,
                phone_number: phone_number?.trim(),
                notes: notes?.trim(),
                status: status || 'Active'
            });

            res.status(201).json(administration);
        } catch (err) {
            if (err.code === 11000) {
                return res.status(400).json({ message: 'اسم الإدارة موجود بالفعل' });
            }
            next(err);
        }
    }

    // Update administration
    async updateAdministration(req, res, next) {
        try {
            const { name, type, phone_number, notes, status } = req.body;

            if (!name || name.trim() === '') {
                return res.status(400).json({ message: 'اسم الإدارة مطلوب' });
            }

            if (type && !['Partner', 'Funder'].includes(type)) {
                return res.status(400).json({ message: 'نوع الإدارة يجب أن يكون Partner أو Funder' });
            }

            const administration = await administrationService.updateAdministration(req.params.id, {
                name: name.trim(),
                type,
                phone_number: phone_number?.trim(),
                notes: notes?.trim(),
                status: status || 'Active'
            });

            if (!administration) {
                return res.status(404).json({ message: 'الإدارة غير موجودة' });
            }

            res.json(administration);
        } catch (err) {
            if (err.code === 11000) {
                return res.status(400).json({ message: 'اسم الإدارة موجود بالفعل' });
            }
            next(err);
        }
    }

    // Delete administration
    async deleteAdministration(req, res, next) {
        try {
            const administration = await administrationService.deleteAdministration(req.params.id);

            if (!administration) {
                return res.status(404).json({ message: 'الإدارة غير موجودة' });
            }

            res.json({ message: 'تم حذف الإدارة بنجاح' });
        } catch (err) {
            if (err.message.includes('لا يمكن حذف الإدارة')) {
                return res.status(400).json({ message: err.message });
            }
            next(err);
        }
    }

    // ============================================================================
    // ADMINISTRATION PAYMENTS MANAGEMENT
    // ============================================================================

    // Add administration payment
    async addAdministrationPayment(req, res, next) {
        try {
            const { amount, method, details, note, payment_image, paid_at } = req.body;

            if (!amount || amount <= 0) {
                return res.status(400).json({ message: 'مبلغ الدفع مطلوب ويجب أن يكون أكبر من صفر' });
            }

            const payment = await administrationService.addAdministrationPayment(req.params.id, {
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

    // Update administration payment
    async updateAdministrationPayment(req, res, next) {
        try {
            const { amount, method, details, note, payment_image, paid_at } = req.body;

            if (!amount || amount <= 0) {
                return res.status(400).json({ message: 'مبلغ الدفع مطلوب ويجب أن يكون أكبر من صفر' });
            }

            const payment = await administrationService.updateAdministrationPayment(
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

    // Delete administration payment
    async deleteAdministrationPayment(req, res, next) {
        try {
            const payment = await administrationService.deleteAdministrationPayment(
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
    // CAPITAL INJECTION MANAGEMENT
    // ============================================================================

    // Add capital injection
    async addCapitalInjection(req, res, next) {
        try {
            const { amount, project_id, date, notes } = req.body;

            if (!amount || amount <= 0) {
                return res.status(400).json({ message: 'مبلغ ضخ رأس المال مطلوب ويجب أن يكون أكبر من صفر' });
            }

            if (!project_id) {
                return res.status(400).json({ message: 'المشروع مطلوب' });
            }

            // Verify project exists
            const project = await Project.findById(project_id);
            if (!project) {
                return res.status(400).json({ message: 'المشروع غير موجود' });
            }

            const injection = await administrationService.addCapitalInjection(req.params.id, {
                amount: parseFloat(amount),
                project_id,
                date: date ? new Date(date) : new Date(),
                notes: notes?.trim()
            });

            res.status(201).json(injection);
        } catch (err) {
            next(err);
        }
    }

    // Update capital injection
    async updateCapitalInjection(req, res, next) {
        try {
            const { amount, project_id, date, notes } = req.body;

            if (!amount || amount <= 0) {
                return res.status(400).json({ message: 'مبلغ ضخ رأس المال مطلوب ويجب أن يكون أكبر من صفر' });
            }

            if (!project_id) {
                return res.status(400).json({ message: 'المشروع مطلوب' });
            }

            // Verify project exists
            const project = await Project.findById(project_id);
            if (!project) {
                return res.status(400).json({ message: 'المشروع غير موجود' });
            }

            const injection = await administrationService.updateCapitalInjection(
                req.params.id,
                req.params.injectionId,
                {
                    amount: parseFloat(amount),
                    project_id,
                    date: date ? new Date(date) : undefined,
                    notes: notes?.trim()
                }
            );

            if (!injection) {
                return res.status(404).json({ message: 'سجل ضخ رأس المال غير موجود' });
            }

            res.json(injection);
        } catch (err) {
            next(err);
        }
    }

    // Delete capital injection
    async deleteCapitalInjection(req, res, next) {
        try {
            const injection = await administrationService.deleteCapitalInjection(
                req.params.id,
                req.params.injectionId
            );

            if (!injection) {
                return res.status(404).json({ message: 'سجل ضخ رأس المال غير موجود' });
            }

            res.json({ message: 'تم حذف سجل ضخ رأس المال بنجاح' });
        } catch (err) {
            next(err);
        }
    }

    // ============================================================================
    // WITHDRAWAL MANAGEMENT
    // ============================================================================

    // Add withdrawal
    async addWithdrawal(req, res, next) {
        try {
            const { amount, project_id, date, notes } = req.body;

            if (!amount || amount <= 0) {
                return res.status(400).json({ message: 'مبلغ المسحوبات مطلوب ويجب أن يكون أكبر من صفر' });
            }

            if (!project_id) {
                return res.status(400).json({ message: 'المشروع مطلوب' });
            }

            // Verify project exists
            const project = await Project.findById(project_id);
            if (!project) {
                return res.status(400).json({ message: 'المشروع غير موجود' });
            }

            const withdrawal = await administrationService.addWithdrawal(req.params.id, {
                amount: parseFloat(amount),
                project_id,
                date: date ? new Date(date) : new Date(),
                notes: notes?.trim()
            });

            res.status(201).json(withdrawal);
        } catch (err) {
            next(err);
        }
    }

    // Update withdrawal
    async updateWithdrawal(req, res, next) {
        try {
            const { amount, project_id, date, notes } = req.body;

            if (!amount || amount <= 0) {
                return res.status(400).json({ message: 'مبلغ المسحوبات مطلوب ويجب أن يكون أكبر من صفر' });
            }

            if (!project_id) {
                return res.status(400).json({ message: 'المشروع مطلوب' });
            }

            // Verify project exists
            const project = await Project.findById(project_id);
            if (!project) {
                return res.status(400).json({ message: 'المشروع غير موجود' });
            }

            const withdrawal = await administrationService.updateWithdrawal(
                req.params.id,
                req.params.withdrawalId,
                {
                    amount: parseFloat(amount),
                    project_id,
                    date: date ? new Date(date) : undefined,
                    notes: notes?.trim()
                }
            );

            if (!withdrawal) {
                return res.status(404).json({ message: 'سجل المسحوبات غير موجود' });
            }

            res.json(withdrawal);
        } catch (err) {
            next(err);
        }
    }

    // Delete withdrawal
    async deleteWithdrawal(req, res, next) {
        try {
            const withdrawal = await administrationService.deleteWithdrawal(
                req.params.id,
                req.params.withdrawalId
            );

            if (!withdrawal) {
                return res.status(404).json({ message: 'سجل المسحوبات غير موجود' });
            }

            res.json({ message: 'تم حذف سجل المسحوبات بنجاح' });
        } catch (err) {
            next(err);
        }
    }

    // Global methods to get all withdrawals and capital injections
    async getAllWithdrawals(req, res, next) {
        try {
            const withdrawals = await administrationService.getAllWithdrawals();
            res.json({ withdrawals });
        } catch (err) {
            next(err);
        }
    }

    async getAllCapitalInjections(req, res, next) {
        try {
            const capitalInjections = await administrationService.getAllCapitalInjections();
            res.json({ capital_injections: capitalInjections });
        } catch (err) {
            next(err);
        }
    }
}

module.exports = new AdministrationController();