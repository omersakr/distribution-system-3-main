const { Crusher, Delivery, CrusherPayment, Adjustment } = require('../models');

const toNumber = (v) => Number(v || 0);

class CrusherService {
    static async getAllCrushers() {
        const crushers = await Crusher.find().sort({ name: 1 });

        // Calculate totals for each crusher
        const result = await Promise.all(
            crushers.map(async (crusher) => {
                const totals = await this.computeCrusherTotals(crusher._id);
                return {
                    id: crusher._id,
                    name: crusher.name,
                    opening_balance: crusher.opening_balance,
                    sand_price: crusher.sand_price,
                    aggregate1_price: crusher.aggregate1_price,
                    aggregate2_price: crusher.aggregate2_price,
                    aggregate3_price: crusher.aggregate3_price,
                    aggregate6_powder_price: crusher.aggregate6_powder_price,
                    created_at: crusher.created_at,
                    // Add calculated totals
                    totalVolume: totals.totalVolume,
                    deliveriesCount: totals.deliveriesCount,
                    net: totals.net,
                    totalRequired: totals.totalRequired,
                    totalPaid: totals.totalPaid,
                    totalAdjustments: totals.totalAdjustments
                };
            })
        );

        return { crushers: result };
    }

    static async getCrusherById(id) {
        const crusher = await Crusher.findById(id);

        if (!crusher) {
            return null;
        }

        // Get related data
        const deliveries = await Delivery.find({ crusher_id: id })
            .populate('client_id', 'name')
            .populate('contractor_id', 'name')
            .sort({ created_at: -1 });

        const payments = await CrusherPayment.find({ crusher_id: id })
            .sort({ paid_at: -1 });

        const adjustments = await Adjustment.find({
            entity_type: 'crusher',
            entity_id: id
        }).sort({ created_at: -1 });

        // Get opening balances
        const { CrusherOpeningBalance } = require('../models');
        const openingBalances = await CrusherOpeningBalance.find({
            crusher_id: id,
            is_deleted: false
        }).populate('project_id', 'name').sort({ created_at: -1 });

        // Calculate totals and material breakdown
        const totals = await this.computeCrusherTotals(id);
        const materialTotals = this.computeMaterialTotals(deliveries);

        return {
            crusher: {
                id: crusher._id,
                name: crusher.name,
                opening_balance: crusher.opening_balance,
                sand_price: crusher.sand_price,
                aggregate1_price: crusher.aggregate1_price,
                aggregate2_price: crusher.aggregate2_price,
                aggregate3_price: crusher.aggregate3_price,
                aggregate6_powder_price: crusher.aggregate6_powder_price,
                created_at: crusher.created_at
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
                client_id: d.client_id?._id || d.client_id,
                client_name: d.client_id?.name || '',
                contractor_id: d.contractor_id?._id || d.contractor_id,
                contractor_name: d.contractor_id?.name || '',
                crusher_id: d.crusher_id,
                supplier_id: d.supplier_id,
                material: d.material,
                voucher: d.voucher,
                quantity: d.quantity,
                discount_volume: d.discount_volume,
                net_quantity: d.net_quantity,
                material_price_at_time: d.material_price_at_time,
                crusher_total_cost: d.crusher_total_cost,
                driver_name: d.driver_name,
                car_head: d.car_head,
                car_tail: d.car_tail,
                car_volume: d.car_volume,
                contractor_charge_per_meter: d.contractor_charge_per_meter,
                created_at: d.created_at
            })),
            payments: payments.map(p => ({
                id: p._id,
                amount: p.amount,
                method: p.method,
                details: p.details,
                note: p.note,
                paid_at: p.paid_at,
                payment_image: p.payment_image
            })),
            adjustments: adjustments.map(a => ({
                id: a._id,
                amount: a.amount,
                method: a.method,
                details: a.details,
                reason: a.reason,
                created_at: a.created_at
            })),
            totals,
            materialTotals
        };
    }

    static async createCrusher(data) {
        const { CrusherOpeningBalance } = require('../models');

        const crusher = new Crusher({
            name: data.name,
            opening_balance: toNumber(data.opening_balance),
            sand_price: toNumber(data.sand_price),
            aggregate1_price: toNumber(data.aggregate1_price),
            aggregate2_price: toNumber(data.aggregate2_price),
            aggregate3_price: toNumber(data.aggregate3_price),
            aggregate6_powder_price: toNumber(data.aggregate6_powder_price)
        });

        await crusher.save();

        // Create opening balances if provided
        if (data.opening_balances && Array.isArray(data.opening_balances) && data.opening_balances.length > 0) {
            const openingBalanceDocs = data.opening_balances.map(balance => {
                const amount = toNumber(balance.amount);
                
                // Validate: positive balance (we owe them) must have project_id
                if (amount > 0 && !balance.project_id) {
                    throw new Error('الرصيد الافتتاحي الموجب يجب أن يكون مرتبطاً بمشروع/عميل');
                }
                
                return {
                    crusher_id: crusher._id,
                    project_id: amount > 0 ? balance.project_id : null,  // Only link if positive
                    amount: amount,
                    description: balance.description || '',
                    date: balance.date || new Date()
                };
            });

            await CrusherOpeningBalance.insertMany(openingBalanceDocs);
        }

        return {
            id: crusher._id,
            name: crusher.name,
            opening_balance: crusher.opening_balance,
            sand_price: crusher.sand_price,
            aggregate1_price: crusher.aggregate1_price,
            aggregate2_price: crusher.aggregate2_price,
            aggregate3_price: crusher.aggregate3_price,
            aggregate6_powder_price: crusher.aggregate6_powder_price,
            created_at: crusher.created_at
        };
    }

    static async updateCrusher(id, data) {
        const { AuditLog, CrusherOpeningBalance } = require('../models');
        
        // Get the old crusher data before update
        const oldCrusher = await Crusher.findById(id);
        if (!oldCrusher) {
            return null;
        }

        const updateData = {};

        // Only update fields that are provided
        if (data.name !== undefined) updateData.name = data.name;
        if (data.opening_balance !== undefined) updateData.opening_balance = toNumber(data.opening_balance);
        if (data.sand_price !== undefined) updateData.sand_price = toNumber(data.sand_price);
        if (data.aggregate1_price !== undefined) updateData.aggregate1_price = toNumber(data.aggregate1_price);
        if (data.aggregate2_price !== undefined) updateData.aggregate2_price = toNumber(data.aggregate2_price);
        if (data.aggregate3_price !== undefined) updateData.aggregate3_price = toNumber(data.aggregate3_price);
        if (data.aggregate6_powder_price !== undefined) updateData.aggregate6_powder_price = toNumber(data.aggregate6_powder_price);

        const crusher = await Crusher.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );

        // Handle opening balances if provided
        if (data.opening_balances && Array.isArray(data.opening_balances)) {
            // Get existing opening balances
            const existingBalances = await CrusherOpeningBalance.find({
                crusher_id: id,
                is_deleted: false
            });

            const existingIds = existingBalances.map(b => b._id.toString());
            const providedIds = data.opening_balances
                .filter(b => b.id)
                .map(b => b.id.toString());

            // Delete opening balances that were removed
            const toDelete = existingIds.filter(id => !providedIds.includes(id));
            if (toDelete.length > 0) {
                await CrusherOpeningBalance.updateMany(
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
                    await CrusherOpeningBalance.findByIdAndUpdate(
                        balance.id, 
                        {
                            project_id: amount > 0 ? balance.project_id : null,  // Only link if positive
                            amount: amount,
                            description: balance.description || ''
                        }
                    );
                } else {
                    // Create new
                    await CrusherOpeningBalance.create({
                        crusher_id: id,
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
                    entity_type: 'crusher',
                    entity_id: id,
                    entity_name: crusher.name,
                    description: `تعديل الأرصدة الافتتاحية للكسارة "${crusher.name}"`,
                    ip_address: data.ipAddress || null,
                    user_agent: data.userAgent || null
                });
            } catch (auditError) {
                console.error('Failed to create audit log:', auditError);
            }
        }

        if (!crusher) {
            return null;
        }

        return {
            id: crusher._id,
            name: crusher.name,
            opening_balance: crusher.opening_balance,
            sand_price: crusher.sand_price,
            aggregate1_price: crusher.aggregate1_price,
            aggregate2_price: crusher.aggregate2_price,
            aggregate3_price: crusher.aggregate3_price,
            aggregate6_powder_price: crusher.aggregate6_powder_price,
            created_at: crusher.created_at
        };
    }

    static async deleteCrusher(id) {
        return await Crusher.findByIdAndDelete(id);
    }

    static async computeCrusherTotals(crusherId) {
        const { CrusherOpeningBalance } = require('../models');
        
        const crusher = await Crusher.findById(crusherId);
        
        // Get project-based opening balances
        const openingBalances = await CrusherOpeningBalance.find({
            crusher_id: crusherId,
            is_deleted: false
        });
        
        // Sum all project-based opening balances
        const opening = openingBalances.reduce((sum, ob) => sum + toNumber(ob.amount), 0);

        const deliveries = await Delivery.find({ crusher_id: crusherId });
        const payments = await CrusherPayment.find({ crusher_id: crusherId });
        const adjustments = await Adjustment.find({ entity_type: 'crusher', entity_id: crusherId });

        // Calculate totals for crusher perspective
        const totalRequired = deliveries.reduce((sum, d) => sum + toNumber(d.crusher_total_cost), 0);
        const totalPaid = payments.reduce((sum, p) => sum + toNumber(p.amount), 0);
        const totalAdjustments = adjustments.reduce((sum, a) => sum + toNumber(a.amount), 0);

        // Calculate final amounts (including opening balance)
        const totalNeeded = opening + totalRequired + totalAdjustments; // Total we owe them after adjustments
        const net = totalNeeded - totalPaid; // Positive = we owe them, Negative = they owe us

        // Calculate volume and count
        const totalVolume = deliveries.reduce((sum, d) => {
            const netVolume = toNumber(d.car_volume) - toNumber(d.discount_volume);
            return sum + netVolume;
        }, 0);
        const deliveriesCount = deliveries.length;

        return {
            openingBalance: opening,  // Opening balance (sum of all project-based)
            totalRequired,      // Base amount we owe (before adjustments)
            totalNeeded,        // Final amount we owe (after adjustments and opening balance)
            totalPaid,          // Amount we've paid
            totalAdjustments,   // Total adjustments
            net,                // Net balance (positive = we owe them)
            totalVolume,        // Total volume delivered
            deliveriesCount     // Number of deliveries
        };
    }

    static computeMaterialTotals(deliveries) {
        const materialMap = {};

        deliveries.forEach(delivery => {
            const material = delivery.material || 'غير محدد';
            const netVolume = toNumber(delivery.car_volume) - toNumber(delivery.discount_volume);
            const totalValue = toNumber(delivery.crusher_total_cost);

            if (!materialMap[material]) {
                materialMap[material] = {
                    material,
                    totalQty: 0,
                    totalValue: 0
                };
            }

            materialMap[material].totalQty += netVolume;
            materialMap[material].totalValue += totalValue;
        });

        return Object.values(materialMap).sort((a, b) => b.totalValue - a.totalValue);
    }

    // Payment methods
    static async getCrusherPayments(crusherId) {
        return await CrusherPayment.find({ crusher_id: crusherId }).sort({ paid_at: -1 });
    }

    static async addCrusherPayment(crusherId, data) {
        const payment = new CrusherPayment({
            crusher_id: crusherId,
            amount: toNumber(data.amount),
            method: data.method,
            details: data.details,
            note: data.note,
            paid_at: data.paid_at,
            payment_image: data.payment_image
        });

        await payment.save();

        return {
            id: payment._id,
            crusher_id: payment.crusher_id,
            amount: payment.amount,
            method: payment.method,
            details: payment.details,
            note: payment.note,
            paid_at: payment.paid_at,
            payment_image: payment.payment_image
        };
    }

    static async updateCrusherPayment(crusherId, paymentId, data) {
        const payment = await CrusherPayment.findOneAndUpdate(
            { _id: paymentId, crusher_id: crusherId },
            {
                amount: toNumber(data.amount),
                method: data.method,
                details: data.details,
                note: data.note,
                paid_at: data.paid_at,
                payment_image: data.payment_image
            },
            { new: true }
        );

        if (!payment) {
            return null;
        }

        return {
            id: payment._id,
            crusher_id: payment.crusher_id,
            amount: payment.amount,
            method: payment.method,
            details: payment.details,
            note: payment.note,
            paid_at: payment.paid_at,
            payment_image: payment.payment_image
        };
    }

    static async deleteCrusherPayment(crusherId, paymentId) {
        return await CrusherPayment.findOneAndDelete({
            _id: paymentId,
            crusher_id: crusherId
        });
    }

    // Adjustment methods
    static async getCrusherAdjustments(crusherId) {
        return await Adjustment.find({
            entity_type: 'crusher',
            entity_id: crusherId
        }).sort({ created_at: -1 });
    }

    static async addCrusherAdjustment(crusherId, data) {
        const adjustment = new Adjustment({
            entity_type: 'crusher',
            entity_id: crusherId,
            amount: toNumber(data.amount),
            method: data.method,
            details: data.details,
            reason: data.reason
        });

        await adjustment.save();

        return {
            id: adjustment._id,
            entity_type: adjustment.entity_type,
            entity_id: adjustment.entity_id,
            amount: adjustment.amount,
            method: adjustment.method,
            details: adjustment.details,
            reason: adjustment.reason,
            created_at: adjustment.created_at
        };
    }

    static async updateCrusherAdjustment(crusherId, adjustmentId, data) {
        const adjustment = await Adjustment.findOneAndUpdate(
            {
                _id: adjustmentId,
                entity_type: 'crusher',
                entity_id: crusherId
            },
            {
                amount: toNumber(data.amount),
                method: data.method,
                details: data.details,
                reason: data.reason
            },
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
            method: adjustment.method,
            details: adjustment.details,
            reason: adjustment.reason,
            created_at: adjustment.created_at
        };
    }

    static async deleteCrusherAdjustment(crusherId, adjustmentId) {
        return await Adjustment.findOneAndDelete({
            _id: adjustmentId,
            entity_type: 'crusher',
            entity_id: crusherId
        });
    }
}

module.exports = CrusherService;