const { Contractor, Delivery, ContractorPayment, Adjustment } = require('../models');

const toNumber = (v) => Number(v || 0);

class ContractorService {
    static async getAllContractors() {
        const contractors = await Contractor.find().sort({ name: 1 });

        // Calculate totals for each contractor
        const result = await Promise.all(
            contractors.map(async (contractor) => {
                const totals = await this.computeContractorTotals(contractor._id);
                
                // Count deliveries for this contractor
                const deliveriesCount = await Delivery.countDocuments({ contractor_id: contractor._id });
                
                return {
                    id: contractor._id,
                    name: contractor.name,
                    opening_balance: contractor.opening_balance,
                    created_at: contractor.created_at,
                    // Add calculated totals (using correct field names from computeContractorTotals)
                    balance: totals.balance,
                    totalEarnings: totals.totalEarnings,
                    totalPayments: totals.totalPayments,
                    totalAdjustments: totals.totalAdjustments,
                    deliveriesCount: totals.deliveriesCount,
                    totalTrips: totals.totalTrips
                };
            })
        );

        return { contractors: result };
    }

    static async getContractorById(id) {
        const contractor = await Contractor.findById(id);

        if (!contractor) {
            return null;
        }

        // Get related data
        const deliveries = await Delivery.find({ contractor_id: id })
            .populate('client_id', 'name')
            .populate('crusher_id', 'name')
            .sort({ created_at: -1 });

        const payments = await ContractorPayment.find({ contractor_id: id })
            .sort({ paid_at: -1 });

        const adjustments = await Adjustment.find({
            entity_type: 'contractor',
            entity_id: id
        }).sort({ created_at: -1 });

        // Calculate totals
        const totals = await this.computeContractorTotals(id);

        return {
            contractor: {
                id: contractor._id,
                name: contractor.name,
                opening_balance: contractor.opening_balance,
                created_at: contractor.created_at
            },
            deliveries: deliveries.map(d => ({
                id: d._id,
                client_name: d.client_id?.name || '',
                crusher_name: d.crusher_id?.name || '',
                material: d.material,
                voucher: d.voucher,
                quantity: d.quantity,
                discount_volume: d.discount_volume,
                net_quantity: d.net_quantity,
                contractor_charge_per_meter: d.contractor_charge_per_meter,
                contractor_total_charge: d.contractor_total_charge,
                driver_name: d.driver_name,
                car_head: d.car_head,
                car_tail: d.car_tail,
                car_volume: d.car_volume,
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
                reason: a.reason,
                created_at: a.created_at
            })),
            totals
        };
    }

    static async createContractor(data) {
        const contractor = new Contractor({
            name: data.name,
            opening_balance: toNumber(data.opening_balance)
        });

        await contractor.save();

        return {
            id: contractor._id,
            name: contractor.name,
            opening_balance: contractor.opening_balance,
            created_at: contractor.created_at
        };
    }

    static async updateContractor(id, data) {
        const contractor = await Contractor.findByIdAndUpdate(
            id,
            {
                name: data.name,
                opening_balance: toNumber(data.opening_balance)
            },
            { new: true }
        );

        if (!contractor) {
            return null;
        }

        return {
            id: contractor._id,
            name: contractor.name,
            opening_balance: contractor.opening_balance,
            created_at: contractor.created_at
        };
    }

    static async deleteContractor(id) {
        return await Contractor.findByIdAndDelete(id);
    }

    static async computeContractorTotals(contractorId) {
        const deliveries = await Delivery.find({ contractor_id: contractorId });
        const payments = await ContractorPayment.find({ contractor_id: contractorId });
        const adjustments = await Adjustment.find({ entity_type: 'contractor', entity_id: contractorId });

        const contractor = await Contractor.findById(contractorId);
        const opening = contractor ? toNumber(contractor.opening_balance) : 0;

        const totalEarnings = deliveries.reduce((sum, d) => sum + toNumber(d.contractor_total_charge), 0);
        const totalPayments = payments.reduce((sum, p) => sum + toNumber(p.amount), 0);
        const totalAdjustments = adjustments.reduce((sum, a) => sum + toNumber(a.amount), 0);

        return {
            openingBalance: opening,
            totalEarnings,
            totalPayments,
            totalAdjustments,
            balance: opening + totalEarnings + totalAdjustments - totalPayments,
            // إضافة إجمالي المشاوير
            totalTrips: totalEarnings,
            deliveriesCount: deliveries.length
        };
    }

    // Payment methods
    static async getContractorPayments(contractorId) {
        return await ContractorPayment.find({ contractor_id: contractorId }).sort({ paid_at: -1 });
    }

    static async addContractorPayment(contractorId, data) {
        const payment = new ContractorPayment({
            contractor_id: contractorId,
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
            contractor_id: payment.contractor_id,
            amount: payment.amount,
            method: payment.method,
            details: payment.details,
            note: payment.note,
            paid_at: payment.paid_at,
            payment_image: payment.payment_image
        };
    }

    static async updateContractorPayment(contractorId, paymentId, data) {
        const payment = await ContractorPayment.findOneAndUpdate(
            { _id: paymentId, contractor_id: contractorId },
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
            contractor_id: payment.contractor_id,
            amount: payment.amount,
            method: payment.method,
            details: payment.details,
            note: payment.note,
            paid_at: payment.paid_at,
            payment_image: payment.payment_image
        };
    }

    static async deleteContractorPayment(contractorId, paymentId) {
        return await ContractorPayment.findOneAndDelete({
            _id: paymentId,
            contractor_id: contractorId
        });
    }

    // Adjustment methods
    static async getContractorAdjustments(contractorId) {
        return await Adjustment.find({
            entity_type: 'contractor',
            entity_id: contractorId
        }).sort({ created_at: -1 });
    }

    static async addContractorAdjustment(contractorId, data) {
        const adjustment = new Adjustment({
            entity_type: 'contractor',
            entity_id: contractorId,
            amount: toNumber(data.amount),
            reason: data.reason
        });

        await adjustment.save();

        return {
            id: adjustment._id,
            entity_type: adjustment.entity_type,
            entity_id: adjustment.entity_id,
            amount: adjustment.amount,
            reason: adjustment.reason,
            created_at: adjustment.created_at
        };
    }

    static async updateContractorAdjustment(contractorId, adjustmentId, data) {
        const adjustment = await Adjustment.findOneAndUpdate(
            {
                _id: adjustmentId,
                entity_type: 'contractor',
                entity_id: contractorId
            },
            {
                amount: toNumber(data.amount),
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
            reason: adjustment.reason,
            created_at: adjustment.created_at
        };
    }

    static async deleteContractorAdjustment(contractorId, adjustmentId) {
        return await Adjustment.findOneAndDelete({
            _id: adjustmentId,
            entity_type: 'contractor',
            entity_id: contractorId
        });
    }
}

module.exports = ContractorService;