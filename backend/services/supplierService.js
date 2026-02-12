const { Supplier, Delivery, Payment } = require('../models');

const toNumber = (v) => Number(v || 0);

class SupplierService {
    static async getAllSuppliers() {
        const suppliers = await Supplier.find().sort({ name: 1 });

        // Calculate totals for each supplier (same logic as crushers)
        const result = await Promise.all(
            suppliers.map(async (supplier) => {
                try {
                    // Get deliveries for this squpplier
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
                    const payments = await Payment.find({
                        entity_type: 'supplier',
                        entity_id: supplier._id
                    });
                    const totalPaid = payments.reduce((sum, p) => sum + toNumber(p.amount), 0);

                    // Calculate balance
                    const balance = totalDue - totalPaid;
                    return {
                        id: supplier._id,
                        name: supplier.name,
                        phone_number: supplier.phone_number,
                        notes: supplier.notes,
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

        const payments = await Payment.find({
            entity_type: 'supplier',
            entity_id: id
        }).sort({ paid_at: -1 });

        // Calculate totals
        const totalDue = deliveries.reduce((sum, delivery) => {
            const netQuantity = toNumber(delivery.car_volume) - toNumber(delivery.discount_volume);
            const materialPrice = toNumber(delivery.material_price_at_time);
            return sum + (netQuantity * materialPrice);
        }, 0);

        const totalPaid = payments.reduce((sum, p) => sum + toNumber(p.amount), 0);
        const balance = totalDue - totalPaid;

        return {
            supplier: {
                id: supplier._id,
                name: supplier.name,
                phone_number: supplier.phone_number,
                notes: supplier.notes,
                materials: supplier.materials,
                status: supplier.status,
                created_at: supplier.created_at
            },
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
            totals: {
                balance: Math.round(balance * 100) / 100,
                balance_status: balance > 0 ? 'payable' : balance < 0 ? 'overpaid' : 'balanced',
                balance_description: balance > 0 ? 'مستحق الدفع' : balance < 0 ? 'مدفوع زائد' : 'متوازن',
                total_due: Math.round(totalDue * 100) / 100,
                total_paid: Math.round(totalPaid * 100) / 100,
                deliveries_count: deliveries.length
            }
        };
    }

    static async createSupplier(data) {
        const supplier = new Supplier(data);
        await supplier.save();
        return {
            id: supplier._id,
            name: supplier.name,
            phone_number: supplier.phone_number,
            notes: supplier.notes,
            materials: supplier.materials,
            status: supplier.status,
            created_at: supplier.created_at
        };
    }

    static async updateSupplier(id, data) {
        const supplier = await Supplier.findByIdAndUpdate(id, data, { new: true });
        if (!supplier) return null;

        return {
            id: supplier._id,
            name: supplier.name,
            phone_number: supplier.phone_number,
            notes: supplier.notes,
            materials: supplier.materials,
            status: supplier.status,
            created_at: supplier.created_at
        };
    }

    static async deleteSupplier(id) {
        // Check if supplier has related records
        const deliveriesCount = await Delivery.countDocuments({ supplier_id: id });
        const paymentsCount = await Payment.countDocuments({
            entity_type: 'supplier',
            entity_id: id
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
        const payment = new Payment({
            entity_type: 'supplier',
            entity_id: supplierId,
            ...paymentData
        });
        await payment.save();
        return payment;
    }

    static async updateSupplierPayment(supplierId, paymentId, paymentData) {
        const payment = await Payment.findOneAndUpdate(
            {
                _id: paymentId,
                entity_type: 'supplier',
                entity_id: supplierId
            },
            paymentData,
            { new: true }
        );
        return payment;
    }

    static async deleteSupplierPayment(supplierId, paymentId) {
        const payment = await Payment.findOneAndDelete({
            _id: paymentId,
            entity_type: 'supplier',
            entity_id: supplierId
        });
        return payment;
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
        let paymentDateFilter = { entity_type: 'supplier', entity_id: supplierId };

        if (fromDate || toDate) {
            dateFilter.created_at = {};
            paymentDateFilter.paid_at = {};

            if (fromDate) {
                dateFilter.created_at.$gte = new Date(fromDate);
                paymentDateFilter.paid_at.$gte = new Date(fromDate);
            }
            if (toDate) {
                const toDateObj = new Date(toDate);
                toDateObj.setDate(toDateObj.getDate() + 1);
                dateFilter.created_at.$lt = toDateObj;
                paymentDateFilter.paid_at.$lt = toDateObj;
            }
        }

        // Get deliveries and payments
        const deliveries = await Delivery.find(dateFilter)
            .populate('client_id', 'name')
            .sort({ created_at: 1 });

        const payments = await Payment.find(paymentDateFilter)
            .sort({ paid_at: 1 });

        // Calculate totals
        const totalDue = deliveries.reduce((sum, delivery) => {
            const netQuantity = toNumber(delivery.car_volume) - toNumber(delivery.discount_volume);
            const materialPrice = toNumber(delivery.material_price_at_time);
            return sum + (netQuantity * materialPrice);
        }, 0);

        const totalPaid = payments.reduce((sum, p) => sum + toNumber(p.amount), 0);
        const balance = totalDue - totalPaid;

        // Create transaction history (chronological order)
        const transactions = [];

        // Add deliveries as transactions
        deliveries.forEach(delivery => {
            const netQuantity = toNumber(delivery.car_volume) - toNumber(delivery.discount_volume);
            const amount = netQuantity * toNumber(delivery.material_price_at_time);

            transactions.push({
                date: delivery.created_at,
                type: 'delivery',
                description: `توريد ${delivery.material} - ${delivery.client_id?.name || 'عميل محذوف'}`,
                voucher: delivery.voucher,
                quantity: netQuantity,
                price: delivery.material_price_at_time,
                debit: amount, // مدين (ما نحن مدينون به للمورد)
                credit: 0,
                balance: 0 // Will be calculated later
            });
        });

        // Add payments as transactions
        payments.forEach(payment => {
            transactions.push({
                date: payment.paid_at || payment.created_at,
                type: 'payment',
                description: `دفعة - ${payment.method || 'نقدي'}`,
                details: payment.details,
                debit: 0,
                credit: payment.amount, // دائن (ما دفعناه للمورد)
                balance: 0 // Will be calculated later
            });
        });

        // Sort transactions by date
        transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Calculate running balance
        let runningBalance = 0;
        transactions.forEach(transaction => {
            runningBalance += (transaction.debit - transaction.credit);
            transaction.balance = Math.round(runningBalance * 100) / 100;
        });

        return {
            supplier: {
                id: supplier._id,
                name: supplier.name,
                phone_number: supplier.phone_number
            },
            period: {
                from: fromDate,
                to: toDate,
                isFullHistory: !fromDate && !toDate
            },
            summary: {
                totalDue: Math.round(totalDue * 100) / 100,
                totalPaid: Math.round(totalPaid * 100) / 100,
                balance: Math.round(balance * 100) / 100,
                balanceStatus: balance > 0 ? 'payable' : balance < 0 ? 'overpaid' : 'balanced',
                balanceDescription: balance > 0 ? 'مستحق للمورد' : balance < 0 ? 'مدفوع زائد' : 'متوازن',
                deliveriesCount: deliveries.length,
                paymentsCount: payments.length
            },
            transactions
        };
    }
}

module.exports = SupplierService;