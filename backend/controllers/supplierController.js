const supplierService = require('../services/supplierService');

class SupplierController {
    // Get all suppliers
    async getAllSuppliers(req, res, next) {
        try {
            const result = await supplierService.getAllSuppliers();
            res.json(result);
        } catch (err) {
            next(err);
        }
    }

    // Get supplier by ID
    async getSupplierById(req, res, next) {
        try {
            const supplier = await supplierService.getSupplierById(req.params.id);

            if (!supplier) {
                return res.status(404).json({ message: 'المورد غير موجود' });
            }

            res.json(supplier);
        } catch (err) {
            next(err);
        }
    }

    // Create new supplier
    async createSupplier(req, res, next) {
        try {
            const { name, phone_number, notes, materials, status } = req.body;

            if (!name || name.trim() === '') {
                return res.status(400).json({ message: 'اسم المورد مطلوب' });
            }

            // Validate materials
            if (!materials || !Array.isArray(materials) || materials.length === 0) {
                return res.status(400).json({ message: 'يجب إضافة مادة واحدة على الأقل' });
            }

            for (const material of materials) {
                if (!material.name || material.name.trim() === '') {
                    return res.status(400).json({ message: 'اسم المادة مطلوب' });
                }
                if (!material.price_per_unit || material.price_per_unit <= 0) {
                    return res.status(400).json({ message: 'سعر المادة مطلوب ويجب أن يكون أكبر من صفر' });
                }
            }

            const supplier = await supplierService.createSupplier({
                name: name.trim(),
                phone_number: phone_number?.trim(),
                notes: notes?.trim(),
                materials: materials.map(m => ({
                    name: m.name.trim(),
                    price_per_unit: parseFloat(m.price_per_unit)
                })),
                status: status || 'Active'
            });

            res.status(201).json(supplier);
        } catch (err) {
            if (err.code === 11000) {
                return res.status(400).json({ message: 'اسم المورد موجود بالفعل' });
            }
            next(err);
        }
    }

    // Update supplier
    async updateSupplier(req, res, next) {
        try {
            const { name, phone_number, notes, materials, status } = req.body;

            if (!name || name.trim() === '') {
                return res.status(400).json({ message: 'اسم المورد مطلوب' });
            }

            // Validate materials if provided
            if (materials) {
                if (!Array.isArray(materials) || materials.length === 0) {
                    return res.status(400).json({ message: 'يجب إضافة مادة واحدة على الأقل' });
                }

                for (const material of materials) {
                    if (!material.name || material.name.trim() === '') {
                        return res.status(400).json({ message: 'اسم المادة مطلوب' });
                    }
                    if (!material.price_per_unit || material.price_per_unit <= 0) {
                        return res.status(400).json({ message: 'سعر المادة مطلوب ويجب أن يكون أكبر من صفر' });
                    }
                }
            }

            const updateData = {
                name: name.trim(),
                phone_number: phone_number?.trim(),
                notes: notes?.trim(),
                status: status || 'Active'
            };

            if (materials) {
                updateData.materials = materials.map(m => ({
                    name: m.name.trim(),
                    price_per_unit: parseFloat(m.price_per_unit)
                }));
            }

            const supplier = await supplierService.updateSupplier(req.params.id, updateData);

            if (!supplier) {
                return res.status(404).json({ message: 'المورد غير موجود' });
            }

            res.json(supplier);
        } catch (err) {
            if (err.code === 11000) {
                return res.status(400).json({ message: 'اسم المورد موجود بالفعل' });
            }
            next(err);
        }
    }

    // Delete supplier
    async deleteSupplier(req, res, next) {
        try {
            const supplier = await supplierService.deleteSupplier(req.params.id);

            if (!supplier) {
                return res.status(404).json({ message: 'المورد غير موجود' });
            }

            res.json({ message: 'تم حذف المورد بنجاح' });
        } catch (err) {
            if (err.message.includes('لا يمكن حذف المورد')) {
                return res.status(400).json({ message: err.message });
            }
            next(err);
        }
    }

    // ============================================================================
    // SUPPLIER PAYMENTS MANAGEMENT
    // ============================================================================

    // Add supplier payment
    async addSupplierPayment(req, res, next) {
        try {
            const { amount, method, details, note, payment_image, paid_at } = req.body;

            if (!amount || amount <= 0) {
                return res.status(400).json({ message: 'مبلغ الدفع مطلوب ويجب أن يكون أكبر من صفر' });
            }

            const payment = await supplierService.addSupplierPayment(req.params.id, {
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

    // Update supplier payment
    async updateSupplierPayment(req, res, next) {
        try {
            const { amount, method, details, note, payment_image, paid_at } = req.body;

            if (!amount || amount <= 0) {
                return res.status(400).json({ message: 'مبلغ الدفع مطلوب ويجب أن يكون أكبر من صفر' });
            }

            const payment = await supplierService.updateSupplierPayment(
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

    // Delete supplier payment
    async deleteSupplierPayment(req, res, next) {
        try {
            const payment = await supplierService.deleteSupplierPayment(
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
}

module.exports = new SupplierController();