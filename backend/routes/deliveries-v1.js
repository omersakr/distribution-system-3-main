const express = require('express');
const { Delivery, Client, Crusher, Contractor } = require('../models');

const router = express.Router();

const toNumber = (v) => Number(v || 0);

// Get all deliveries
router.get('/', async (req, res, next) => {
    try {
        const deliveries = await Delivery.find()
            .populate('client_id', 'name')
            .populate('crusher_id', 'name')
            .populate('contractor_id', 'name')
            .sort({ created_at: -1 });

        const result = deliveries.map(delivery => ({
            id: delivery._id,
            client_name: delivery.client_id?.name || '',
            crusher_name: delivery.crusher_id?.name || '',
            contractor_name: delivery.contractor_id?.name || '',
            material: delivery.material,
            voucher: delivery.voucher,
            quantity: delivery.quantity,
            discount_volume: delivery.discount_volume,
            net_quantity: delivery.net_quantity,
            price_per_meter: delivery.price_per_meter,
            total_value: delivery.total_value,
            material_price_at_time: delivery.material_price_at_time,
            crusher_total_cost: delivery.crusher_total_cost,
            driver_name: delivery.driver_name,
            car_head: delivery.car_head,
            car_tail: delivery.car_tail,
            car_volume: delivery.car_volume,
            contractor_charge_per_meter: delivery.contractor_charge_per_meter,
            contractor_total_charge: delivery.contractor_total_charge,
            created_at: delivery.created_at
        }));

        res.json({ deliveries: result });
    } catch (err) {
        next(err);
    }
});

// Get delivery by ID
router.get('/:id', async (req, res, next) => {
    try {
        const delivery = await Delivery.findById(req.params.id)
            .populate('client_id', 'name')
            .populate('crusher_id', 'name')
            .populate('contractor_id', 'name');

        if (!delivery) {
            return res.status(404).json({ message: 'التسليم غير موجود' });
        }

        res.json({
            id: delivery._id,
            client_id: delivery.client_id?._id,
            client_name: delivery.client_id?.name || '',
            crusher_id: delivery.crusher_id?._id,
            crusher_name: delivery.crusher_id?.name || '',
            contractor_id: delivery.contractor_id?._id,
            contractor_name: delivery.contractor_id?.name || '',
            material: delivery.material,
            voucher: delivery.voucher,
            quantity: delivery.quantity,
            discount_volume: delivery.discount_volume,
            net_quantity: delivery.net_quantity,
            price_per_meter: delivery.price_per_meter,
            total_value: delivery.total_value,
            material_price_at_time: delivery.material_price_at_time,
            crusher_total_cost: delivery.crusher_total_cost,
            driver_name: delivery.driver_name,
            car_head: delivery.car_head,
            car_tail: delivery.car_tail,
            car_volume: delivery.car_volume,
            contractor_charge_per_meter: delivery.contractor_charge_per_meter,
            contractor_total_charge: delivery.contractor_total_charge,
            created_at: delivery.created_at
        });
    } catch (err) {
        next(err);
    }
});

// Create new delivery
router.post('/', async (req, res, next) => {
    try {
        const {
            client_id,
            crusher_id,
            contractor_id,
            material,
            voucher,
            quantity,
            discount_volume,
            price_per_meter,
            material_price_at_time,
            driver_name,
            car_head,
            car_tail,
            car_volume,
            contractor_charge_per_meter
        } = req.body;

        if (!client_id || !material_price_at_time) {
            return res.status(400).json({ message: 'العميل وسعر المادة مطلوبان' });
        }

        const delivery = new Delivery({
            client_id,
            crusher_id: crusher_id || null,
            contractor_id: contractor_id || null,
            material,
            voucher,
            quantity: toNumber(quantity),
            discount_volume: toNumber(discount_volume),
            price_per_meter: toNumber(price_per_meter),
            material_price_at_time: toNumber(material_price_at_time),
            driver_name,
            car_head,
            car_tail,
            car_volume: toNumber(car_volume),
            contractor_charge_per_meter: toNumber(contractor_charge_per_meter)
        });

        await delivery.save();

        res.status(201).json({
            id: delivery._id,
            message: 'تم إنشاء التسليم بنجاح'
        });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: 'رقم الفاتورة موجود بالفعل' });
        }
        next(err);
    }
});

module.exports = router;