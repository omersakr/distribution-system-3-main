const { Client, Delivery, Payment, Adjustment } = require('../models');
const ClientProjectSyncService = require('./clientProjectSyncService');

const toNumber = (v) => Number(v || 0);

// Helper function for date formatting
const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('ar-EG');

class ClientService {
    static async getAllClients(query = {}) {
        const {
            search,
            sort = 'name',
            order = 'asc',
            page = 1,
            limit = 25
        } = query;

        let filter = { is_deleted: { $ne: true } };

        if (search) {
            filter = {
                ...filter,
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { phone: { $regex: search, $options: 'i' } }
                ]
            };
        }

        const sortOrder = order === 'desc' ? -1 : 1;
        const skip = (page - 1) * limit;

        const clients = await Client.find(filter)
            .sort({ [sort]: sortOrder })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Client.countDocuments(filter);

        // Calculate balances for each client
        const enriched = await Promise.all(
            clients.map(async (client) => {
                const totals = await this.computeClientTotals(client._id);
                return {
                    id: client._id,
                    name: client.name,
                    phone: client.phone,
                    opening_balance: client.opening_balance,
                    created_at: client.created_at,
                    ...totals
                };
            })
        );

        return {
            clients: enriched,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    static async getClientById(id) {
        const client = await Client.findById(id);

        if (!client) {
            return null;
        }

        // Get related data
        const deliveries = await Delivery.find({ client_id: id })
            .populate('crusher_id', 'name')
            .populate('contractor_id', 'name')
            .sort({ created_at: -1 });

        const payments = await Payment.find({ client_id: id })
            .sort({ paid_at: -1 });

        const adjustments = await Adjustment.find({
            entity_type: 'client',
            entity_id: id
        }).sort({ created_at: -1 });

        // Calculate totals and material breakdown
        const totals = await this.computeClientTotals(client._id);
        const materialTotals = this.computeMaterialTotals(deliveries);

        return {
            client: {
                id: client._id,
                name: client.name,
                phone: client.phone,
                opening_balance: client.opening_balance,
                created_at: client.created_at
            },
            deliveries: deliveries.map(d => ({
                id: d._id,
                crusher_id: d.crusher_id?._id || d.crusher_id,
                crusher_name: d.crusher_id?.name || '',
                contractor_id: d.contractor_id?._id || d.contractor_id,
                contractor_name: d.contractor_id?.name || '',
                client_id: d.client_id,
                supplier_id: d.supplier_id,
                material: d.material,
                voucher: d.voucher,
                quantity: d.quantity,
                discount_volume: d.discount_volume,
                net_quantity: d.net_quantity,
                price_per_meter: d.price_per_meter,
                total_value: d.total_value,
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
                reason: a.reason,
                created_at: a.created_at
            })),
            totals,
            materialTotals
        };
    }

    static async createClient(data) {
        const client = new Client({
            name: data.name,
            phone: data.phone,
            opening_balance: toNumber(data.opening_balance)
        });

        await client.save();

        // Automatically create corresponding project
        try {
            await ClientProjectSyncService.syncClientToProject(client._id);
        } catch (error) {
            console.warn('Failed to sync new client to project:', error.message);
        }

        return {
            id: client._id,
            name: client.name,
            phone: client.phone,
            opening_balance: client.opening_balance,
            created_at: client.created_at
        };
    }

    static async updateClient(id, data) {
        const client = await Client.findByIdAndUpdate(
            id,
            {
                name: data.name,
                phone: data.phone,
                opening_balance: toNumber(data.opening_balance)
            },
            { new: true }
        );

        if (!client) {
            return null;
        }

        // Sync changes to corresponding project
        try {
            await ClientProjectSyncService.syncClientToProject(client._id);
        } catch (error) {
            console.warn('Failed to sync client update to project:', error.message);
        }

        return {
            id: client._id,
            name: client.name,
            phone: client.phone,
            opening_balance: client.opening_balance,
            created_at: client.created_at
        };
    }

    static async deleteClient(id) {
        // Use the sync service to delete both client and project
        try {
            const result = await ClientProjectSyncService.deleteClientAndProject(id);
            return result.client;
        } catch (error) {
            console.warn('Failed to sync client deletion to project:', error.message);
            // Fallback to just deleting the client
            return await Client.findByIdAndDelete(id);
        }
    }

    static async computeClientTotals(clientId) {
        const deliveries = await Delivery.find({ client_id: clientId, is_deleted: { $ne: true } });
        const payments = await Payment.find({ client_id: clientId, is_deleted: { $ne: true } });
        const adjustments = await Adjustment.find({ entity_type: 'client', entity_id: clientId, is_deleted: { $ne: true } });

        const client = await Client.findById(clientId);
        const opening = client ? toNumber(client.opening_balance) : 0;

        const totalDeliveries = deliveries.reduce((sum, d) => sum + toNumber(d.total_value), 0);
        const totalPayments = payments.reduce((sum, p) => sum + toNumber(p.amount), 0);
        const totalAdjustments = adjustments.reduce((sum, a) => sum + toNumber(a.amount), 0);

        // Get project-specific financial data
        let totalExpenses = 0;
        let totalCapitalInjections = 0;
        let totalWithdrawals = 0;

        try {
            // Get the project associated with this client
            const { Project, Expense, CapitalInjection, Withdrawal } = require('../models');
            const project = await Project.findOne({ client_id: clientId });

            if (project) {
                // Get expenses for this project
                const expenses = await Expense.find({ project_id: clientId, is_deleted: { $ne: true } });
                totalExpenses = expenses.reduce((sum, e) => sum + toNumber(e.amount), 0);

                // Get capital injections for this project
                const capitalInjections = await CapitalInjection.find({ project_id: project._id });
                totalCapitalInjections = capitalInjections.reduce((sum, c) => sum + toNumber(c.amount), 0);

                // Get withdrawals for this project
                const withdrawals = await Withdrawal.find({ project_id: project._id });
                totalWithdrawals = withdrawals.reduce((sum, w) => sum + toNumber(w.amount), 0);
            }
        } catch (error) {
            console.error('Error loading project financial data:', error);
        }

        return {
            openingBalance: opening,
            totalDeliveries,
            totalPayments,
            totalAdjustments,
            totalExpenses,
            totalCapitalInjections,
            totalWithdrawals,
            balance: opening + totalDeliveries + totalAdjustments - totalPayments
        };
    }

    static computeMaterialTotals(deliveries) {
        const materialMap = {};

        deliveries.forEach(delivery => {
            const material = delivery.material || 'غير محدد';
            const quantity = toNumber(delivery.net_quantity) || toNumber(delivery.quantity);
            const totalValue = toNumber(delivery.total_value);

            if (!materialMap[material]) {
                materialMap[material] = {
                    material,
                    totalQty: 0,
                    totalValue: 0
                };
            }

            materialMap[material].totalQty += quantity;
            materialMap[material].totalValue += totalValue;
        });

        return Object.values(materialMap).sort((a, b) => b.totalValue - a.totalValue);
    }

    static async getDeliveries(clientId, query = {}) {
        const {
            page = 1,
            limit = 50,
            sort = 'created_at',
            order = 'desc'
        } = query;

        const sortOrder = order === 'desc' ? -1 : 1;
        const skip = (page - 1) * limit;

        const deliveries = await Delivery.find({ client_id: clientId })
            .populate('crusher_id', 'name')
            .populate('contractor_id', 'name')
            .sort({ [sort]: sortOrder })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Delivery.countDocuments({ client_id: clientId });

        return {
            deliveries,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    static async getClientPayments(clientId) {
        return await Payment.find({ client_id: clientId }).sort({ paid_at: -1 });
    }

    static async addClientPayment(clientId, data) {
        const payment = new Payment({
            client_id: clientId,
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
            client_id: payment.client_id,
            amount: payment.amount,
            method: payment.method,
            details: payment.details,
            note: payment.note,
            paid_at: payment.paid_at,
            payment_image: payment.payment_image
        };
    }

    static async updateClientPayment(clientId, paymentId, data) {
        const payment = await Payment.findOneAndUpdate(
            { _id: paymentId, client_id: clientId },
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
            client_id: payment.client_id,
            amount: payment.amount,
            method: payment.method,
            details: payment.details,
            note: payment.note,
            paid_at: payment.paid_at,
            payment_image: payment.payment_image
        };
    }

    static async deleteClientPayment(clientId, paymentId) {
        return await Payment.findOneAndDelete({
            _id: paymentId,
            client_id: clientId
        });
    }

    static async getClientAdjustments(clientId) {
        return await Adjustment.find({
            entity_type: 'client',
            entity_id: clientId
        }).sort({ created_at: -1 });
    }

    static async addClientAdjustment(clientId, data) {
        const adjustment = new Adjustment({
            entity_type: 'client',
            entity_id: clientId,
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

    static async updateClientAdjustment(clientId, adjustmentId, data) {
        const adjustment = await Adjustment.findOneAndUpdate(
            {
                _id: adjustmentId,
                entity_type: 'client',
                entity_id: clientId
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

    static async deleteClientAdjustment(clientId, adjustmentId) {
        return await Adjustment.findOneAndDelete({
            _id: adjustmentId,
            entity_type: 'client',
            entity_id: clientId
        });
    }

    static async getClientDeliveriesReport(clientId, options = {}) {
        const { from, to } = options;

        // Validate client exists
        const client = await Client.findById(clientId);
        if (!client) {
            return null;
        }

        // Build date filter
        let dateFilter = { client_id: clientId };

        if (from || to) {
            dateFilter.created_at = {};

            if (from) {
                dateFilter.created_at.$gte = new Date(from);
            }

            if (to) {
                // Add one day to include the entire 'to' date
                const toDate = new Date(to);
                toDate.setDate(toDate.getDate() + 1);
                dateFilter.created_at.$lt = toDate;
            }
        }

        // Get filtered deliveries
        const deliveries = await Delivery.find(dateFilter)
            .populate('crusher_id', 'name')
            .populate('contractor_id', 'name')
            .sort({ created_at: -1 });

        // Calculate totals for the filtered period
        const totalQuantity = deliveries.reduce((sum, d) => sum + toNumber(d.quantity), 0);
        const totalDiscountVolume = deliveries.reduce((sum, d) => sum + toNumber(d.discount_volume), 0);
        const totalNetQuantity = deliveries.reduce((sum, d) => sum + toNumber(d.net_quantity), 0);
        const totalValue = deliveries.reduce((sum, d) => sum + toNumber(d.total_value), 0);

        // Format deliveries for response
        const formattedDeliveries = deliveries.map(d => ({
            id: d._id,
            crusher_id: d.crusher_id?._id || d.crusher_id,
            crusher_name: d.crusher_id?.name || '',
            contractor_id: d.contractor_id?._id || d.contractor_id,
            contractor_name: d.contractor_id?.name || '',
            client_id: d.client_id,
            supplier_id: d.supplier_id,
            material: d.material,
            voucher: d.voucher,
            quantity: d.quantity,
            discount_volume: d.discount_volume,
            net_quantity: d.net_quantity,
            price_per_meter: d.price_per_meter,
            total_value: d.total_value,
            driver_name: d.driver_name,
            car_head: d.car_head,
            car_tail: d.car_tail,
            car_volume: d.car_volume,
            contractor_charge_per_meter: d.contractor_charge_per_meter,
            created_at: d.created_at,
            formatted_date: formatDate(d.created_at)
        }));

        return {
            client: {
                id: client._id,
                name: client.name,
                phone: client.phone
            },
            period: {
                from: from || null,
                to: to || null
            },
            deliveries: formattedDeliveries,
            summary: {
                total_deliveries: deliveries.length,
                total_quantity: totalQuantity,
                total_discount_volume: totalDiscountVolume,
                total_net_quantity: totalNetQuantity,
                total_value: totalValue
            }
        };
    }

    static async getPayments(clientId, query = {}) {
        const {
            page = 1,
            limit = 50,
            sort = 'paid_at',
            order = 'desc'
        } = query;

        const sortOrder = order === 'desc' ? -1 : 1;
        const skip = (page - 1) * limit;

        const payments = await Payment.find({ client_id: clientId })
            .sort({ [sort]: sortOrder })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Payment.countDocuments({ client_id: clientId });

        return {
            payments,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }
}

module.exports = ClientService;