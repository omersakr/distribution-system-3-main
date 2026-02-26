const { Supplier, Delivery, SupplierPayment } = require('../models');

const toNumber = (v) => Number(v || 0);

class SupplierService {
    static async getAllSuppliers() {
        const suppliers = await Supplier.find().sort({ name: 1 });

        // Calculate totals for each supplier (same logic as crushers)
        const result = await Promise.all(
            suppliers.map(async (supplier) => {
                try {
                    // Get deliveries for this supplier
                    const deliveries = await Delivery.find({
                        supplier_id: supplier._id
                    });

                    // Calculate total due (what we owe supplier)
                    const totalDue = deliveries.reduce((sum, delivery) => {
                        const netQuantity = toNumber(delivery.car_volume) - toNumber(delivery.discount_volume);
                        const materialPrice = toNumber(delivery.material_price_at_time);
                        return sum + (netQuantity * materialPrice);
                    }, 0);

                    // Get payments made to supplier
                    const payments = await SupplierPayment.find({
                        supplier_id: supplier._id
                    });
                    const totalPaid = payments.reduce((sum, p) => sum + toNumber(p.amount), 0);

                    // Get adjustments
                    const { Adjustment, SupplierOpeningBalance } = require('../models');
                    const adjustments = await Adjustment.find({
                        entity_type: 'supplier',
                        entity_id: supplier._id
                    });
                    const totalAdjustments = adjustments.reduce((sum, a) => sum + toNumber(a.amount), 0);

                    // Get project-based opening balances
                    const openingBalances = await SupplierOpeningBalance.find({
                        supplier_id: supplier._id,
                        is_deleted: false
                    });
                    
                    // Sum all project-based opening balances
                    const openingBalance = openingBalances.reduce((sum, ob) => sum + toNumber(ob.amount), 0);
                    
                    // Calculate balance (including opening balance and adjustments)
                    const balance = openingBalance + totalDue + totalAdjustments - totalPaid;

                    return {
                        id: supplier._id,
                        name: supplier.name,
                        phone_number: supplier.phone_number,
                        notes: supplier.notes,
                        opening_balance: supplier.opening_balance,
                        materials: supplier.materials,
                        status: supplier.status,
                        created_at: supplier.created_at,
                        // Financial calculations
                        balance: Math.round(balance * 100) / 100,
                        balance_status: balance > 0 ? 'payable' : balance < 0 ? 'overpaid' : 'balanced',
                        balance_description: balance > 0 ? 'مستحق الدفع' : balance < 0 ? 'مدفوع زائد' : 'متوازن',
                        total_due: Math.round(totalDue * 100) / 100,
                        total_paid: Math.round(totalPaid * 100) / 100,
                        deliveries_count: deliveries.length
                    };
                } catch (error) {
                    return {
                        id: supplier._id,
                        name: supplier.name,
                        phone_number: supplier.phone_number,
                        notes: supplier.notes,
                        opening_balance: supplier.opening_balance,
                        materials: supplier.materials,
                        status: supplier.status,
                        created_at: supplier.created_at,
                        balance: 0,
                        balance_status: 'error',
                        balance_description: 'خطأ في الحساب',
                        total_due: 0,
                        total_paid: 0,
                        deliveries_count: 0,
                        error: error.message
                    };
                }
            })
        );

        return { suppliers: result };
    }

