const supplierService = require('../services/supplierService');
const PDFService = require('../services/pdfServiceUltraFast');

class SupplierController {
    // Get all suppliers
    async getAllSuppliers(req, res, next) {
        try {
            const result = await supplierService.getAllSuppliers();
            res.json(result);
        } catch (err) {
            next(err);
        }
    }

    // Get supplier by ID
    async getSupplierById(req, res, next) {
        try {
            const supplier = await supplierService.getSupplierById(req.params.id);

            if (!supplier) {
                return res.status(404).json({ message: 'المورد غير موجود' });
            }

            res.json(supplier);
        } catch (err) {
            next(err);
        }
    }

    // Create new supplier
    async createSupplier(req, res, next) {
        try {
            const { name, phone_number, notes, materials, status } = req.body;

            if (!name || name.trim() === '') {
                return res.status(400).json({ message: 'اسم المورد مطلوب' });
            }

            // Validate materials
            if (!materials || !Array.isArray(materials) || materials.length === 0) {
                return res.status(400).json({ message: 'يجب إضافة مادة واحدة على الأقل' });
            }

            for (const material of materials) {
                if (!material.name || material.name.trim() === '') {
                    return res.status(400).json({ message: 'اسم المادة مطلوب' });
                }
                if (!material.price_per_unit || material.price_per_unit <= 0) {
                    return res.status(400).json({ message: 'سعر المادة مطلوب ويجب أن يكون أكبر من صفر' });
                }
            }

            const supplier = await supplierService.createSupplier({
                name: name.trim(),
                phone_number: phone_number?.trim(),
                notes: notes?.trim(),
                materials: materials.map(m => ({
                    name: m.name.trim(),
                    price_per_unit: parseFloat(m.price_per_unit)
                })),
                status: status || 'Active'
            });

            res.status(201).json(supplier);
        } catch (err) {
            if (err.code === 11000) {
                return res.status(400).json({ message: 'اسم المورد موجود بالفعل' });
            }
            next(err);
        }
    }

    // Update supplier
    async updateSupplier(req, res, next) {
        try {
            const { name, phone_number, notes, materials, status } = req.body;

            if (!name || name.trim() === '') {
                return res.status(400).json({ message: 'اسم المورد مطلوب' });
            }

            // Validate materials if provided
            if (materials) {
                if (!Array.isArray(materials) || materials.length === 0) {
                    return res.status(400).json({ message: 'يجب إضافة مادة واحدة على الأقل' });
                }

                for (const material of materials) {
                    if (!material.name || material.name.trim() === '') {
                        return res.status(400).json({ message: 'اسم المادة مطلوب' });
                    }
                    if (!material.price_per_unit || material.price_per_unit <= 0) {
                        return res.status(400).json({ message: 'سعر المادة مطلوب ويجب أن يكون أكبر من صفر' });
                    }
                }
            }

            const updateData = {
                name: name.trim(),
                phone_number: phone_number?.trim(),
                notes: notes?.trim(),
                status: status || 'Active'
            };

            if (materials) {
                updateData.materials = materials.map(m => ({
                    name: m.name.trim(),
                    price_per_unit: parseFloat(m.price_per_unit)
                }));
            }

            const supplier = await supplierService.updateSupplier(req.params.id, updateData);

            if (!supplier) {
                return res.status(404).json({ message: 'المورد غير موجود' });
            }

            res.json(supplier);
        } catch (err) {
            if (err.code === 11000) {
                return res.status(400).json({ message: 'اسم المورد موجود بالفعل' });
            }
            next(err);
        }
    }

    // Delete supplier
    async deleteSupplier(req, res, next) {
        try {
            const supplier = await supplierService.deleteSupplier(req.params.id);

            if (!supplier) {
                return res.status(404).json({ message: 'المورد غير موجود' });
            }

            res.json({ message: 'تم حذف المورد بنجاح' });
        } catch (err) {
            if (err.message.includes('لا يمكن حذف المورد')) {
                return res.status(400).json({ message: err.message });
            }
            next(err);
        }
    }

