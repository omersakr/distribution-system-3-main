const crusherService = require('../services/crusherService');
const reportService = require('../services/reportService');

class CrushersController {
    // Get all crushers
    async getAllCrushers(req, res, next) {
        try {
            const result = await crusherService.getAllCrushers();
            res.json(result);
        } catch (err) {
            next(err);
        }
    }

    // Get crusher by ID
    async getCrusherById(req, res, next) {
        try {
            const crusher = await crusherService.getCrusherById(req.params.id);

            if (!crusher) {
                return res.status(404).json({ message: 'الكسارة غير موجودة' });
            }

            res.json(crusher);
        } catch (err) {
            next(err);
        }
    }

    // Create new crusher
    async createCrusher(req, res, next) {
        try {
            const { name, sand_price, aggregate1_price, aggregate2_price, aggregate3_price } = req.body;

            if (!name || name.trim() === '') {
                return res.status(400).json({ message: 'اسم الكسارة مطلوب' });
            }

            const crusher = await crusherService.createCrusher({
                name: name.trim(),
                sand_price,
                aggregate1_price,
                aggregate2_price,
                aggregate3_price
            });

            res.status(201).json(crusher);
        } catch (err) {
            if (err.code === 11000) {
                return res.status(400).json({ message: 'اسم الكسارة موجود بالفعل' });
            }
            next(err);
        }
    }

    // Update crusher
    async updateCrusher(req, res, next) {
        try {
            const { name, sand_price, aggregate1_price, aggregate2_price, aggregate3_price } = req.body;

            if (!name || name.trim() === '') {
                return res.status(400).json({ message: 'اسم الكسارة مطلوب' });
            }

            const crusher = await crusherService.updateCrusher(req.params.id, {
                name: name.trim(),
                sand_price,
                aggregate1_price,
                aggregate2_price,
                aggregate3_price
            });

            if (!crusher) {
                return res.status(404).json({ message: 'الكسارة غير موجودة' });
            }

            res.json(crusher);
        } catch (err) {
            if (err.code === 11000) {
                return res.status(400).json({ message: 'اسم الكسارة موجود بالفعل' });
            }
            next(err);
        }
    }

    // Update crusher prices only
    async updateCrusherPrices(req, res, next) {
        try {
            const { sand_price, aggregate1_price, aggregate2_price, aggregate3_price } = req.body;

            // Get current crusher data to preserve the name
            const currentCrusher = await crusherService.getCrusherById(req.params.id);
            if (!currentCrusher) {
                return res.status(404).json({ message: 'الكسارة غير موجودة' });
            }

            const crusher = await crusherService.updateCrusher(req.params.id, {
                name: currentCrusher.crusher.name, // Preserve existing name
                sand_price,
                aggregate1_price,
                aggregate2_price,
                aggregate3_price
            });

            res.json(crusher);
        } catch (err) {
            next(err);
        }
    }

    // Delete crusher
    async deleteCrusher(req, res, next) {
        try {
            const crusher = await crusherService.deleteCrusher(req.params.id);

            if (!crusher) {
                return res.status(404).json({ message: 'الكسارة غير موجودة' });
            }

            res.json({ message: 'تم حذف الكسارة بنجاح' });
        } catch (err) {
            next(err);
        }
    }

    // Get crusher payments
    async getCrusherPayments(req, res, next) {
        try {
            const payments = await crusherService.getCrusherPayments(req.params.id);
            res.json({ payments });
        } catch (err) {
            next(err);
        }
    }

    // Add crusher payment
    async addCrusherPayment(req, res, next) {
        try {
            const { amount, method, details, note, paid_at, payment_image } = req.body;

            const payment = await crusherService.addCrusherPayment(req.params.id, {
                amount,
                method: method?.trim() || '',
                details: details?.trim() || '',
                note: note?.trim() || '',
                paid_at: paid_at ? new Date(paid_at) : new Date(),
                payment_image
            });

            res.status(201).json(payment);
        } catch (err) {
            next(err);
        }
    }

