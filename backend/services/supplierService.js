const { Supplier, Delivery, Payment } = require('../models');

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
        }).populate('client_id', 'name').sort({ delivery_date: -1 });

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
                delivery_date: d.delivery_date,
                client_name: d.client_id?.name || d.client_name || 'عميل محذوف',
                material_type: d.material_type,
                car_volume: d.car_volume,
                discount_volume: d.discount_volume,
                net_quantity: toNumber(d.car_volume) - toNumber(d.discount_volume),
                material_price_at_time: d.material_price_at_time,
                total_cost: (toNumber(d.car_volume) - toNumber(d.discount_volume)) * toNumber(d.material_price_at_time),
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
}

module.exports = SupplierService;