    // ============================================================================
    // SUPPLIER MATERIALS MANAGEMENT
    // ============================================================================

    // Add material to supplier
    async addSupplierMaterial(req, res, next) {
        try {
            const { name, price_per_unit } = req.body;

            if (!name || name.trim() === '') {
                return res.status(400).json({ message: 'اسم المادة مطلوب' });
            }

            if (!price_per_unit || price_per_unit <= 0) {
                return res.status(400).json({ message: 'سعر المادة مطلوب ويجب أن يكون أكبر من صفر' });
            }

            const material = await supplierService.addSupplierMaterial(req.params.id, {
                name: name.trim(),
                price_per_unit: parseFloat(price_per_unit)
            });

            res.status(201).json(material);
        } catch (err) {
            if (err.message.includes('موجودة بالفعل')) {
                return res.status(400).json({ message: err.message });
            }
            next(err);
        }
    }

    // Update supplier material
    async updateSupplierMaterial(req, res, next) {
        try {
            const { name, price_per_unit } = req.body;

            if (!name || name.trim() === '') {
                return res.status(400).json({ message: 'اسم المادة مطلوب' });
            }

            if (!price_per_unit || price_per_unit <= 0) {
                return res.status(400).json({ message: 'سعر المادة مطلوب ويجب أن يكون أكبر من صفر' });
            }

            const material = await supplierService.updateSupplierMaterial(
                req.params.id,
                req.params.materialId,
                {
                    name: name.trim(),
                    price_per_unit: parseFloat(price_per_unit)
                }
            );

            if (!material) {
                return res.status(404).json({ message: 'المادة غير موجودة' });
            }

            res.json(material);
        } catch (err) {
            if (err.message.includes('موجودة بالفعل')) {
                return res.status(400).json({ message: err.message });
            }
            next(err);
        }
    }

    // Delete supplier material
    async deleteSupplierMaterial(req, res, next) {
        try {
            const material = await supplierService.deleteSupplierMaterial(
                req.params.id,
                req.params.materialId
            );

            if (!material) {
                return res.status(404).json({ message: 'المادة غير موجودة' });
            }

            res.json({ message: 'تم حذف المادة بنجاح' });
        } catch (err) {
            if (err.message.includes('لا يمكن حذف المادة')) {
                return res.status(400).json({ message: err.message });
            }
            next(err);
        }
    }

    // ============================================================================
    // SUPPLIER PAYMENTS MANAGEMENT
    // ============================================================================

    // Add supplier payment
    async addSupplierPayment(req, res, next) {
        try {
            const { amount, method, details, note, payment_image, paid_at } = req.body;

            if (!amount || amount <= 0) {
                return res.status(400).json({ message: 'مبلغ الدفع مطلوب ويجب أن يكون أكبر من صفر' });
            }

            const payment = await supplierService.addSupplierPayment(req.params.id, {
                amount: parseFloat(amount),
                method: method?.trim(),
                details: details?.trim(),
                note: note?.trim(),
                payment_image,
                paid_at: paid_at ? new Date(paid_at) : new Date()
            });

            res.status(201).json(payment);
        } catch (err) {
            next(err);
        }
    }