    // Update crusher payment
    async updateCrusherPayment(req, res, next) {
        try {
            const { amount, method, details, note, paid_at, payment_image } = req.body;

            const payment = await crusherService.updateCrusherPayment(
                req.params.id,
                req.params.paymentId,
                {
                    amount,
                    method: method?.trim() || '',
                    details: details?.trim() || '',
                    note: note?.trim() || '',
                    paid_at: paid_at ? new Date(paid_at) : new Date(),
                    payment_image
                }
            );

            if (!payment) {
                return res.status(404).json({ message: 'الدفعة غير موجودة' });
            }

            res.json(payment);
        } catch (err) {
            next(err);
        }
    }

    // Delete crusher payment
    async deleteCrusherPayment(req, res, next) {
        try {
            const payment = await crusherService.deleteCrusherPayment(
                req.params.id,
                req.params.paymentId
            );

            if (!payment) {
                return res.status(404).json({ message: 'الدفعة غير موجودة' });
            }

            res.json({ message: 'تم حذف الدفعة بنجاح' });
        } catch (err) {
            next(err);
        }
    }

    // Get crusher adjustments
    async getCrusherAdjustments(req, res, next) {
        try {
            const adjustments = await crusherService.getCrusherAdjustments(req.params.id);
            res.json({ adjustments });
        } catch (err) {
            next(err);
        }
    }

    // Add crusher adjustment
    async addCrusherAdjustment(req, res, next) {
        try {
            const { amount, method, details, reason } = req.body;

            const adjustment = await crusherService.addCrusherAdjustment(req.params.id, {
                amount,
                method: method?.trim() || '',
                details: details?.trim() || '',
                reason: reason?.trim() || ''
            });

            res.status(201).json(adjustment);
        } catch (err) {
            next(err);
        }
    }

    // Update crusher adjustment
    async updateCrusherAdjustment(req, res, next) {
        try {
            const { amount, method, details, reason } = req.body;

            const adjustment = await crusherService.updateCrusherAdjustment(
                req.params.id,
                req.params.adjustmentId,
                {
                    amount,
                    method: method?.trim() || '',
                    details: details?.trim() || '',
                    reason: reason?.trim() || ''
                }
            );

            if (!adjustment) {
                return res.status(404).json({ message: 'التسوية غير موجودة' });
            }

            res.json(adjustment);
        } catch (err) {
            next(err);
        }
    }

    // Delete crusher adjustment
    async deleteCrusherAdjustment(req, res, next) {
        try {
            const adjustment = await crusherService.deleteCrusherAdjustment(
                req.params.id,
                req.params.adjustmentId
            );

            if (!adjustment) {
                return res.status(404).json({ message: 'التسوية غير موجودة' });
            }

            res.json({ message: 'تم حذف التسوية بنجاح' });
        } catch (err) {
            next(err);
        }
    }

    // Get crusher deliveries report with date filtering
    async getCrusherDeliveriesReport(req, res, next) {
        try {
            const { from, to } = req.query;

            if (!from || !to) {
                return res.status(400).json({ message: 'تاريخ البداية والنهاية مطلوبان' });
            }

            const reportData = await reportService.getCrusherDeliveriesReportData(req.params.id, from, to);
            const html = reportService.generateCrusherDeliveriesReportHTML(reportData);

            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.send(html);
        } catch (err) {
            if (err.message === 'الكسارة غير موجودة') {
                return res.status(404).json({ message: err.message });
            }
            next(err);
        }
    }

    // Get crusher account statement
    async getCrusherAccountStatement(req, res, next) {
        try {
            const { from, to } = req.query;

            const reportData = await reportService.getCrusherAccountStatementData(req.params.id, from, to);
            const html = reportService.generateCrusherAccountStatementHTML(reportData);

            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.send(html);
        } catch (err) {
            if (err.message === 'الكسارة غير موجودة') {
                return res.status(404).json({ message: err.message });
            }
            next(err);
        }
    }
}

module.exports = new CrushersController();