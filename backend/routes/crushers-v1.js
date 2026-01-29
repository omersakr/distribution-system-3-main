const express = require('express');
const { Crusher } = require('../models');

const router = express.Router();

const toNumber = (v) => Number(v || 0);

// Get all crushers
router.get('/', async (req, res, next) => {
    try {
        const crushers = await Crusher.find().sort({ name: 1 });

        const result = crushers.map(crusher => ({
            id: crusher._id,
            name: crusher.name,
            sand_price: crusher.sand_price,
            aggregate1_price: crusher.aggregate1_price,
            aggregate2_price: crusher.aggregate2_price,
            aggregate3_price: crusher.aggregate3_price,
            created_at: crusher.created_at
        }));

        res.json({ crushers: result });
    } catch (err) {
        next(err);
    }
});

// Get crusher by ID
router.get('/:id', async (req, res, next) => {
    try {
        const crusher = await Crusher.findById(req.params.id);

        if (!crusher) {
            return res.status(404).json({ message: 'الكسارة غير موجودة' });
        }

        // Get related data
        const { Delivery, CrusherPayment, Adjustment } = require('../models');

        const deliveries = await Delivery.find({ crusher_id: req.params.id })
            .populate('client_id', 'name')
            .populate('contractor_id', 'name')
            .sort({ created_at: -1 });

        const payments = await CrusherPayment.find({ crusher_id: req.params.id })
            .sort({ paid_at: -1 });

        const adjustments = await Adjustment.find({
            entity_type: 'crusher',
            entity_id: req.params.id
        }).sort({ created_at: -1 });

        // Calculate totals
        const totalDeliveries = deliveries.reduce((sum, d) => sum + (d.crusher_total_cost || 0), 0);
        const totalPayments = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const totalAdjustments = adjustments.reduce((sum, a) => sum + (a.amount || 0), 0);
        const balance = totalDeliveries + totalAdjustments - totalPayments;

        // Calculate material totals
        const materialTotals = {};
        deliveries.forEach(delivery => {
            const material = delivery.material || 'غير محدد';
            if (!materialTotals[material]) {
                materialTotals[material] = {
                    material,
                    totalQuantity: 0,
                    totalValue: 0,
                    deliveryCount: 0
                };
            }
            materialTotals[material].totalQuantity += delivery.net_quantity || 0;
            materialTotals[material].totalValue += delivery.crusher_total_cost || 0;
            materialTotals[material].deliveryCount += 1;
        });

        res.json({
            crusher: {
                id: crusher._id,
                name: crusher.name,
                sand_price: crusher.sand_price,
                aggregate1_price: crusher.aggregate1_price,
                aggregate2_price: crusher.aggregate2_price,
                aggregate3_price: crusher.aggregate3_price,
                created_at: crusher.created_at
            },
            deliveries: deliveries.map(d => ({
                id: d._id,
                client_name: d.client_id?.name || '',
                contractor_name: d.contractor_id?.name || '',
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
                created_at: d.created_at
            })),
            payments: payments.map(p => ({
                id: p._id,
                amount: p.amount,
                payment_method: p.payment_method,
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
            totals: {
                totalDeliveries,
                totalPayments,
                totalAdjustments,
                balance
            },
            materialTotals: Object.values(materialTotals)
        });
    } catch (err) {
        next(err);
    }
});

// Create new crusher
router.post('/', async (req, res, next) => {
    try {
        const { name, sand_price, aggregate1_price, aggregate2_price, aggregate3_price } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'اسم الكسارة مطلوب' });
        }

        const crusher = new Crusher({
            name: name.trim(),
            sand_price: toNumber(sand_price),
            aggregate1_price: toNumber(aggregate1_price),
            aggregate2_price: toNumber(aggregate2_price),
            aggregate3_price: toNumber(aggregate3_price)
        });

        await crusher.save();

        res.status(201).json({
            id: crusher._id,
            name: crusher.name,
            sand_price: crusher.sand_price,
            aggregate1_price: crusher.aggregate1_price,
            aggregate2_price: crusher.aggregate2_price,
            aggregate3_price: crusher.aggregate3_price,
            created_at: crusher.created_at
        });
    } catch (err) {
        next(err);
    }
});

