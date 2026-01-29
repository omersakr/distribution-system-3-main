const clientService = require('../services/clientService');
const reportService = require('../services/reportService');

class ClientsController {
    // Get all clients with balances, supporting search, filter, sort, pagination
    async getAllClients(req, res, next) {
        try {
            const {
                search,
                sort = 'name',
                order = 'asc',
                page = 1,
                limit = 25
            } = req.query;

            const result = await clientService.getAllClients({
                search,
                sort,
                order,
                page: parseInt(page),
                limit: parseInt(limit)
            });

            res.json(result);
        } catch (err) {
            next(err);
        }
    }

    // Get client by ID with balance details
    async getClientById(req, res, next) {
        try {
            const client = await clientService.getClientById(req.params.id);

            if (!client) {
                return res.status(404).json({ message: 'العميل غير موجود' });
            }

            res.json(client);
        } catch (err) {
            next(err);
        }
    }

    // Create new client
    async createClient(req, res, next) {
        try {
            const { name, phone, opening_balance } = req.body;

            if (!name || name.trim() === '') {
                return res.status(400).json({ message: 'اسم العميل مطلوب' });
            }

            const client = await clientService.createClient({
                name: name.trim(),
                phone: phone?.trim() || '',
                opening_balance
            });

            res.status(201).json(client);
        } catch (err) {
            if (err.code === 11000) {
                return res.status(400).json({ message: 'اسم العميل موجود بالفعل' });
            }
            next(err);
        }
    }

    // Update client
    async updateClient(req, res, next) {
        try {
            const { name, phone, opening_balance } = req.body;

            if (!name || name.trim() === '') {
                return res.status(400).json({ message: 'اسم العميل مطلوب' });
            }

            const client = await clientService.updateClient(req.params.id, {
                name: name.trim(),
                phone: phone?.trim() || '',
                opening_balance
            });

            if (!client) {
                return res.status(404).json({ message: 'العميل غير موجود' });
            }

            res.json(client);
        } catch (err) {
            if (err.code === 11000) {
                return res.status(400).json({ message: 'اسم العميل موجود بالفعل' });
            }
            next(err);
        }
    }

    // Delete client
    async deleteClient(req, res, next) {
        try {
            const client = await clientService.deleteClient(req.params.id);

            if (!client) {
                return res.status(404).json({ message: 'العميل غير موجود' });
            }

            res.json({ message: 'تم حذف العميل بنجاح' });
        } catch (err) {
            next(err);
        }
    }

    // Get client payments
    async getClientPayments(req, res, next) {
        try {
            const payments = await clientService.getClientPayments(req.params.id);
            res.json({ payments });
        } catch (err) {
            next(err);
        }
    }

    // Add client payment
    async addClientPayment(req, res, next) {
        try {
            const { amount, method, details, note, paid_at, payment_image } = req.body;

            const payment = await clientService.addClientPayment(req.params.id, {
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

    // Update client payment
    async updateClientPayment(req, res, next) {
        try {
            const { amount, method, details, note, paid_at, payment_image } = req.body;

            const payment = await clientService.updateClientPayment(
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

    // Delete client payment
    async deleteClientPayment(req, res, next) {
        try {
            const payment = await clientService.deleteClientPayment(
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

    // Get client adjustments
    async getClientAdjustments(req, res, next) {
        try {
            const adjustments = await clientService.getClientAdjustments(req.params.id);
            res.json({ adjustments });
        } catch (err) {
            next(err);
        }
    }

    // Add client adjustment
    async addClientAdjustment(req, res, next) {
        try {
            const { amount, reason } = req.body;

            const adjustment = await clientService.addClientAdjustment(req.params.id, {
                amount,
                reason: reason?.trim() || ''
            });

            res.status(201).json(adjustment);
        } catch (err) {
            next(err);
        }
    }

    // Update client adjustment
    async updateClientAdjustment(req, res, next) {
        try {
            const { amount, reason } = req.body;

            const adjustment = await clientService.updateClientAdjustment(
                req.params.id,
                req.params.adjustmentId,
                {
                    amount,
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

    // Delete client adjustment
    async deleteClientAdjustment(req, res, next) {
        try {
            const adjustment = await clientService.deleteClientAdjustment(
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

    // Get client deliveries report with date filtering
    async getClientDeliveriesReport(req, res, next) {
        try {
            const { from, to } = req.query;

            if (!from || !to) {
                return res.status(400).json({ message: 'تاريخ البداية والنهاية مطلوبان' });
            }

            const reportData = await reportService.getDeliveriesReportData(req.params.id, from, to);
            const html = reportService.generateDeliveriesReportHTML(reportData);

            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.send(html);
        } catch (err) {
            if (err.message === 'العميل غير موجود') {
                return res.status(404).json({ message: err.message });
            }
            next(err);
        }
    }

    // Get client account statement
    async getClientAccountStatement(req, res, next) {
        try {
            const { from, to } = req.query;

            const reportData = await reportService.getAccountStatementData(req.params.id, from, to);
            const html = reportService.generateAccountStatementHTML(reportData);

            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.send(html);
        } catch (err) {
            if (err.message === 'العميل غير موجود') {
                return res.status(404).json({ message: err.message });
            }
            next(err);
        }
    }
}

module.exports = new ClientsController();