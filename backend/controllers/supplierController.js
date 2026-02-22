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
    // SUPPLIER ADJUSTMENTS
    // ============================================================================

    // Get supplier adjustments
    async getSupplierAdjustments(req, res, next) {
        try {
            const adjustments = await supplierService.getSupplierAdjustments(req.params.id);
            res.json({ adjustments });
        } catch (err) {
            next(err);
        }
    }

    // Add supplier adjustment
    async addSupplierAdjustment(req, res, next) {
        try {
            const { amount, reason, method, details } = req.body;

            // Validate required fields
            if (amount === undefined || amount === null || amount === '') {
                return res.status(400).json({ message: 'المبلغ مطلوب' });
            }

            if (!reason || reason.trim() === '') {
                return res.status(400).json({ message: 'السبب مطلوب' });
            }

            const adjustment = await supplierService.addSupplierAdjustment(req.params.id, {
                amount: parseFloat(amount),
                reason: reason?.trim() || '',
                method: method?.trim() || '',
                details: details?.trim() || ''
            });

            res.status(201).json(adjustment);
        } catch (err) {
            next(err);
        }
    }

    // Update supplier adjustment
    async updateSupplierAdjustment(req, res, next) {
        try {
            const { amount, reason, method, details } = req.body;

            const adjustment = await supplierService.updateSupplierAdjustment(
                req.params.id,
                req.params.adjustmentId,
                {
                    amount,
                    reason: reason?.trim() || '',
                    method: method?.trim() || '',
                    details: details?.trim() || ''
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

    // Delete supplier adjustment
    async deleteSupplierAdjustment(req, res, next) {
        try {
            const adjustment = await supplierService.deleteSupplierAdjustment(
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
            return Number(amount || 0).toLocaleString('ar-EG') + ' جنيه';
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

        // Build deliveries section
        let deliveriesHTML = '';
        if (data.deliveries && data.deliveries.length > 0) {
            deliveriesHTML = `
            <div class="section">
                <h3 class="section-title">📦 التوريدات</h3>
                <table>
                    <thead>
                        <tr>
                            <th>التاريخ</th>
                            <th>المادة</th>
                            <th>الكمية</th>
                            <th>السعر</th>
                            <th>الإجمالي</th>
                            <th>رقم البون</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.deliveries.map(d => `
                            <tr>
                                <td>${formatDate(d.date)}</td>
                                <td>${d.material || '-'}</td>
                                <td>${formatQuantity(d.quantity)} م³</td>
                                <td>${formatCurrency(d.price)}</td>
                                <td class="balance-negative"><strong>${formatCurrency(d.total)}</strong></td>
                                <td>${d.voucher || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>`;
        }

        // Build payments section
        let paymentsHTML = '';
        if (data.payments && data.payments.length > 0) {
            paymentsHTML = `
            <div class="section">
                <h3 class="section-title">💰 المدفوعات</h3>
                <table>
                    <thead>
                        <tr>
                            <th>التاريخ</th>
                            <th>المبلغ</th>
                            <th>طريقة الدفع</th>
                            <th>التفاصيل</th>
                            <th>ملاحظات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.payments.map(p => `
                            <tr>
                                <td>${formatDate(p.paid_at)}</td>
                                <td class="balance-positive"><strong>${formatCurrency(p.amount)}</strong></td>
                                <td>${p.method || '-'}</td>
                                <td>${p.details || '-'}</td>
                                <td>${p.note || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>`;
        }

        // Build adjustments section
        let adjustmentsHTML = '';
        if (data.adjustments && data.adjustments.length > 0) {
            adjustmentsHTML = `
            <div class="section">
                <h3 class="section-title">⚖️ التسويات والتعديلات</h3>
                <table>
                    <thead>
                        <tr>
                            <th>التاريخ</th>
                            <th>المبلغ</th>
                            <th>النوع</th>
                            <th>السبب</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.adjustments.map(a => {
                const amount = Number(a.amount || 0);
                const isPositive = amount > 0;
                return `
                                <tr>
                                    <td>${formatDate(a.created_at)}</td>
                                    <td class="${isPositive ? 'balance-negative' : 'balance-positive'}">
                                        <strong>${formatCurrency(Math.abs(amount))}</strong>
                                        <br><small style="font-size: 12px;">${isPositive ? '(مستحق للمورد)' : '(مستحق لنا)'}</small>
                                    </td>
                                    <td>${a.method || '-'}</td>
                                    <td>${a.reason || '-'}</td>
                                </tr>
                            `;
            }).join('')}
                    </tbody>
                </table>
            </div>`;
        }

        const balanceClass = data.summary.balance > 0 ? 'balance-negative' : data.summary.balance < 0 ? 'balance-positive' : '';

        return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>كشف حساب مورد - ${data.supplier.name}</title>
    <style>
        body { 
            font-family: 'Arial', sans-serif; 
            margin: 20px; 
            direction: rtl; 
            background: #f8f9fa;
            color: #333;
        }
        @media print {
            body { background: white; margin: 10px; }
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px; 
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .supplier-name { 
            font-size: 28px; 
            font-weight: bold; 
            color: #2c3e50;
            margin-bottom: 10px;
        }
        .report-title { 
            font-size: 22px; 
            color: #27ae60; 
            margin: 10px 0; 
        }
        .date-range { 
            font-size: 16px; 
            color: #7f8c8d;
            background: #ecf0f1;
            padding: 10px;
            border-radius: 5px;
            display: inline-block;
        }
        .summary { 
            background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
            color: white;
            padding: 25px; 
            border-radius: 10px; 
            margin: 20px 0;
            box-shadow: 0 4px 15px rgba(39, 174, 96, 0.3);
        }
        .summary h3 {
            margin: 0 0 20px 0;
            font-size: 20px;
            text-align: center;
        }
        .summary-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); 
            gap: 20px; 
        }
        .summary-item { 
            text-align: center;
            background: rgba(255,255,255,0.1);
            padding: 15px;
            border-radius: 8px;
        }
        .summary-value { 
            font-size: 20px; 
            font-weight: bold; 
            margin-bottom: 5px;
        }
        .summary-label { 
            font-size: 14px; 
            opacity: 0.9;
        }
        .balance-positive { color: #27ae60; }
        .balance-negative { color: #e74c3c; }
        .section { 
            background: white;
            margin: 20px 0;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .section-title { 
            font-size: 18px; 
            font-weight: bold; 
            padding: 20px;
            background: #34495e;
            color: white;
            margin: 0;
        }
        table { 
            width: 100%; 
            border-collapse: collapse;
        }
        th, td { 
            border: 1px solid #bdc3c7; 
            padding: 12px 8px; 
            text-align: center; 
        }
        th { 
            background-color: #ecf0f1; 
            font-weight: bold;
            color: #2c3e50;
        }
        tr:nth-child(even) {
            background-color: #f8f9fa;
        }
        tr:hover {
            background-color: #e8f4fd;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding: 20px;
            background: white;
            border-radius: 10px;
            color: #7f8c8d;
            font-size: 14px;
        }
        .no-data {
            text-align: center;
            padding: 30px;
            color: #7f8c8d;
            font-style: italic;
        }
        @media print { 
            body { background: white; }
            .section, .header, .summary { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="supplier-name">${data.supplier.name}</div>
        <div class="report-title">كشف حساب مورد شامل</div>
        <div class="date-range">${periodText}</div>
    </div>
    
    <div class="summary">
        <h3>ملخص الحساب الإجمالي</h3>
        <div class="summary-grid">
            <div class="summary-item">
                <div class="summary-value">${formatCurrency(data.summary.openingBalance || 0)}</div>
                <div class="summary-label">الرصيد الافتتاحي</div>
            </div>
            <div class="summary-item">
                <div class="summary-value balance-negative">${formatCurrency(data.summary.totalDue || 0)}</div>
                <div class="summary-label">إجمالي المستحق</div>
            </div>
            <div class="summary-item">
                <div class="summary-value balance-positive">${formatCurrency(data.summary.totalPaid || 0)}</div>
                <div class="summary-label">المدفوع للمورد</div>
            </div>
            <div class="summary-item">
                <div class="summary-value ${(data.summary.totalAdjustments || 0) > 0 ? 'balance-negative' : (data.summary.totalAdjustments || 0) < 0 ? 'balance-positive' : ''}">${formatCurrency(Math.abs(data.summary.totalAdjustments || 0))}</div>
                <div class="summary-label">التسويات ${(data.summary.totalAdjustments || 0) > 0 ? '(مستحق للمورد)' : (data.summary.totalAdjustments || 0) < 0 ? '(مستحق لنا)' : '(متوازنة)'}</div>
            </div>
            <div class="summary-item">
                <div class="summary-value ${balanceClass}">${formatCurrency(Math.abs(data.summary.balance || 0))}</div>
                <div class="summary-label">الرصيد الصافي ${(data.summary.balance || 0) > 0 ? '(مستحق للمورد)' : (data.summary.balance || 0) < 0 ? '(مستحق لنا)' : '(متوازن)'}</div>
            </div>
        </div>
    </div>
    
    ${deliveriesHTML || '<div class="no-data">لا توجد توريدات في هذه الفترة</div>'}
    
    ${paymentsHTML || '<div class="no-data">لا توجد مدفوعات في هذه الفترة</div>'}
    
    ${adjustmentsHTML}

    <div class="footer">
        تم إنشاء هذا التقرير في ${new Date().toLocaleString('ar-EG')}
    </div>
</body>
</html>
        `;
    }
}

module.exports = new SupplierController();