// Update crusher
router.put('/:id', async (req, res, next) => {
    try {
        const { name, sand_price, aggregate1_price, aggregate2_price, aggregate3_price } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'اسم الكسارة مطلوب' });
        }

        const crusher = await Crusher.findByIdAndUpdate(
            req.params.id,
            {
                name: name.trim(),
                sand_price: toNumber(sand_price),
                aggregate1_price: toNumber(aggregate1_price),
                aggregate2_price: toNumber(aggregate2_price),
                aggregate3_price: toNumber(aggregate3_price)
            },
            { new: true }
        );

        if (!crusher) {
            return res.status(404).json({ message: 'الكسارة غير موجودة' });
        }

        res.json({
            id: crusher._id,
            name: crusher.name,
            sand_price: crusher.sand_price,
            aggregate1_price: crusher.aggregate1_price,
            aggregate2_price: crusher.aggregate2_price,
            aggregate3_price: crusher.aggregate3_price,
            created_at: crusher.created_at
        });
    } catch (err) {
        next(err);
    }
});

// Delete crusher
router.delete('/:id', async (req, res, next) => {
    try {
        const crusher = await Crusher.findByIdAndDelete(req.params.id);

        if (!crusher) {
            return res.status(404).json({ message: 'الكسارة غير موجودة' });
        }

        res.json({ message: 'تم حذف الكسارة بنجاح' });
    } catch (err) {
        next(err);
    }
});

// Get crusher payments
router.get('/:id/payments', async (req, res, next) => {
    try {
        const { CrusherPayment } = require('../models');
        const payments = await CrusherPayment.find({ crusher_id: req.params.id }).sort({ paid_at: -1 });
        res.json({ payments });
    } catch (err) {
        next(err);
    }
});

// Add crusher payment
router.post('/:id/payments', async (req, res, next) => {
    try {
        const { CrusherPayment } = require('../models');
        const { amount, payment_method, details, note, paid_at } = req.body;

        const payment = new CrusherPayment({
            crusher_id: req.params.id,
            amount: toNumber(amount),
            payment_method: payment_method?.trim() || '',
            details: details?.trim() || '',
            note: note?.trim() || '',
            paid_at: paid_at ? new Date(paid_at) : new Date()
        });

        await payment.save();

        res.status(201).json({
            id: payment._id,
            crusher_id: payment.crusher_id,
            amount: payment.amount,
            payment_method: payment.payment_method,
            details: payment.details,
            note: payment.note,
            paid_at: payment.paid_at
        });
    } catch (err) {
        next(err);
    }
});

// Update crusher payment
router.put('/:id/payments/:paymentId', async (req, res, next) => {
    try {
        const { CrusherPayment } = require('../models');
        const { amount, payment_method, details, note, paid_at } = req.body;

        const payment = await CrusherPayment.findOneAndUpdate(
            { _id: req.params.paymentId, crusher_id: req.params.id },
            {
                amount: toNumber(amount),
                payment_method: payment_method?.trim() || '',
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
            crusher_id: payment.crusher_id,
            amount: payment.amount,
            payment_method: payment.payment_method,
            details: payment.details,
            note: payment.note,
            paid_at: payment.paid_at
        });
    } catch (err) {
        next(err);
    }
});

// Delete crusher payment
router.delete('/:id/payments/:paymentId', async (req, res, next) => {
    try {
        const { CrusherPayment } = require('../models');
        const payment = await CrusherPayment.findOneAndDelete({
            _id: req.params.paymentId,
            crusher_id: req.params.id
        });

        if (!payment) {
            return res.status(404).json({ message: 'الدفعة غير موجودة' });
        }

        res.json({ message: 'تم حذف الدفعة بنجاح' });
    } catch (err) {
        next(err);
    }
});

// Get crusher adjustments
router.get('/:id/adjustments', async (req, res, next) => {
    try {
        const { Adjustment } = require('../models');
        const adjustments = await Adjustment.find({
            entity_type: 'crusher',
            entity_id: req.params.id
        }).sort({ created_at: -1 });
        res.json({ adjustments });
    } catch (err) {
        next(err);
    }
});

// Add crusher adjustment
router.post('/:id/adjustments', async (req, res, next) => {
    try {
        const { Adjustment } = require('../models');
        const { amount, method, details, reason } = req.body;

        const adjustment = new Adjustment({
            entity_type: 'crusher',
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

// Update crusher adjustment
router.put('/:id/adjustments/:adjustmentId', async (req, res, next) => {
    try {
        const { Adjustment } = require('../models');
        const { amount, method, details, reason } = req.body;

        const adjustment = await Adjustment.findOneAndUpdate(
            {
                _id: req.params.adjustmentId,
                entity_type: 'crusher',
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

// Delete crusher adjustment
router.delete('/:id/adjustments/:adjustmentId', async (req, res, next) => {
    try {
        const { Adjustment } = require('../models');
        const adjustment = await Adjustment.findOneAndDelete({
            _id: req.params.adjustmentId,
            entity_type: 'crusher',
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

module.exports = router;