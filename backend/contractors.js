const express = require('express');
const db = require('./db');

const router = express.Router();

const toNumber = (v) => Number(v || 0);

async function getContractor(id) {
  return db('contractors').where({ id }).first();
}

async function computeContractorTotals(contractorId) {
  const [{ sum: tripsSum }] = await db('deliveries')
    .where({ contractor_id: contractorId })
    .sum({ sum: 'contractor_charge' });

  const [{ sum: paymentsSum }] = await db('contractor_payments')
    .where({ contractor_id: contractorId })
    .sum({ sum: 'amount' });

  const [{ sum: adjustmentsSum }] = await db('adjustments')
    .where({ entity_type: 'contractor', entity_id: contractorId })
    .sum({ sum: 'amount' });

  const contractor = await getContractor(contractorId);
  const opening = contractor ? toNumber(contractor.opening_balance) : 0;

  const totalTrips = toNumber(tripsSum);
  const totalPayments = toNumber(paymentsSum);
  const totalAdjustments = toNumber(adjustmentsSum);

  return {
    openingBalance: opening,
    totalTrips,
    totalPayments,
    totalAdjustments,
    balance: opening + totalTrips + totalAdjustments - totalPayments
  };
}

// List contractors with balances
router.get('/', async (req, res, next) => {
  try {
    const contractors = await db('contractors')
      .select('id', 'name', 'opening_balance', 'created_at')
      .orderBy('id', 'desc');

    const enriched = await Promise.all(
      contractors.map(async (c) => {
        const totals = await computeContractorTotals(c.id);
        return { ...c, ...totals };
      })
    );

    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

// Create contractor
router.post('/', async (req, res, next) => {
  try {
    const { name, opening_balance } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'الاسم مطلوب' });
    }

    const [id] = await db('contractors').insert({
      name: name.trim(),
      opening_balance: toNumber(opening_balance)
    });

    const contractor = await getContractor(id);
    res.status(201).json(contractor);
  } catch (err) {
    next(err);
  }
});

// Contractor details
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const contractor = await getContractor(id);
    if (!contractor) {
      return res.status(404).json({ message: 'المقاول غير موجود' });
    }

    const totals = await computeContractorTotals(id);

    const deliveries = await db('deliveries as d')
      .leftJoin('clients as cl', 'd.client_id', 'cl.id')
      .leftJoin('crushers as cr', 'd.crusher_id', 'cr.id')
      .select(
        'd.*',
        'cl.name as client_name',
        'cr.name as crusher_name'
      )
      .where('d.contractor_id', id)
      .orderBy('d.created_at', 'desc');

    const payments = await db('contractor_payments')
      .where({ contractor_id: id })
      .orderBy('paid_at', 'desc');

    const adjustments = await db('adjustments')
      .where({ entity_type: 'contractor', entity_id: id })
      .orderBy('created_at', 'desc');

    res.json({ contractor, totals, deliveries, payments, adjustments });
  } catch (err) {
    next(err);
  }
});

// Add contractor payment (advance or settlement)
router.post('/:id/payments', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, note, paid_at } = req.body;

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ message: 'المبلغ غير صالح' });
    }

    const contractor = await getContractor(id);
    if (!contractor) {
      return res.status(404).json({ message: 'المقاول غير موجود' });
    }

    const [paymentId] = await db('contractor_payments').insert({
      contractor_id: id,
      amount: toNumber(amount),
      note: note || null,
      paid_at: paid_at || db.fn.now()
    });

    const payment = await db('contractor_payments').where({ id: paymentId }).first();
    res.status(201).json(payment);
  } catch (err) {
    next(err);
  }
});

// Add contractor adjustment
router.post('/:id/adjustments', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;
    if (!amount || isNaN(amount) || Number(amount) === 0) {
      return res.status(400).json({ message: 'القيمة غير صالحة' });
    }

    const contractor = await getContractor(id);
    if (!contractor) {
      return res.status(404).json({ message: 'المقاول غير موجود' });
    }

    const [adjId] = await db('adjustments').insert({
      entity_type: 'contractor',
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

module.exports = router;