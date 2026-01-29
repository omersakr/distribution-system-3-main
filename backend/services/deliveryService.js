const { Delivery, Client, Crusher, Contractor } = require('../models');

const toNumber = (v) => Number(v || 0);

class DeliveryService {
    static async getAllDeliveries() {
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

        return { deliveries: result };
    }

    static async getDeliveryById(id) {
        const delivery = await Delivery.findById(id)
            .populate('client_id', 'name')
            .populate('crusher_id', 'name')
            .populate('contractor_id', 'name');

        if (!delivery) {
            return null;
        }

        return {
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
        };
    }

    static async createDelivery(data) {
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
        } = data;

        if (!client_id || !material_price_at_time) {
            throw new Error('العميل وسعر المادة مطلوبان');
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

        return {
            id: delivery._id,
            message: 'تم إنشاء التسليم بنجاح'
        };
    }

    static async updateDelivery(id, data) {
        const {
            client_id,
            crusher_id,
            contractor_id,
            material,
            voucher,
            quantity,
            discount_volume,
            price_per_meter,
            // Do NOT allow updating material_price_at_time to preserve historical pricing
            driver_name,
            car_head,
            car_tail,
            car_volume,
            contractor_charge_per_meter
        } = data;

        // Get the existing delivery to preserve historical pricing
        const existingDelivery = await Delivery.findById(id);
        if (!existingDelivery) {
            return null;
        }

        const delivery = await Delivery.findByIdAndUpdate(
            id,
            {
                client_id,
                crusher_id: crusher_id || null,
                contractor_id: contractor_id || null,
                material,
                voucher,
                quantity: toNumber(quantity),
                discount_volume: toNumber(discount_volume),
                price_per_meter: toNumber(price_per_meter),
                // Preserve the original historical price
                material_price_at_time: existingDelivery.material_price_at_time,
                driver_name,
                car_head,
                car_tail,
                car_volume: toNumber(car_volume),
                contractor_charge_per_meter: toNumber(contractor_charge_per_meter)
            },
            { new: true }
        );

        if (!delivery) {
            return null;
        }

        return {
            id: delivery._id,
            message: 'تم تحديث التسليم بنجاح'
        };
    }

    static async deleteDelivery(id) {
        return await Delivery.findByIdAndDelete(id);
    }

    // Get deliveries with filtering and pagination
    static async getDeliveriesWithFilters(query = {}) {
        const {
            client_id,
            crusher_id,
            contractor_id,
            material,
            from_date,
            to_date,
            page = 1,
            limit = 50,
            sort = 'created_at',
            order = 'desc'
        } = query;

        let filter = {};

        if (client_id) filter.client_id = client_id;
        if (crusher_id) filter.crusher_id = crusher_id;
        if (contractor_id) filter.contractor_id = contractor_id;
        if (material) filter.material = { $regex: material, $options: 'i' };

        if (from_date || to_date) {
            filter.created_at = {};
            if (from_date) filter.created_at.$gte = new Date(from_date);
            if (to_date) {
                const toDate = new Date(to_date);
                toDate.setDate(toDate.getDate() + 1);
                filter.created_at.$lt = toDate;
            }
        }

        const sortOrder = order === 'desc' ? -1 : 1;
        const skip = (page - 1) * limit;

        const deliveries = await Delivery.find(filter)
            .populate('client_id', 'name')
            .populate('crusher_id', 'name')
            .populate('contractor_id', 'name')
            .sort({ [sort]: sortOrder })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Delivery.countDocuments(filter);

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

        return {
            deliveries: result,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }
}

module.exports = DeliveryService;