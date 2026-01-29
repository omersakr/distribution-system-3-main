const express = require('express');
const { Client, Delivery, Payment, Adjustment } = require('../models');

const router = express.Router();

const toNumber = (v) => Number(v || 0);

// Helper function for date formatting
const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('ar-EG');

async function getClient(id) {
    return await Client.findById(id);
}

async function computeClientTotals(clientId) {
    const deliveries = await Delivery.find({ client_id: clientId });
    const payments = await Payment.find({ client_id: clientId });
    const adjustments = await Adjustment.find({ entity_type: 'client', entity_id: clientId });

    const client = await getClient(clientId);
    const opening = client ? toNumber(client.opening_balance) : 0;

    const totalDeliveries = deliveries.reduce((sum, d) => sum + toNumber(d.total_value), 0);
    const totalPayments = payments.reduce((sum, p) => sum + toNumber(p.amount), 0);
    const totalAdjustments = adjustments.reduce((sum, a) => sum + toNumber(a.amount), 0);

    return {
        openingBalance: opening,
        totalDeliveries,
        totalPayments,
        totalAdjustments,
        balance: opening + totalDeliveries + totalAdjustments - totalPayments
    };
}

// Get all clients with balances, supporting search, filter, sort, pagination
router.get('/', async (req, res, next) => {
    try {
        const {
            search,
            sort = 'name',
            order = 'asc',
            page = 1,
            limit = 25
        } = req.query;

        let filter = {};

        if (search) {
            filter = {
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
                const totals = await computeClientTotals(client._id);
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

        res.json({
            clients: enriched,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        next(err);
    }
});

// Get client by ID with balance details
router.get('/:id', async (req, res, next) => {
    try {
        const client = await Client.findById(req.params.id);

        if (!client) {
            return res.status(404).json({ message: 'العميل غير موجود' });
        }

        // Get related data
        const deliveries = await Delivery.find({ client_id: req.params.id })
            .populate('crusher_id', 'name')
            .populate('contractor_id', 'name')
            .sort({ created_at: -1 });

        const payments = await Payment.find({ client_id: req.params.id })
            .sort({ paid_at: -1 });

        const adjustments = await Adjustment.find({
            entity_type: 'client',
            entity_id: req.params.id
        }).sort({ created_at: -1 });

        const totals = await computeClientTotals(client._id);

        res.json({
            client: {
                id: client._id,
                name: client.name,
                phone: client.phone,
                opening_balance: client.opening_balance,
                created_at: client.created_at
            },
            deliveries: deliveries.map(d => ({
                id: d._id,
                crusher_name: d.crusher_id?.name || '',
                contractor_name: d.contractor_id?.name || '',
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
                created_at: d.created_at
            })),
            payments: payments.map(p => ({
                id: p._id,
                amount: p.amount,
                method: p.method,
                details: p.details,
                note: p.note,
                paid_at: p.paid_at
            })),
            adjustments: adjustments.map(a => ({
                id: a._id,
                amount: a.amount,
                method: a.method,
                details: a.details,
                reason: a.reason,
                created_at: a.created_at
            })),
            totals
        });
    } catch (err) {
        next(err);
    }
});

// Create new client
router.post('/', async (req, res, next) => {
    try {
        const { name, phone, opening_balance } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'اسم العميل مطلوب' });
        }

        const client = new Client({
            name: name.trim(),
            phone: phone?.trim() || '',
            opening_balance: toNumber(opening_balance)
        });

        await client.save();

        res.status(201).json({
            id: client._id,
            name: client.name,
            phone: client.phone,
            opening_balance: client.opening_balance,
            created_at: client.created_at
        });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: 'اسم العميل موجود بالفعل' });
        }
        next(err);
    }
});

// Update client
router.put('/:id', async (req, res, next) => {
    try {
        const { name, phone, opening_balance } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'اسم العميل مطلوب' });
        }

        const client = await Client.findByIdAndUpdate(
            req.params.id,
            {
                name: name.trim(),
                phone: phone?.trim() || '',
                opening_balance: toNumber(opening_balance)
            },
            { new: true }
        );

        if (!client) {
            return res.status(404).json({ message: 'العميل غير موجود' });
        }

        res.json({
            id: client._id,
            name: client.name,
            phone: client.phone,
            opening_balance: client.opening_balance,
            created_at: client.created_at
        });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: 'اسم العميل موجود بالفعل' });
        }
        next(err);
    }
});

// Delete client
router.delete('/:id', async (req, res, next) => {
    try {
        const client = await Client.findByIdAndDelete(req.params.id);

        if (!client) {
            return res.status(404).json({ message: 'العميل غير موجود' });
        }

        res.json({ message: 'تم حذف العميل بنجاح' });
    } catch (err) {
        next(err);
    }
});

// Get client payments
router.get('/:id/payments', async (req, res, next) => {
    try {
        const payments = await Payment.find({ client_id: req.params.id }).sort({ paid_at: -1 });
        res.json({ payments });
    } catch (err) {
        next(err);
    }
});

