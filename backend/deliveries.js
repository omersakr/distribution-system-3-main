const express = require('express');
const db = require('../db');

const router = express.Router();

const toNumber = (v) => Number(v || 0);

// List deliveries with optional filters
router.get('/', async (req, res, next) => {
  try {
    const { clientId, crusherId, contractorId } = req.query;

    let query = db('deliveries as d')
      .leftJoin('clients as cl', 'd.client_id', 'cl.id')
      .leftJoin('crushers as cr', 'd.crusher_id', 'cr.id')
      .leftJoin('contractors as ct', 'd.contractor_id', 'ct.id')
      .select(
        'd.*',
        'cl.name as client_name',
        'cr.name as crusher_name',
        'ct.name as contractor_name'
      )
      .orderBy('d.created_at', 'desc');

    if (clientId) query = query.where('d.client_id', clientId);
    if (crusherId) query = query.where('d.crusher_id', crusherId);
    if (contractorId) query = query.where('d.contractor_id', contractorId);

    const rows = await query;
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Create delivery
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
      driver_name,
      car_head,
      car_tail,
      car_volume,
      contractor_charge
    } = req.body;

    if (!client_id) {
      return res.status(400).json({ message: 'client_id مطلوب' });
    }
    if (!quantity || isNaN(quantity) || Number(quantity) <= 0) {
      return res.status(400).json({ message: 'الكمية غير صالحة' });
    }
    if (price_per_meter === undefined || price_per_meter === null || isNaN(price_per_meter)) {
      return res.status(400).json({ message: 'السعر غير صالح' });
    }

    const grossQty = toNumber(quantity);
    const discount = Math.max(toNumber(discount_volume), 0);
    const netQty = Math.max(grossQty - discount, 0);
    const unitPrice = toNumber(price_per_meter);
    const totalValue = netQty * unitPrice;

    const [id] = await db('deliveries').insert({
      client_id,
      crusher_id: crusher_id || null,
      contractor_id: contractor_id || null,
      material: material || null,
      voucher: voucher || null,
      quantity: grossQty,
      discount_volume: discount,
      net_quantity: netQty,
      price_per_meter: unitPrice,
      total_value: totalValue,
      driver_name: driver_name || null,
      car_head: car_head || null,
      car_tail: car_tail || null,
      car_volume: car_volume ? toNumber(car_volume) : null,
      contractor_charge: contractor_charge ? toNumber(contractor_charge) : 0
    });

    const delivery = await db('deliveries').where({ id }).first();
    res.status(201).json(delivery);
  } catch (err) {
    next(err);
  }
});

module.exports = require('../routes/deliveries');