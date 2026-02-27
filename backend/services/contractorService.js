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

        // Get opening balances
        const { ContractorOpeningBalance } = require('../models');
        const openingBalances = await ContractorOpeningBalance.find({
            contractor_id: id,
            is_deleted: false
        }).populate('project_id', 'name').sort({ created_at: -1 });

        // Calculate totals
        const totals = await this.computeContractorTotals(id);

        return {
            contractor: {
                id: contractor._id,
                name: contractor.name,
                opening_balance: contractor.opening_balance,
                created_at: contractor.created_at
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
                crusher_id: d.crusher_id?._id || d.crusher_id,
                crusher_name: d.crusher_id?.name || '',
                contractor_id: d.contractor_id,
                supplier_id: d.supplier_id,
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
        const { ContractorOpeningBalance } = require('../models');

        const contractor = new Contractor({
            name: data.name,
            opening_balance: toNumber(data.opening_balance)
        });

        await contractor.save();

        // Create opening balances if provided
        if (data.opening_balances && Array.isArray(data.opening_balances) && data.opening_balances.length > 0) {
            const openingBalanceDocs = data.opening_balances.map(balance => ({
                contractor_id: contractor._id,
                project_id: balance.project_id,
                amount: toNumber(balance.amount),
                description: balance.description || '',
                date: balance.date || new Date()
            }));

            await ContractorOpeningBalance.insertMany(openingBalanceDocs);
        }

        return {
            id: contractor._id,
            name: contractor.name,
            opening_balance: contractor.opening_balance,
            created_at: contractor.created_at
        };
    }

    static async updateContractor(id, data) {
        const { AuditLog, ContractorOpeningBalance } = require('../models');
        
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

        // Handle opening balances if provided
        if (data.opening_balances && Array.isArray(data.opening_balances)) {
            // Get existing opening balances
            const existingBalances = await ContractorOpeningBalance.find({
                contractor_id: id,
                is_deleted: false
            });

            const existingIds = existingBalances.map(b => b._id.toString());
            const providedIds = data.opening_balances
                .filter(b => b.id)
                .map(b => b.id.toString());

            // Delete opening balances that were removed
            const toDelete = existingIds.filter(id => !providedIds.includes(id));
            if (toDelete.length > 0) {
                await ContractorOpeningBalance.updateMany(
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
                    await ContractorOpeningBalance.findByIdAndUpdate(balance.id, {
                        project_id: amount > 0 ? balance.project_id : null,  // Only link if positive
                        amount: amount,
                        description: balance.description || ''
                    });
                } else {
                    // Create new
                    await ContractorOpeningBalance.create({
                        contractor_id: id,
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
                    entity_type: 'contractor',
                    entity_id: id,
                    entity_name: contractor.name,
                    description: `تعديل الأرصدة الافتتاحية للمقاول "${contractor.name}"`,
                    ip_address: data.ipAddress || null,
                    user_agent: data.userAgent || null
                });
            } catch (auditError) {
                console.error('Failed to create audit log:', auditError);
            }
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
        const { ContractorOpeningBalance } = require('../models');
        
        const deliveries = await Delivery.find({ contractor_id: contractorId });
        const payments = await ContractorPayment.find({ contractor_id: contractorId });
        const adjustments = await Adjustment.find({ entity_type: 'contractor', entity_id: contractorId });

        // Get project-based opening balances
        const openingBalances = await ContractorOpeningBalance.find({
            contractor_id: contractorId,
            is_deleted: false
        });
        
        // Sum all project-based opening balances
        const opening = openingBalances.reduce((sum, ob) => sum + toNumber(ob.amount), 0);

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

    // Report generation methods
    static async generateDeliveriesReport(contractorId, fromDate, toDate) {
        const contractor = await Contractor.findById(contractorId);
        if (!contractor) {
            throw new Error('المقاول غير موجود');
        }

        // Build date filter
        let dateFilter = { contractor_id: contractorId };
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
            .populate('crusher_id', 'name')
            .sort({ created_at: -1 });

        // Calculate totals
        let totalEarnings = 0;
        let totalTrips = 0;

        deliveries.forEach(delivery => {
            totalEarnings += toNumber(delivery.contractor_total_charge);
            totalTrips += 1;
        });

        return {
            contractor: {
                id: contractor._id,
                name: contractor.name
            },
            period: {
                from: fromDate,
                to: toDate
            },
            summary: {
                totalEarnings: Math.round(totalEarnings * 100) / 100,
                totalTrips,
                deliveriesCount: deliveries.length
            },
            deliveries: deliveries.map(d => ({
                id: d._id,
                date: d.created_at,
                client_id: d.client_id?._id || d.client_id,
                client_name: d.client_id?.name || 'عميل محذوف',
                crusher_id: d.crusher_id?._id || d.crusher_id,
                crusher_name: d.crusher_id?.name || 'كسارة محذوفة',
                contractor_id: d.contractor_id,
                supplier_id: d.supplier_id,
                material: d.material,
                voucher: d.voucher,
                quantity: d.car_volume,
                charge_per_meter: d.contractor_charge_per_meter,
                total_charge: d.contractor_total_charge,
                driver_name: d.driver_name,
                car_head: d.car_head,
                car_tail: d.car_tail
            }))
        };
    }

    static async generateAccountStatement(contractorId, fromDate, toDate) {
        const contractor = await Contractor.findById(contractorId);
        if (!contractor) {
            throw new Error('المقاول غير موجود');
        }

        // Build date filters
        let deliveryDateFilter = { contractor_id: contractorId };
        let paymentDateFilter = { contractor_id: contractorId };
        let adjustmentDateFilter = { entity_type: 'contractor', entity_id: contractorId };

        if (fromDate || toDate) {
            deliveryDateFilter.created_at = {};
            paymentDateFilter.paid_at = {};
            adjustmentDateFilter.created_at = {};

            if (fromDate) {
                deliveryDateFilter.created_at.$gte = new Date(fromDate);
                paymentDateFilter.paid_at.$gte = new Date(fromDate);
                adjustmentDateFilter.created_at.$gte = new Date(fromDate);
            }
            if (toDate) {
                const toDateObj = new Date(toDate);
                toDateObj.setDate(toDateObj.getDate() + 1);
                deliveryDateFilter.created_at.$lt = toDateObj;
                paymentDateFilter.paid_at.$lt = toDateObj;
                adjustmentDateFilter.created_at.$lt = toDateObj;
            }
        }

        // Get data
        const deliveries = await Delivery.find(deliveryDateFilter)
            .populate('client_id', 'name')
            .populate('crusher_id', 'name')
            .sort({ created_at: 1 });

        const payments = await ContractorPayment.find(paymentDateFilter)
            .sort({ paid_at: 1 });

        const adjustments = await Adjustment.find(adjustmentDateFilter)
            .sort({ created_at: 1 });

        // Calculate totals
        const totalEarnings = deliveries.reduce((sum, d) => sum + toNumber(d.contractor_total_charge), 0);
        const totalPayments = payments.reduce((sum, p) => sum + toNumber(p.amount), 0);
        const totalAdjustments = adjustments.reduce((sum, a) => sum + toNumber(a.amount), 0);
        const balance = toNumber(contractor.opening_balance) + totalEarnings + totalAdjustments - totalPayments;

        // Create transaction history (chronological order)
        const transactions = [];

        // Add opening balance if not filtering by date
        if (!fromDate && !toDate) {
            transactions.push({
                date: contractor.created_at,
                type: 'opening',
                description: 'الرصيد الافتتاحي',
                debit: contractor.opening_balance > 0 ? contractor.opening_balance : 0,
                credit: contractor.opening_balance < 0 ? Math.abs(contractor.opening_balance) : 0,
                balance: 0 // Will be calculated later
            });
        }

        // Add deliveries as transactions
        deliveries.forEach(delivery => {
            transactions.push({
                date: delivery.created_at,
                type: 'delivery',
                description: `مشوار - ${delivery.client_id?.name || 'عميل محذوف'} - ${delivery.crusher_id?.name || 'كسارة محذوفة'}`,
                voucher: delivery.voucher,
                quantity: delivery.car_volume,
                charge: delivery.contractor_charge_per_meter,
                debit: delivery.contractor_total_charge, // مدين (ما نحن مدينون به للمقاول)
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
                credit: payment.amount, // دائن (ما دفعناه للمقاول)
                balance: 0 // Will be calculated later
            });
        });

        // Add adjustments as transactions
        adjustments.forEach(adjustment => {
            transactions.push({
                date: adjustment.created_at,
                type: 'adjustment',
                description: `تسوية - ${adjustment.reason || 'غير محدد'}`,
                debit: adjustment.amount > 0 ? adjustment.amount : 0,
                credit: adjustment.amount < 0 ? Math.abs(adjustment.amount) : 0,
                balance: 0 // Will be calculated later
            });
        });

        // Sort transactions by date
        transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Calculate running balance
        let runningBalance = fromDate && toDate ? 0 : toNumber(contractor.opening_balance);
        transactions.forEach(transaction => {
            if (transaction.type !== 'opening') {
                runningBalance += (transaction.debit - transaction.credit);
            }
            transaction.balance = Math.round(runningBalance * 100) / 100;
        });

        return {
            contractor: {
                id: contractor._id,
                name: contractor.name,
                opening_balance: contractor.opening_balance
            },
            period: {
                from: fromDate,
                to: toDate,
                isFullHistory: !fromDate && !toDate
            },
            summary: {
                openingBalance: Math.round(toNumber(contractor.opening_balance) * 100) / 100,
                totalEarnings: Math.round(totalEarnings * 100) / 100,
                totalPayments: Math.round(totalPayments * 100) / 100,
                totalAdjustments: Math.round(totalAdjustments * 100) / 100,
                balance: Math.round(balance * 100) / 100,
                balanceStatus: balance > 0 ? 'payable' : balance < 0 ? 'overpaid' : 'balanced',
                balanceDescription: balance > 0 ? 'مستحق للمقاول' : balance < 0 ? 'مدفوع زائد' : 'متوازن',
                deliveriesCount: deliveries.length,
                paymentsCount: payments.length,
                adjustmentsCount: adjustments.length
            },
            transactions
        };
    }
}

module.exports = ContractorService;