// Add client payment
router.post('/:id/payments', async (req, res, next) => {
    try {
        const { amount, method, details, note, paid_at } = req.body;

        const payment = new Payment({
            client_id: req.params.id,
            amount: toNumber(amount),
            method: method?.trim() || '',
            details: details?.trim() || '',
            note: note?.trim() || '',
            paid_at: paid_at ? new Date(paid_at) : new Date()
        });

        await payment.save();

        res.status(201).json({
            id: payment._id,
            client_id: payment.client_id,
            amount: payment.amount,
            method: payment.method,
            details: payment.details,
            note: payment.note,
            paid_at: payment.paid_at
        });
    } catch (err) {
        next(err);
    }
});

// Update client payment
router.put('/:id/payments/:paymentId', async (req, res, next) => {
    try {
        const { amount, method, details, note, paid_at } = req.body;

        const payment = await Payment.findOneAndUpdate(
            { _id: req.params.paymentId, client_id: req.params.id },
            {
                amount: toNumber(amount),
                method: method?.trim() || '',
                details: details?.trim() || '',
                note: note?.trim() || '',
                paid_at: paid_at ? new Date(paid_at) : new Date()
            },
            { new: true }
        );

        if (!payment) {
            return res.status(404).json({ message: 'الدفعة غير موجودة' });
        }

        res.json({
            id: payment._id,
            client_id: payment.client_id,
            amount: payment.amount,
            method: payment.method,
            details: payment.details,
            note: payment.note,
            paid_at: payment.paid_at
        });
    } catch (err) {
        next(err);
    }
});

// Delete client payment
router.delete('/:id/payments/:paymentId', async (req, res, next) => {
    try {
        const payment = await Payment.findOneAndDelete({
            _id: req.params.paymentId,
            client_id: req.params.id
        });

        if (!payment) {
            return res.status(404).json({ message: 'الدفعة غير موجودة' });
        }

        res.json({ message: 'تم حذف الدفعة بنجاح' });
    } catch (err) {
        next(err);
    }
});

// Get client adjustments
router.get('/:id/adjustments', async (req, res, next) => {
    try {
        const adjustments = await Adjustment.find({
            entity_type: 'client',
            entity_id: req.params.id
        }).sort({ created_at: -1 });
        res.json({ adjustments });
    } catch (err) {
        next(err);
    }
});

// Add client adjustment
router.post('/:id/adjustments', async (req, res, next) => {
    try {
        const { amount, method, details, reason } = req.body;

        const adjustment = new Adjustment({
            entity_type: 'client',
            entity_id: req.params.id,
            amount: toNumber(amount),
            method: method?.trim() || '',
            details: details?.trim() || '',
            reason: reason?.trim() || ''
        });

        await adjustment.save();

        res.status(201).json({
            id: adjustment._id,
            entity_type: adjustment.entity_type,
            entity_id: adjustment.entity_id,
            amount: adjustment.amount,
            method: adjustment.method,
            details: adjustment.details,
            reason: adjustment.reason,
            created_at: adjustment.created_at
        });
    } catch (err) {
        next(err);
    }
});

// Update client adjustment
router.put('/:id/adjustments/:adjustmentId', async (req, res, next) => {
    try {
        const { amount, method, details, reason } = req.body;

        const adjustment = await Adjustment.findOneAndUpdate(
            {
                _id: req.params.adjustmentId,
                entity_type: 'client',
                entity_id: req.params.id
            },
            {
                amount: toNumber(amount),
                method: method?.trim() || '',
                details: details?.trim() || '',
                reason: reason?.trim() || ''
            },
            { new: true }
        );

        if (!adjustment) {
            return res.status(404).json({ message: 'التسوية غير موجودة' });
        }

        res.json({
            id: adjustment._id,
            entity_type: adjustment.entity_type,
            entity_id: adjustment.entity_id,
            amount: adjustment.amount,
            method: adjustment.method,
            details: adjustment.details,
            reason: adjustment.reason,
            created_at: adjustment.created_at
        });
    } catch (err) {
        next(err);
    }
});

// Delete client adjustment
router.delete('/:id/adjustments/:adjustmentId', async (req, res, next) => {
    try {
        const adjustment = await Adjustment.findOneAndDelete({
            _id: req.params.adjustmentId,
            entity_type: 'client',
            entity_id: req.params.id
        });

        if (!adjustment) {
            return res.status(404).json({ message: 'التسوية غير موجودة' });
        }

        res.json({ message: 'تم حذف التسوية بنجاح' });
    } catch (err) {
        next(err);
    }
});

// Get client deliveries report with date filtering
router.get('/:id/reports/deliveries', async (req, res, next) => {
    try {
        const { from, to } = req.query;

        // Validate client exists
        const client = await Client.findById(req.params.id);
        if (!client) {
            return res.status(404).json({ message: 'العميل غير موجود' });
        }

        // Build date filter
        let dateFilter = { client_id: req.params.id };

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
            crusher_name: d.crusher_id?.name || '',
            contractor_name: d.contractor_id?.name || '',
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
            created_at: d.created_at,
            formatted_date: formatDate(d.created_at)
        }));

        res.json({
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
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;