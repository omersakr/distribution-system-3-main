const deliveryService = require('../services/deliveryService');

class DeliveriesController {
    // Get all deliveries
    async getAllDeliveries(req, res, next) {
        try {
            const result = await deliveryService.getAllDeliveries();
            res.json(result);
        } catch (err) {
            next(err);
        }
    }

    // Get deliveries with filters and pagination
    async getDeliveriesWithFilters(req, res, next) {
        try {
            const result = await deliveryService.getDeliveriesWithFilters(req.query);
            res.json(result);
        } catch (err) {
            next(err);
        }
    }

    // Get delivery by ID
    async getDeliveryById(req, res, next) {
        try {
            const delivery = await deliveryService.getDeliveryById(req.params.id);

            if (!delivery) {
                return res.status(404).json({ message: 'التسليم غير موجود' });
            }

            res.json(delivery);
        } catch (err) {
            next(err);
        }
    }

    // Create new delivery
    async createDelivery(req, res, next) {
        try {
            const result = await deliveryService.createDelivery(req.body);
            res.status(201).json(result);
        } catch (err) {
            if (err.code === 11000) {
                return res.status(400).json({ message: 'رقم الفاتورة موجود بالفعل' });
            }
            if (err.message === 'العميل وسعر المادة مطلوبان') {
                return res.status(400).json({ message: err.message });
            }
            next(err);
        }
    }

    // Update delivery
    async updateDelivery(req, res, next) {
        try {
            const result = await deliveryService.updateDelivery(req.params.id, req.body);

            if (!result) {
                return res.status(404).json({ message: 'التسليم غير موجود' });
            }

            res.json(result);
        } catch (err) {
            if (err.code === 11000) {
                return res.status(400).json({ message: 'رقم الفاتورة موجود بالفعل' });
            }
            next(err);
        }
    }

    // Delete delivery
    async deleteDelivery(req, res, next) {
        try {
            const delivery = await deliveryService.deleteDelivery(req.params.id);

            if (!delivery) {
                return res.status(404).json({ message: 'التسليم غير موجود' });
            }

            res.json({ message: 'تم حذف التسليم بنجاح' });
        } catch (err) {
            next(err);
        }
    }
}

module.exports = new DeliveriesController();