    // Update supplier payment
    async updateSupplierPayment(req, res, next) {
        try {
            const { amount, method, details, note, payment_image, paid_at } = req.body;

            if (!amount || amount <= 0) {
                return res.status(400).json({ message: 'مبلغ الدفع مطلوب ويجب أن يكون أكبر من صفر' });
            }

            const payment = await supplierService.updateSupplierPayment(
                req.params.id,
                req.params.paymentId,
                {
                    amount: parseFloat(amount),
                    method: method?.trim(),
                    details: details?.trim(),
                    note: note?.trim(),
                    payment_image,
                    paid_at: paid_at ? new Date(paid_at) : undefined
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

    // Delete supplier payment
    async deleteSupplierPayment(req, res, next) {
        try {
            const payment = await supplierService.deleteSupplierPayment(
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

    // ============================================================================
    // SUPPLIER REPORTS
    // ============================================================================

    // Generate deliveries report
    async generateDeliveriesReport(req, res, next) {
        try {
            // Handle both GET and POST requests
            const { from, to } = req.method === 'POST' ? req.body : req.query;
            const supplierId = req.params.id;

            const reportData = await supplierService.generateDeliveriesReport(supplierId, from, to);

            // Generate HTML report
            const html = this.generateDeliveriesReportHTML(reportData);

            // Generate PDF using smart method for optimal performance
            const pdfBuffer = await PDFService.generatePDFSmart(html);

            // Create filename
            const filename = PDFService.formatFilename(
                'تقرير_التوريدات',
                reportData.supplier.name,
                from,
                to
            );

            // Set headers for PDF download
            const headers = PDFService.getDownloadHeaders(filename);
            Object.entries(headers).forEach(([key, value]) => {
                res.setHeader(key, value);
            });

            // Set content length
            res.setHeader('Content-Length', pdfBuffer.length);

            // Send the PDF buffer
            res.end(pdfBuffer, 'binary');
        } catch (err) {
            console.error('PDF generation error:', err);
            next(err);
        }
    }

    // Generate account statement
    async generateAccountStatement(req, res, next) {
        try {
            // Handle both GET and POST requests
            const { from, to } = req.method === 'POST' ? req.body : req.query;
            const supplierId = req.params.id;

            const reportData = await supplierService.generateAccountStatement(supplierId, from, to);

            // Generate HTML report
            const html = this.generateAccountStatementHTML(reportData);

            // Generate PDF using smart method for optimal performance
            const pdfBuffer = await PDFService.generatePDFSmart(html);

            // Create filename
            const filename = PDFService.formatFilename(
                'كشف_حساب',
                reportData.supplier.name,
                from,
                to
            );

            // Set headers for PDF download
            const headers = PDFService.getDownloadHeaders(filename);
            Object.entries(headers).forEach(([key, value]) => {
                res.setHeader(key, value);
            });

            // Set content length
            res.setHeader('Content-Length', pdfBuffer.length);

            // Send the PDF buffer
            res.end(pdfBuffer, 'binary');
        } catch (err) {
            console.error('PDF generation error:', err);
            next(err);
        }
    }

    // Helper method to generate deliveries report HTML
    generateDeliveriesReportHTML(data) {
        const formatCurrency = (amount) => {
            return Number(amount || 0).toLocaleString('ar-EG', {
                style: 'currency',
                currency: 'EGP',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            });
        };

        const formatDate = (dateStr) => {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            return date.toLocaleDateString('ar-EG', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        };

        const formatQuantity = (amount) => {
            return Number(amount || 0).toLocaleString('ar-EG', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        };

        const periodText = data.period.from && data.period.to
            ? `من ${formatDate(data.period.from)} إلى ${formatDate(data.period.to)}`
            : 'جميع الفترات';

        let materialSummaryHTML = '';
        data.materialSummary.forEach(material => {
            materialSummaryHTML += `
                <tr>
                    <td>${material.material}</td>
                    <td>${formatQuantity(material.quantity)} م³</td>
                    <td>${formatCurrency(material.totalCost)}</td>
                    <td>${material.deliveries.length}</td>
                </tr>
            `;
        });

        let deliveriesHTML = '';
        data.deliveries.forEach(delivery => {
            deliveriesHTML += `
                <tr>
                    <td>${formatDate(delivery.date)}</td>
                    <td>${delivery.client_name}</td>
                    <td>${delivery.material}</td>
                    <td>${formatQuantity(delivery.quantity)} م³</td>
                    <td>${formatCurrency(delivery.price)}</td>
                    <td>${formatCurrency(delivery.total)}</td>
                    <td>${delivery.voucher || '-'}</td>
                </tr>
            `;
        });

        return `
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>تقرير توريدات المورد - ${data.supplier.name}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
                    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #007bff; padding-bottom: 20px; }
                    .header h1 { color: #007bff; margin: 0; font-size: 2rem; }
                    .header h2 { color: #666; margin: 10px 0 0 0; font-size: 1.2rem; }
                    .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
                    .info-card { background: #f8f9fa; padding: 15px; border-radius: 6px; text-align: center; }
                    .info-card .value { font-size: 1.5rem; font-weight: bold; color: #007bff; }
                    .info-card .label { color: #666; margin-top: 5px; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { padding: 12px; text-align: right; border-bottom: 1px solid #ddd; }
                    th { background: #007bff; color: white; font-weight: bold; }
                    tr:nth-child(even) { background: #f8f9fa; }
                    .section-title { color: #007bff; font-size: 1.3rem; margin: 30px 0 15px 0; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
                    .print-btn { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin: 20px 0; }
                    @media print { .print-btn { display: none; } }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>تقرير توريدات المورد</h1>
                        <h2>${data.supplier.name}</h2>
                        <p>الفترة: ${periodText}</p>
                        <p>تاريخ الإنشاء: ${formatDate(new Date())}</p>
                    </div>

                    <div class="info-grid">
                        <div class="info-card">
                            <div class="value">${formatQuantity(data.summary.totalQuantity)} م³</div>
                            <div class="label">إجمالي الكمية</div>
                        </div>
                        <div class="info-card">
                            <div class="value">${formatCurrency(data.summary.totalValue)}</div>
                            <div class="label">إجمالي القيمة</div>
                        </div>
                        <div class="info-card">
                            <div class="value">${data.summary.deliveriesCount}</div>
                            <div class="label">عدد التسليمات</div>
                        </div>
                    </div>

                    <h3 class="section-title">ملخص المواد</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>المادة</th>
                                <th>الكمية الإجمالية</th>
                                <th>القيمة الإجمالية</th>
                                <th>عدد التسليمات</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${materialSummaryHTML}
                        </tbody>
                    </table>

                    <h3 class="section-title">تفاصيل التسليمات</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>التاريخ</th>
                                <th>العميل</th>
                                <th>المادة</th>
                                <th>الكمية</th>
                                <th>السعر</th>
                                <th>الإجمالي</th>
                                <th>رقم البون</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${deliveriesHTML}
                        </tbody>
                    </table>

                    <button class="print-btn" onclick="window.print()">طباعة التقرير</button>
                </div>
            </body>
            </html>
        `;
    }

    // Helper method to generate account statement HTML
    generateAccountStatementHTML(data) {
        const formatCurrency = (amount) => {
            return Number(amount || 0).toLocaleString('ar-EG', {
                style: 'currency',
                currency: 'EGP',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            });
        };

        const formatDate = (dateStr) => {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            return date.toLocaleDateString('ar-EG', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        };

        const formatQuantity = (amount) => {
            return Number(amount || 0).toLocaleString('ar-EG', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        };

        const periodText = data.period.isFullHistory
            ? 'كامل التاريخ'
            : `من ${formatDate(data.period.from)} إلى ${formatDate(data.period.to)}`;

        let transactionsHTML = '';
        data.transactions.forEach(transaction => {
            const balanceClass = transaction.balance > 0 ? 'text-danger' : transaction.balance < 0 ? 'text-success' : '';
            transactionsHTML += `
                <tr>
                    <td>${formatDate(transaction.date)}</td>
                    <td>${transaction.description}</td>
                    <td>${transaction.voucher || '-'}</td>
                    <td>${transaction.quantity ? formatQuantity(transaction.quantity) + ' م³' : '-'}</td>
                    <td>${transaction.price ? formatCurrency(transaction.price) : '-'}</td>
                    <td>${transaction.debit > 0 ? formatCurrency(transaction.debit) : '-'}</td>
                    <td>${transaction.credit > 0 ? formatCurrency(transaction.credit) : '-'}</td>
                    <td class="${balanceClass}">${formatCurrency(Math.abs(transaction.balance))}</td>
                </tr>
            `;
        });

        const balanceClass = data.summary.balance > 0 ? 'text-danger' : data.summary.balance < 0 ? 'text-success' : '';

        return `
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>كشف حساب المورد - ${data.supplier.name}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
                    .container { max-width: 1400px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #007bff; padding-bottom: 20px; }
                    .header h1 { color: #007bff; margin: 0; font-size: 2rem; }
                    .header h2 { color: #666; margin: 10px 0 0 0; font-size: 1.2rem; }
                    .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
                    .info-card { background: #f8f9fa; padding: 15px; border-radius: 6px; text-align: center; }
                    .info-card .value { font-size: 1.5rem; font-weight: bold; color: #007bff; }
                    .info-card .label { color: #666; margin-top: 5px; }
                    .balance-card { background: linear-gradient(135deg, #28a745, #20c997); color: white; }
                    .balance-card.negative { background: linear-gradient(135deg, #dc3545, #e74c3c); }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 0.9rem; }
                    th, td { padding: 8px; text-align: right; border-bottom: 1px solid #ddd; }
                    th { background: #007bff; color: white; font-weight: bold; }
                    tr:nth-child(even) { background: #f8f9fa; }
                    .section-title { color: #007bff; font-size: 1.3rem; margin: 30px 0 15px 0; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
                    .text-danger { color: #dc3545; }
                    .text-success { color: #28a745; }
                    .print-btn { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin: 20px 0; }
                    @media print { .print-btn { display: none; } }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>كشف حساب المورد</h1>
                        <h2>${data.supplier.name}</h2>
                        ${data.supplier.phone_number ? `<p>الهاتف: ${data.supplier.phone_number}</p>` : ''}
                        <p>الفترة: ${periodText}</p>
                        <p>تاريخ الإنشاء: ${formatDate(new Date())}</p>
                    </div>

                    <div class="info-grid">
                        <div class="info-card">
                            <div class="value text-danger">${formatCurrency(data.summary.totalDue)}</div>
                            <div class="label">إجمالي المستحق</div>
                        </div>
                        <div class="info-card">
                            <div class="value text-success">${formatCurrency(data.summary.totalPaid)}</div>
                            <div class="label">إجمالي المدفوع</div>
                        </div>
                        <div class="info-card ${data.summary.balance < 0 ? 'balance-card negative' : 'balance-card'}">
                            <div class="value">${formatCurrency(Math.abs(data.summary.balance))}</div>
                            <div class="label">${data.summary.balanceDescription}</div>
                        </div>
                        <div class="info-card">
                            <div class="value">${data.summary.deliveriesCount}</div>
                            <div class="label">عدد التسليمات</div>
                        </div>
                        <div class="info-card">
                            <div class="value">${data.summary.paymentsCount}</div>
                            <div class="label">عدد المدفوعات</div>
                        </div>
                    </div>

                    <h3 class="section-title">تفاصيل الحساب</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>التاريخ</th>
                                <th>البيان</th>
                                <th>رقم البون</th>
                                <th>الكمية</th>
                                <th>السعر</th>
                                <th>مدين</th>
                                <th>دائن</th>
                                <th>الرصيد</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${transactionsHTML}
                        </tbody>
                    </table>

                    <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 6px;">
                        <h4 style="margin: 0 0 10px 0; color: #007bff;">الرصيد النهائي</h4>
                        <p style="margin: 0; font-size: 1.2rem;">
                            <strong class="${balanceClass}">${formatCurrency(Math.abs(data.summary.balance))} - ${data.summary.balanceDescription}</strong>
                        </p>
                    </div>

                    <button class="print-btn" onclick="window.print()">طباعة كشف الحساب</button>
                </div>
            </body>
            </html>
        `;
    }
}

module.exports = new SupplierController();