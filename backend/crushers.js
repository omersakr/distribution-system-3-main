const express = require('express');
const db = require('../db');

const router = express.Router();

const toNumber = (v) => Number(v || 0);

async function getCrusher(id) {
  return db('crushers').where({ id }).first();
}

async function computeCrusherTotals(crusherId) {
  const [{ sum: volumeSum }] = await db('deliveries')
    .where({ crusher_id: crusherId })
    .sum({ sum: 'net_quantity' });

  const [{ sum: valueSum }] = await db('deliveries')
    .where({ crusher_id: crusherId })
    .sum({ sum: 'total_value' });

  const [{ count: deliveriesCount }] = await db('deliveries')
    .where({ crusher_id: crusherId })
    .count({ count: 'id' });

  const [{ sum: adjustmentsSum }] = await db('adjustments')
    .where({ entity_type: 'crusher', entity_id: crusherId })
    .sum({ sum: 'amount' });

  return {
    totalVolume: toNumber(volumeSum),
    totalValue: toNumber(valueSum),
    deliveriesCount: Number(deliveriesCount || 0),
    totalAdjustments: toNumber(adjustmentsSum)
  };
}

// Get all crushers with totals
router.get('/', async (req, res, next) => {
  try {
    const crushers = await db('crushers')
      .select('id', 'name', 'created_at')
      .orderBy('id', 'desc');

    const enriched = await Promise.all(
      crushers.map(async (crusher) => {
        const totals = await computeCrusherTotals(crusher.id);
        return { ...crusher, ...totals };
      })
    );

    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

// Create crusher
router.post('/', async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'الاسم مطلوب' });
    }
    const [id] = await db('crushers').insert({ name: name.trim() });
    const crusher = await getCrusher(id);
    res.status(201).json(crusher);
  } catch (err) {
    next(err);
  }
});

// Crusher details with deliveries
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const crusher = await getCrusher(id);
    if (!crusher) {
      return res.status(404).json({ message: 'الكسارة غير موجودة' });
    }

    const totals = await computeCrusherTotals(id);

    const deliveries = await db('deliveries as d')
      .leftJoin('clients as cl', 'd.client_id', 'cl.id')
      .leftJoin('contractors as ct', 'd.contractor_id', 'ct.id')
      .select(
        'd.*',
        'cl.name as client_name',
        'ct.name as contractor_name'
      )
      .where('d.crusher_id', id)
      .orderBy('d.created_at', 'desc');

    const adjustments = await db('adjustments')
      .where({ entity_type: 'crusher', entity_id: id })
      .orderBy('created_at', 'desc');

    res.json({ crusher, totals, deliveries, adjustments });
  } catch (err) {
    next(err);
  }
});

// Add crusher adjustment
router.post('/:id/adjustments', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;
    if (!amount || isNaN(amount) || Number(amount) === 0) {
      return res.status(400).json({ message: 'القيمة غير صالحة' });
    }

    const crusher = await getCrusher(id);
    if (!crusher) {
      return res.status(404).json({ message: 'الكسارة غير موجودة' });
    }

    const [adjId] = await db('adjustments').insert({
      entity_type: 'crusher',
      entity_id: id,
      amount: toNumber(amount),
      reason: reason || null,
      created_at: db.fn.now()
    });

    const adjustment = await db('adjustments').where({ id: adjId }).first();
    res.status(201).json(adjustment);
  } catch (err) {
    next(err);
  }
});

module.exports = require('./routes/crushers');