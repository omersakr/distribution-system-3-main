const express = require('express');
const { Contractor } = require('../models');

const router = express.Router();

const toNumber = (v) => Number(v || 0);

// Get all contractors
router.get('/', async (req, res, next) => {
    try {
        const contractors = await Contractor.find().sort({ name: 1 });

        const result = contractors.map(contractor => ({
            id: contractor._id,
            name: contractor.name,
            opening_balance: contractor.opening_balance,
            created_at: contractor.created_at
        }));

        res.json({ contractors: result });
    } catch (err) {
        next(err);
    }
});

// Get contractor by ID
router.get('/:id', async (req, res, next) => {
    try {
        const contractor = await Contractor.findById(req.params.id);

        if (!contractor) {
            return res.status(404).json({ message: 'المقاول غير موجود' });
        }

        // Get related data
        const { Delivery, ContractorPayment, Adjustment } = require('../models');

        const deliveries = await Delivery.find({ contractor_id: req.params.id })
            .populate('client_id', 'name')
            .populate('crusher_id', 'name')
            .sort({ created_at: -1 });

        const payments = await ContractorPayment.find({ contractor_id: req.params.id })
            .sort({ paid_at: -1 });

        const adjustments = await Adjustment.find({
            entity_type: 'contractor',
            entity_id: req.params.id
        }).sort({ created_at: -1 });

        // Calculate totals
        const totalCharges = deliveries.reduce((sum, d) => sum + (d.contractor_total_charge || 0), 0);
        const totalPayments = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const totalAdjustments = adjustments.reduce((sum, a) => sum + (a.amount || 0), 0);
        const balance = contractor.opening_balance + totalCharges + totalAdjustments - totalPayments;

        res.json({
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
                openingBalance: contractor.opening_balance,
                totalCharges,
                totalPayments,
                totalAdjustments,
                balance
            }
        });
    } catch (err) {
        next(err);
    }
});

// Create new contractor
router.post('/', async (req, res, next) => {
    try {
        const { name, opening_balance } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'اسم المقاول مطلوب' });
        }

        const contractor = new Contractor({
            name: name.trim(),
            opening_balance: toNumber(opening_balance)
        });

        await contractor.save();

        res.status(201).json({
            id: contractor._id,
            name: contractor.name,
            opening_balance: contractor.opening_balance,
            created_at: contractor.created_at
        });
    } catch (err) {
        next(err);
    }
});

// Update contractor
router.put('/:id', async (req, res, next) => {
    try {
        const { name, opening_balance } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'اسم المقاول مطلوب' });
        }

        const contractor = await Contractor.findByIdAndUpdate(
            req.params.id,
            {
                name: name.trim(),
                opening_balance: toNumber(opening_balance)
            },
            { new: true }
        );

        if (!contractor) {
            return res.status(404).json({ message: 'المقاول غير موجود' });
        }

        res.json({
            id: contractor._id,
            name: contractor.name,
            opening_balance: contractor.opening_balance,
            created_at: contractor.created_at
        });
    } catch (err) {
        next(err);
    }
});

// Delete contractor
router.delete('/:id', async (req, res, next) => {
    try {
        const contractor = await Contractor.findByIdAndDelete(req.params.id);

        if (!contractor) {
            return res.status(404).json({ message: 'المقاول غير موجود' });
        }

        res.json({ message: 'تم حذف المقاول بنجاح' });
    } catch (err) {
        next(err);
    }
});

// Get contractor payments
router.get('/:id/payments', async (req, res, next) => {
    try {
        const { ContractorPayment } = require('../models');
        const payments = await ContractorPayment.find({ contractor_id: req.params.id }).sort({ paid_at: -1 });
        res.json({ payments });
    } catch (err) {
        next(err);
    }
});

// Add contractor payment
router.post('/:id/payments', async (req, res, next) => {
    try {
        const { ContractorPayment } = require('../models');
        const { amount, method, details, note, paid_at } = req.body;

        const payment = new ContractorPayment({
            contractor_id: req.params.id,
            amount: toNumber(amount),
            method: method?.trim() || '',
            details: details?.trim() || '',
            note: note?.trim() || '',
            paid_at: paid_at ? new Date(paid_at) : new Date()
        });

        await payment.save();

        res.status(201).json({
            id: payment._id,
            contractor_id: payment.contractor_id,
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

// Update contractor payment
router.put('/:id/payments/:paymentId', async (req, res, next) => {
    try {
        const { ContractorPayment } = require('../models');
        const { amount, method, details, note, paid_at } = req.body;

        const payment = await ContractorPayment.findOneAndUpdate(
            { _id: req.params.paymentId, contractor_id: req.params.id },
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
            contractor_id: payment.contractor_id,
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

// Delete contractor payment
router.delete('/:id/payments/:paymentId', async (req, res, next) => {
    try {
        const { ContractorPayment } = require('../models');
        const payment = await ContractorPayment.findOneAndDelete({
            _id: req.params.paymentId,
            contractor_id: req.params.id
        });

        if (!payment) {
            return res.status(404).json({ message: 'الدفعة غير موجودة' });
        }

        res.json({ message: 'تم حذف الدفعة بنجاح' });
    } catch (err) {
        next(err);
    }
});

// Get contractor adjustments
router.get('/:id/adjustments', async (req, res, next) => {
    try {
        const { Adjustment } = require('../models');
        const adjustments = await Adjustment.find({
            entity_type: 'contractor',
            entity_id: req.params.id
        }).sort({ created_at: -1 });
        res.json({ adjustments });
    } catch (err) {
        next(err);
    }
});

// Add contractor adjustment
router.post('/:id/adjustments', async (req, res, next) => {
    try {
        const { Adjustment } = require('../models');
        const { amount, method, details, reason } = req.body;

        const adjustment = new Adjustment({
            entity_type: 'contractor',
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

// Update contractor adjustment
router.put('/:id/adjustments/:adjustmentId', async (req, res, next) => {
    try {
        const { Adjustment } = require('../models');
        const { amount, method, details, reason } = req.body;

        const adjustment = await Adjustment.findOneAndUpdate(
            {
                _id: req.params.adjustmentId,
                entity_type: 'contractor',
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

// Delete contractor adjustment
router.delete('/:id/adjustments/:adjustmentId', async (req, res, next) => {
    try {
        const { Adjustment } = require('../models');
        const adjustment = await Adjustment.findOneAndDelete({
            _id: req.params.adjustmentId,
            entity_type: 'contractor',
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