    static async getSupplierById(id) {
        const supplier = await Supplier.findById(id);

        if (!supplier) {
            return null;
        }

        // Get related data
        const deliveries = await Delivery.find({
            supplier_id: id
        }).populate('client_id', 'name').sort({ created_at: -1 });

        const payments = await SupplierPayment.find({
            supplier_id: id
        }).sort({ paid_at: -1 });

        const { Adjustment, SupplierOpeningBalance } = require('../models');
        const adjustments = await Adjustment.find({
            entity_type: 'supplier',
            entity_id: id
        }).sort({ created_at: -1 });

        // Get opening balances
        const openingBalances = await SupplierOpeningBalance.find({
            supplier_id: id,
            is_deleted: false
        }).populate('project_id', 'name').sort({ created_at: -1 });

        // Calculate totals (including opening balance)
        // Sum all project-based opening balances
        const openingBalance = openingBalances.reduce((sum, ob) => sum + toNumber(ob.amount), 0);
        
        const totalDue = deliveries.reduce((sum, delivery) => {
            const netQuantity = toNumber(delivery.car_volume) - toNumber(delivery.discount_volume);
            const materialPrice = toNumber(delivery.material_price_at_time);
            return sum + (netQuantity * materialPrice);
        }, 0);

        const totalPaid = payments.reduce((sum, p) => sum + toNumber(p.amount), 0);
        const totalAdjustments = adjustments.reduce((sum, a) => sum + toNumber(a.amount), 0);
        const balance = openingBalance + totalDue + totalAdjustments - totalPaid;

        return {
            supplier: {
                id: supplier._id,
                name: supplier.name,
                phone_number: supplier.phone_number,
                notes: supplier.notes,
                opening_balance: supplier.opening_balance,
                materials: supplier.materials,
                status: supplier.status,
                created_at: supplier.created_at
            },
            opening_balances: openingBalances.map(ob => ({
                id: ob._id,
                project_id: ob.project_id?._id || ob.project_id,
                project_name: ob.project_id?.name || 'مشروع محذوف',
                amount: ob.amount,
                description: ob.description,
                date: ob.date,
                created_at: ob.created_at
            })),
            deliveries: deliveries.map(d => ({
                id: d._id,
                delivery_date: d.created_at, // Use created_at since there's no delivery_date field
                client_name: d.client_id?.name || 'عميل محذوف',
                material_type: d.material, // Use material field
                car_volume: d.car_volume,
                discount_volume: d.discount_volume,
                net_quantity: toNumber(d.car_volume) - toNumber(d.discount_volume),
                material_price_at_time: d.material_price_at_time,
                total_cost: (toNumber(d.car_volume) - toNumber(d.discount_volume)) * toNumber(d.material_price_at_time),
                voucher: d.voucher,
                notes: d.notes
            })),
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
                reason: a.reason,
                method: a.method,
                details: a.details,
                payment_image: a.payment_image,
                created_at: a.created_at
            })),
            totals: {
                opening_balance: Math.round(openingBalance * 100) / 100,
                balance: Math.round(balance * 100) / 100,
                balance_status: balance > 0 ? 'payable' : balance < 0 ? 'overpaid' : 'balanced',
                balance_description: balance > 0 ? 'مستحق الدفع' : balance < 0 ? 'مدفوع زائد' : 'متوازن',
                total_due: Math.round(totalDue * 100) / 100,
                total_paid: Math.round(totalPaid * 100) / 100,
                total_adjustments: Math.round(totalAdjustments * 100) / 100,
                deliveries_count: deliveries.length
            }
        };
    }

    static async createSupplier(data) {
        const { SupplierOpeningBalance } = require('../models');

        const supplier = new Supplier(data);
        await supplier.save();

        // Create opening balances if provided
        if (data.opening_balances && Array.isArray(data.opening_balances) && data.opening_balances.length > 0) {
            const openingBalanceDocs = data.opening_balances.map(balance => ({
                supplier_id: supplier._id,
                project_id: balance.project_id,
                amount: toNumber(balance.amount),
                description: balance.description || '',
                date: balance.date || new Date()
            }));

            await SupplierOpeningBalance.insertMany(openingBalanceDocs);
        }

        return {
            id: supplier._id,
            name: supplier.name,
            phone_number: supplier.phone_number,
            notes: supplier.notes,
            opening_balance: supplier.opening_balance,
            materials: supplier.materials,
            status: supplier.status,
            created_at: supplier.created_at
        };
    }

    static async updateSupplier(id, data) {
        const { AuditLog, SupplierOpeningBalance } = require('../models');
        
        // Get the old supplier data before update
        const oldSupplier = await Supplier.findById(id);
        if (!oldSupplier) {
            return null;
        }

        const supplier = await Supplier.findByIdAndUpdate(id, data, { new: true });
        if (!supplier) return null;

        // Handle opening balances if provided
        if (data.opening_balances && Array.isArray(data.opening_balances)) {
            // Get existing opening balances
            const existingBalances = await SupplierOpeningBalance.find({
                supplier_id: id,
                is_deleted: false
            });

            const existingIds = existingBalances.map(b => b._id.toString());
            const providedIds = data.opening_balances
                .filter(b => b.id)
                .map(b => b.id.toString());

            // Delete opening balances that were removed
            const toDelete = existingIds.filter(id => !providedIds.includes(id));
            if (toDelete.length > 0) {
                await SupplierOpeningBalance.updateMany(
                    { _id: { $in: toDelete } },
                    { is_deleted: true, deleted_at: new Date() }
                );
            }

            // Update or create opening balances
            for (const balance of data.opening_balances) {
                const amount = toNumber(balance.amount);
                
                // Validate: positive balance (we owe them) must have project_id
                if (amount > 0 && !balance.project_id) {
                    throw new Error('الرصيد الافتتاحي الموجب يجب أن يكون مرتبطاً بمشروع/عميل');
                }
                
                if (balance.id) {
                    // Update existing
                    await SupplierOpeningBalance.findByIdAndUpdate(balance.id, {
                        project_id: amount > 0 ? balance.project_id : null,  // Only link if positive
                        amount: amount,
                        description: balance.description || ''
                    });
                } else {
                    // Create new
                    await SupplierOpeningBalance.create({
                        supplier_id: id,
                        project_id: amount > 0 ? balance.project_id : null,  // Only link if positive
                        amount: amount,
                        description: balance.description || '',
                        date: new Date()
                    });
                }
            }

            // Log opening balance changes
            try {
                await AuditLog.create({
                    user_id: data.userId || null,
                    user_role: data.userRole || 'unknown',
                    action_type: 'update',
                    entity_type: 'supplier',
                    entity_id: id,
                    entity_name: supplier.name,
                    description: `تعديل الأرصدة الافتتاحية للمورد "${supplier.name}"`,
                    ip_address: data.ipAddress || null,
                    user_agent: data.userAgent || null
                });
            } catch (auditError) {
                console.error('Failed to create audit log:', auditError);
            }
        }

        return {
            id: supplier._id,
            name: supplier.name,
            phone_number: supplier.phone_number,
            notes: supplier.notes,
            opening_balance: supplier.opening_balance,
            materials: supplier.materials,
            status: supplier.status,
            created_at: supplier.created_at
        };
    }

    static async deleteSupplier(id) {
        // Check if supplier has related records
        const deliveriesCount = await Delivery.countDocuments({ supplier_id: id });
        const paymentsCount = await SupplierPayment.countDocuments({
            supplier_id: id
        });

        if (deliveriesCount > 0 || paymentsCount > 0) {
            throw new Error('لا يمكن حذف المورد لوجود سجلات مرتبطة به');
        }

        const supplier = await Supplier.findByIdAndDelete(id);
        return supplier;
    }

    // ============================================================================
    // SUPPLIER MATERIALS MANAGEMENT
    // ============================================================================

    static async addSupplierMaterial(supplierId, materialData) {
        const supplier = await Supplier.findById(supplierId);
        if (!supplier) {
            throw new Error('المورد غير موجود');
        }

        // Check if material name already exists for this supplier
        const existingMaterial = supplier.materials.find(
            m => m.name.toLowerCase() === materialData.name.toLowerCase()
        );

        if (existingMaterial) {
            throw new Error('المادة موجودة بالفعل لهذا المورد');
        }

        // Add new material
        supplier.materials.push(materialData);
        await supplier.save();

        // Return the newly added material
        const newMaterial = supplier.materials[supplier.materials.length - 1];
        return {
            id: newMaterial._id,
            name: newMaterial.name,
            price_per_unit: newMaterial.price_per_unit
        };
    }

    static async updateSupplierMaterial(supplierId, materialId, materialData) {
        const supplier = await Supplier.findById(supplierId);
        if (!supplier) {
            throw new Error('المورد غير موجود');
        }

        // Find the material
        const material = supplier.materials.id(materialId);
        if (!material) {
            return null;
        }

        // Check if new name conflicts with another material
        if (materialData.name) {
            const existingMaterial = supplier.materials.find(
                m => m._id.toString() !== materialId &&
                    m.name.toLowerCase() === materialData.name.toLowerCase()
            );

            if (existingMaterial) {
                throw new Error('المادة موجودة بالفعل لهذا المورد');
            }
        }

        // Update material
        if (materialData.name) material.name = materialData.name;
        if (materialData.price_per_unit) material.price_per_unit = materialData.price_per_unit;

        await supplier.save();

        return {
            id: material._id,
            name: material.name,
            price_per_unit: material.price_per_unit
        };
    }

    static async deleteSupplierMaterial(supplierId, materialId) {
        const supplier = await Supplier.findById(supplierId);
        if (!supplier) {
            throw new Error('المورد غير موجود');
        }

        // Find the material
        const material = supplier.materials.id(materialId);
        if (!material) {
            return null;
        }

        // Check if material has related deliveries
        const deliveriesCount = await Delivery.countDocuments({
            supplier_id: supplierId,
            material_type: material.name
        });

        if (deliveriesCount > 0) {
            throw new Error('لا يمكن حذف المادة لوجود تسليمات مرتبطة بها');
        }

        // Remove material
        material.remove();
        await supplier.save();

        return {
            id: material._id,
            name: material.name,
            price_per_unit: material.price_per_unit
        };
    }

    // Payment methods (same as crusher payments)
    static async addSupplierPayment(supplierId, paymentData) {
        const payment = new SupplierPayment({
            supplier_id: supplierId,
            ...paymentData
        });
        await payment.save();
        return payment;
    }

    static async updateSupplierPayment(supplierId, paymentId, paymentData) {
        const payment = await SupplierPayment.findOneAndUpdate(
            {
                _id: paymentId,
                supplier_id: supplierId
            },
            paymentData,
            { new: true }
        );
        return payment;
    }

    static async deleteSupplierPayment(supplierId, paymentId) {
        const payment = await SupplierPayment.findOneAndDelete({
            _id: paymentId,
            supplier_id: supplierId
        });
        return payment;
    }

    // ============================================================================
    // SUPPLIER ADJUSTMENTS MANAGEMENT
    // ============================================================================

    static async getSupplierAdjustments(supplierId) {
        const { Adjustment } = require('../models');
        return await Adjustment.find({
            entity_type: 'supplier',
            entity_id: supplierId
        }).sort({ created_at: -1 });
    }

    static async addSupplierAdjustment(supplierId, data) {
        const { Adjustment } = require('../models');
        const adjustment = new Adjustment({
            entity_type: 'supplier',
            entity_id: supplierId,
            ...data
        });

        await adjustment.save();

        return {
            id: adjustment._id,
            entity_type: adjustment.entity_type,
            entity_id: adjustment.entity_id,
            amount: adjustment.amount,
            reason: adjustment.reason,
            method: adjustment.method,
            details: adjustment.details,
            created_at: adjustment.created_at
        };
    }

    static async updateSupplierAdjustment(supplierId, adjustmentId, data) {
        const { Adjustment } = require('../models');
        const adjustment = await Adjustment.findOneAndUpdate(
            {
                _id: adjustmentId,
                entity_type: 'supplier',
                entity_id: supplierId
            },
            data,
            { new: true }
        );

        if (!adjustment) {
            return null;
        }

        return {
            id: adjustment._id,
            entity_type: adjustment.entity_type,
            entity_id: adjustment.entity_id,
            amount: adjustment.amount,
            reason: adjustment.reason,
            method: adjustment.method,
            details: adjustment.details,
            created_at: adjustment.created_at
        };
    }

    static async deleteSupplierAdjustment(supplierId, adjustmentId) {
        const { Adjustment } = require('../models');
        return await Adjustment.findOneAndDelete({
            _id: adjustmentId,
            entity_type: 'supplier',
            entity_id: supplierId
        });
    }

    // Report generation methods
    static async generateDeliveriesReport(supplierId, fromDate, toDate) {
        const supplier = await Supplier.findById(supplierId);
        if (!supplier) {
            throw new Error('المورد غير موجود');
        }

        // Build date filter
        let dateFilter = { supplier_id: supplierId };
        if (fromDate || toDate) {
            dateFilter.created_at = {};
            if (fromDate) dateFilter.created_at.$gte = new Date(fromDate);
            if (toDate) {
                const toDateObj = new Date(toDate);
                toDateObj.setDate(toDateObj.getDate() + 1);
                dateFilter.created_at.$lt = toDateObj;
            }
        }

        // Get deliveries
        const deliveries = await Delivery.find(dateFilter)
            .populate('client_id', 'name')
            .sort({ created_at: -1 });

        // Group by material
        const materialSummary = {};
        let totalQuantity = 0;
        let totalValue = 0;

        deliveries.forEach(delivery => {
            const material = delivery.material || 'غير محدد';
            const netQuantity = toNumber(delivery.car_volume) - toNumber(delivery.discount_volume);
            const materialCost = netQuantity * toNumber(delivery.material_price_at_time);

            if (!materialSummary[material]) {
                materialSummary[material] = {
                    material,
                    quantity: 0,
                    totalCost: 0,
                    deliveries: []
                };
            }

            materialSummary[material].quantity += netQuantity;
            materialSummary[material].totalCost += materialCost;
            materialSummary[material].deliveries.push({
                date: delivery.created_at,
                client_name: delivery.client_id?.name || 'عميل محذوف',
                quantity: netQuantity,
                price: delivery.material_price_at_time,
                total: materialCost,
                voucher: delivery.voucher
            });

            totalQuantity += netQuantity;
            totalValue += materialCost;
        });

        return {
            supplier: {
                id: supplier._id,
                name: supplier.name
            },
            period: {
                from: fromDate,
                to: toDate
            },
            summary: {
                totalQuantity: Math.round(totalQuantity * 100) / 100,
                totalValue: Math.round(totalValue * 100) / 100,
                deliveriesCount: deliveries.length
            },
            materialSummary: Object.values(materialSummary),
            deliveries: deliveries.map(d => ({
                id: d._id,
                date: d.created_at,
                client_name: d.client_id?.name || 'عميل محذوف',
                material: d.material,
                quantity: toNumber(d.car_volume) - toNumber(d.discount_volume),
                price: d.material_price_at_time,
                total: (toNumber(d.car_volume) - toNumber(d.discount_volume)) * toNumber(d.material_price_at_time),
                voucher: d.voucher
            }))
        };
    }

    static async generateAccountStatement(supplierId, fromDate, toDate) {
        const supplier = await Supplier.findById(supplierId);
        if (!supplier) {
            throw new Error('المورد غير موجود');
        }

        // Build date filter
        let dateFilter = { supplier_id: supplierId };
        let paymentDateFilter = { supplier_id: supplierId };
        let adjustmentDateFilter = { entity_type: 'supplier', entity_id: supplierId };

        if (fromDate || toDate) {
            dateFilter.created_at = {};
            paymentDateFilter.paid_at = {};
            adjustmentDateFilter.created_at = {};

            if (fromDate) {
                dateFilter.created_at.$gte = new Date(fromDate);
                paymentDateFilter.paid_at.$gte = new Date(fromDate);
                adjustmentDateFilter.created_at.$gte = new Date(fromDate);
            }
            if (toDate) {
                const toDateObj = new Date(toDate);
                toDateObj.setDate(toDateObj.getDate() + 1);
                dateFilter.created_at.$lt = toDateObj;
                paymentDateFilter.paid_at.$lt = toDateObj;
                adjustmentDateFilter.created_at.$lt = toDateObj;
            }
        }

        // Get deliveries, payments, and adjustments
        const deliveries = await Delivery.find(dateFilter)
            .populate('client_id', 'name')
            .sort({ created_at: 1 });

        const payments = await SupplierPayment.find(paymentDateFilter)
            .sort({ paid_at: 1 });

        const { Adjustment, SupplierOpeningBalance } = require('../models');
        const adjustments = await Adjustment.find(adjustmentDateFilter)
            .sort({ created_at: 1 });

        // Get project-based opening balances
        const openingBalances = await SupplierOpeningBalance.find({
            supplier_id: supplierId,
            is_deleted: false
        });
        
        // Sum all project-based opening balances
        const openingBalance = openingBalances.reduce((sum, ob) => sum + toNumber(ob.amount), 0);
        
        // Calculate totals (including opening balance)
        const totalDue = deliveries.reduce((sum, delivery) => {
            const netQuantity = toNumber(delivery.car_volume) - toNumber(delivery.discount_volume);
            const materialPrice = toNumber(delivery.material_price_at_time);
            return sum + (netQuantity * materialPrice);
        }, 0);

        const totalPaid = payments.reduce((sum, p) => sum + toNumber(p.amount), 0);
        const totalAdjustments = adjustments.reduce((sum, a) => sum + toNumber(a.amount), 0);
        const balance = openingBalance + totalDue + totalAdjustments - totalPaid;

        // Determine date range text
        let dateRangeText = '';
        if (fromDate && toDate) {
            const formatDate = (dateStr) => {
                const date = new Date(dateStr);
                return date.toLocaleDateString('ar-EG', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            };
            dateRangeText = `من ${formatDate(fromDate)} إلى ${formatDate(toDate)}`;
        } else {
            const allDates = [
                ...deliveries.map(d => d.created_at),
                ...payments.map(p => p.paid_at),
                ...adjustments.map(a => a.created_at)
            ].filter(Boolean).sort();

            if (allDates.length > 0) {
                const firstDate = allDates[0];
                const lastDate = allDates[allDates.length - 1];
                const formatDate = (date) => {
                    return date.toLocaleDateString('ar-EG', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                };
                dateRangeText = `من ${formatDate(firstDate)} إلى ${formatDate(lastDate)}`;
            } else {
                dateRangeText = 'جميع البيانات';
            }
        }

        return {
            supplier: {
                id: supplier._id,
                name: supplier.name,
                phone_number: supplier.phone_number,
                opening_balance: supplier.opening_balance
            },
            period: {
                from: fromDate,
                to: toDate,
                isFullHistory: !fromDate && !toDate
            },
            deliveries: deliveries.map(d => ({
                date: d.created_at,
                material: d.material,
                quantity: toNumber(d.car_volume) - toNumber(d.discount_volume),
                price: d.material_price_at_time,
                total: (toNumber(d.car_volume) - toNumber(d.discount_volume)) * toNumber(d.material_price_at_time),
                voucher: d.voucher,
                client_name: d.client_id?.name || '-'
            })),
            payments: payments.map(p => ({
                paid_at: p.paid_at,
                amount: p.amount,
                method: p.method,
                details: p.details,
                note: p.note
            })),
            adjustments: adjustments.map(a => ({
                created_at: a.created_at,
                amount: a.amount,
                method: a.method,
                reason: a.reason
            })),
            summary: {
                openingBalance: Math.round(openingBalance * 100) / 100,
                totalDue: Math.round(totalDue * 100) / 100,
                totalPaid: Math.round(totalPaid * 100) / 100,
                totalAdjustments: Math.round(totalAdjustments * 100) / 100,
                balance: Math.round(balance * 100) / 100,
                balanceStatus: balance > 0 ? 'payable' : balance < 0 ? 'overpaid' : 'balanced',
                balanceDescription: balance > 0 ? 'مستحق للمورد' : balance < 0 ? 'مدفوع زائد' : 'متوازن',
                deliveriesCount: deliveries.length,
                paymentsCount: payments.length
            },
            dateRangeText
        };
    }
}

module.exports = SupplierService;