const contractorService = require('../services/contractorService');

class ContractorsController {
    // Get all contractors
    async getAllContractors(req, res, next) {
        try {
            const result = await contractorService.getAllContractors();
            res.json(result);
        } catch (err) {
            next(err);
        }
    }

    // Get contractor by ID
    async getContractorById(req, res, next) {
        try {
            const contractor = await contractorService.getContractorById(req.params.id);

            if (!contractor) {
                return res.status(404).json({ message: 'المقاول غير موجود' });
            }

            res.json(contractor);
        } catch (err) {
            next(err);
        }
    }

    // Create new contractor
    async createContractor(req, res, next) {
        try {
            const { name, opening_balance } = req.body;

            if (!name || name.trim() === '') {
                return res.status(400).json({ message: 'اسم المقاول مطلوب' });
            }

            const contractor = await contractorService.createContractor({
                name: name.trim(),
                opening_balance
            });

            res.status(201).json(contractor);
        } catch (err) {
            if (err.code === 11000) {
                return res.status(400).json({ message: 'اسم المقاول موجود بالفعل' });
            }
            next(err);
        }
    }

    // Update contractor
    async updateContractor(req, res, next) {
        try {
            const { name, opening_balance } = req.body;

            if (!name || name.trim() === '') {
                return res.status(400).json({ message: 'اسم المقاول مطلوب' });
            }

            const contractor = await contractorService.updateContractor(req.params.id, {
                name: name.trim(),
                opening_balance
            });

            if (!contractor) {
                return res.status(404).json({ message: 'المقاول غير موجود' });
            }

            res.json(contractor);
        } catch (err) {
            if (err.code === 11000) {
                return res.status(400).json({ message: 'اسم المقاول موجود بالفعل' });
            }
            next(err);
        }
    }

    // Delete contractor
    async deleteContractor(req, res, next) {
        try {
            const contractor = await contractorService.deleteContractor(req.params.id);

            if (!contractor) {
                return res.status(404).json({ message: 'المقاول غير موجود' });
            }

            res.json({ message: 'تم حذف المقاول بنجاح' });
        } catch (err) {
            next(err);
        }
    }

    // Get contractor payments
    async getContractorPayments(req, res, next) {
        try {
            const payments = await contractorService.getContractorPayments(req.params.id);
            res.json({ payments });
        } catch (err) {
            next(err);
        }
    }

    // Add contractor payment
    async addContractorPayment(req, res, next) {
        try {
            const { amount, method, details, note, paid_at, payment_image } = req.body;

            const payment = await contractorService.addContractorPayment(req.params.id, {
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

    // Update contractor payment
    async updateContractorPayment(req, res, next) {
        try {
            const { amount, method, details, note, paid_at, payment_image } = req.body;

            const payment = await contractorService.updateContractorPayment(
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

    // Delete contractor payment
    async deleteContractorPayment(req, res, next) {
        try {
            const payment = await contractorService.deleteContractorPayment(
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

    // Get contractor adjustments
    async getContractorAdjustments(req, res, next) {
        try {
            const adjustments = await contractorService.getContractorAdjustments(req.params.id);
            res.json({ adjustments });
        } catch (err) {
            next(err);
        }
    }

    // Add contractor adjustment
    async addContractorAdjustment(req, res, next) {
        try {
            const { amount, reason } = req.body;

            const adjustment = await contractorService.addContractorAdjustment(req.params.id, {
                amount,
                reason: reason?.trim() || ''
            });

            res.status(201).json(adjustment);
        } catch (err) {
            next(err);
        }
    }

    // Update contractor adjustment
    async updateContractorAdjustment(req, res, next) {
        try {
            const { amount, reason } = req.body;

            const adjustment = await contractorService.updateContractorAdjustment(
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

    // Delete contractor adjustment
    async deleteContractorAdjustment(req, res, next) {
        try {
            const adjustment = await contractorService.deleteContractorAdjustment(
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

    // Generate deliveries report
    async generateDeliveriesReport(req, res, next) {
        try {
            const contractorId = req.params.id;
            const { from, to } = req.query;

            // For now, return a simple JSON response
            // In the future, this could generate PDF or Excel reports
            const contractor = await contractorService.getContractorById(contractorId);
            
            if (!contractor) {
                return res.status(404).json({ message: 'المقاول غير موجود' });
            }

            // Filter deliveries by date range if provided
            let deliveries = contractor.deliveries || [];
            if (from && to) {
                const fromDate = new Date(from);
                const toDate = new Date(to);
                deliveries = deliveries.filter(delivery => {
                    const deliveryDate = new Date(delivery.created_at);
                    return deliveryDate >= fromDate && deliveryDate <= toDate;
                });
            }

            res.json({
                contractor: {
                    name: contractor.contractor.name,
                    id: contractor.contractor.id
                },
                period: { from, to },
                deliveries,
                summary: {
                    totalDeliveries: deliveries.length,
                    totalAmount: deliveries.reduce((sum, d) => sum + (d.contractor_total_charge || 0), 0)
                }
            });
        } catch (err) {
            next(err);
        }
    }

    // Generate account statement
    async generateAccountStatement(req, res, next) {
        try {
            const contractorId = req.params.id;
            const { from, to } = req.query;

            const contractor = await contractorService.getContractorById(contractorId);
            
            if (!contractor) {
                return res.status(404).json({ message: 'المقاول غير موجود' });
            }

            // Filter data by date range if provided
            let deliveries = contractor.deliveries || [];
            let payments = contractor.payments || [];
            let adjustments = contractor.adjustments || [];

            if (from && to) {
                const fromDate = new Date(from);
                const toDate = new Date(to);
                
                deliveries = deliveries.filter(d => {
                    const date = new Date(d.created_at);
                    return date >= fromDate && date <= toDate;
                });
                
                payments = payments.filter(p => {
                    const date = new Date(p.paid_at);
                    return date >= fromDate && date <= toDate;
                });
                
                adjustments = adjustments.filter(a => {
                    const date = new Date(a.created_at);
                    return date >= fromDate && date <= toDate;
                });
            }

            res.json({
                contractor: {
                    name: contractor.contractor.name,
                    id: contractor.contractor.id
                },
                period: { from, to },
                transactions: {
                    deliveries,
                    payments,
                    adjustments
                },
                totals: contractor.totals
            });
        } catch (err) {
            next(err);
        }
    }
}

module.exports = new ContractorsController();