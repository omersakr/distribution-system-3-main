const administrationService = require('../services/administrationService');
const { Client, Project } = require('../models');
const CloudinaryService = require('../services/cloudinaryService');

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

            // Send success response immediately
            res.status(201).json(administration);

            // Log audit event asynchronously
            setImmediate(async () => {
                try {
                    const authService = require('../services/authService');
                    await authService.logAuditEvent(
                        req.user.id,
                        'create',
                        'Administration',
                        administration.id,
                        null,
                        administration,
                        req,
                        name.trim()
                    );
                } catch (auditError) {
                    console.error('❌ Audit logging failed for administration creation:', auditError.message);
                }
            });
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

            // Log audit event
            const authService = require('../services/authService');
            await authService.logAuditEvent(
                req.user.id,
                'update',
                'Administration',
                req.params.id,
                null,
                administration.administration,
                req,
                name.trim()
            );

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

            // Log audit event asynchronously
            setImmediate(async () => {
                try {
                    const authService = require('../services/authService');
                    await authService.logAuditEvent(
                        req.user?.id,
                        'delete',
                        'Administration',
                        req.params.id,
                        administration,
                        null,
                        req,
                        administration.name
                    );
                } catch (auditError) {
                    console.error('❌ Audit logging failed for administration deletion:', auditError.message);
                }
            });
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

            let imageData = null;
            
            if (payment_image) {
                try {
                    imageData = await CloudinaryService.uploadBase64Image(
                        payment_image,
                        `administration/${req.params.id}/payments`
                    );
                } catch (error) {
                    console.error('Image upload failed:', error);
                    return res.status(400).json({ 
                        message: 'فشل رفع الصورة: ' + error.message 
                    });
                }
            }

            const payment = await administrationService.addAdministrationPayment(req.params.id, {
                amount: parseFloat(amount),
                method: method?.trim(),
                details: details?.trim(),
                note: note?.trim(),
                payment_image_url: imageData?.url,
                payment_image_public_id: imageData?.publicId,
                payment_image_thumbnail: imageData?.thumbnailUrl,
                paid_at: paid_at ? new Date(paid_at) : new Date()
            });

            // Get administration name for audit log
            const administration = await administrationService.getAdministrationById(req.params.id);
            const adminName = administration && administration.administration ? administration.administration.name : 'إدارة';

            // Log audit event
            const authService = require('../services/authService');
            await authService.logAuditEvent(
                req.user.id,
                'create',
                'AdministrationPayment',
                payment.id || payment._id,
                null,
                payment,
                req,
                `دفعة من ${adminName}`
            );

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

            let imageData = null;
            
            if (payment_image) {
                try {
                    const oldPayment = await administrationService.getPaymentById(req.params.id, req.params.paymentId);
                    
                    imageData = await CloudinaryService.uploadBase64Image(
                        payment_image,
                        `administration/${req.params.id}/payments`
                    );
                    
                    if (oldPayment && oldPayment.payment_image_public_id) {
                        await CloudinaryService.deleteImage(oldPayment.payment_image_public_id);
                    }
                } catch (error) {
                    console.error('Image upload failed:', error);
                    return res.status(400).json({ 
                        message: 'فشل رفع الصورة: ' + error.message 
                    });
                }
            }

            const updateData = {
                amount: parseFloat(amount),
                method: method?.trim(),
                details: details?.trim(),
                note: note?.trim(),
                paid_at: paid_at ? new Date(paid_at) : undefined
            };

            if (imageData) {
                updateData.payment_image_url = imageData.url;
                updateData.payment_image_public_id = imageData.publicId;
                updateData.payment_image_thumbnail = imageData.thumbnailUrl;
            }

            const payment = await administrationService.updateAdministrationPayment(
                req.params.id,
                req.params.paymentId,
                updateData
            );

            if (!payment) {
                return res.status(404).json({ message: 'الدفعة غير موجودة' });
            }

            // Get administration name for audit log
            const administration = await administrationService.getAdministrationById(req.params.id);
            const adminName = administration && administration.administration ? administration.administration.name : 'إدارة';

            // Log audit event
            const authService = require('../services/authService');
            await authService.logAuditEvent(
                req.user.id,
                'update',
                'AdministrationPayment',
                req.params.paymentId,
                null,
                payment,
                req,
                `دفعة من ${adminName}`
            );

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

            // Get administration name for audit log
            const administration = await administrationService.getAdministrationById(req.params.id);
            const adminName = administration && administration.administration ? administration.administration.name : 'إدارة';

            // Log audit event
            const authService = require('../services/authService');
            await authService.logAuditEvent(
                req.user.id,
                'delete',
                'AdministrationPayment',
                req.params.paymentId,
                payment.toJSON(),
                null,
                req,
                `دفعة من ${adminName}`
            );

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

            // Verify client exists (clients are projects in this system)
            const client = await Client.findById(project_id);
            if (!client) {
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

            // Verify client exists (clients are projects in this system)
            const client = await Client.findById(project_id);
            if (!client) {
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

            // Verify client exists (clients are projects in this system)
            const client = await Client.findById(project_id);
            if (!client) {
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

            // Verify client exists (clients are projects in this system)
            const client = await Client.findById(project_id);
            if (!client) {
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