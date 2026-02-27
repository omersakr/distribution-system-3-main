const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
    client_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true
    },
    crusher_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Crusher'
    },
    supplier_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier'
    },
    contractor_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contractor'
    },
    material: {
        type: String,
        maxlength: 120
    },
    voucher: {
        type: String,
        maxlength: 120,
        unique: true
    },
    quantity: {
        type: Number,
        default: 0,
        get: v => Math.round(v * 1000) / 1000,
        set: v => Math.round(v * 1000) / 1000
    },
    discount_volume: {
        type: Number,
        default: 0,
        get: v => Math.round(v * 1000) / 1000,
        set: v => Math.round(v * 1000) / 1000
    },
    net_quantity: {
        type: Number,
        default: 0,
        get: v => Math.round(v * 1000) / 1000,
        set: v => Math.round(v * 1000) / 1000
    },
    price_per_meter: {
        type: Number,
        default: 0,
        get: v => Math.round(v * 100) / 100,
        set: v => Math.round(v * 100) / 100
    },
    total_value: {
        type: Number,
        default: 0,
        get: v => Math.round(v * 100) / 100,
        set: v => Math.round(v * 100) / 100
    },
    material_price_at_time: {
        type: Number,
        required: [true, 'سعر المادة مطلوب'],
        min: [0.01, 'سعر المادة يجب أن يكون أكبر من صفر'],
        get: v => Math.round(v * 100) / 100,
        set: v => Math.round(v * 100) / 100
    },
    crusher_total_cost: {
        type: Number,
        default: 0,
        get: v => Math.round(v * 100) / 100,
        set: v => Math.round(v * 100) / 100
    },
    supplier_total_cost: {
        type: Number,
        default: 0,
        get: v => Math.round(v * 100) / 100,
        set: v => Math.round(v * 100) / 100
    },
    driver_name: {
        type: String,
        maxlength: 120
    },
    car_head: {
        type: String,
        maxlength: 60
    },
    car_tail: {
        type: String,
        maxlength: 60
    },
    car_volume: {
        type: Number,
        get: v => Math.round(v * 1000) / 1000,
        set: v => Math.round(v * 1000) / 1000
    },
    contractor_charge_per_meter: {
        type: Number,
        default: 0,
        get: v => Math.round(v * 100) / 100,
        set: v => Math.round(v * 100) / 100
    },
    contractor_total_charge: {
        type: Number,
        default: 0,
        get: v => Math.round(v * 100) / 100,
        set: v => Math.round(v * 100) / 100
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { getters: true },
    toObject: { getters: true }
});

// Pre-save middleware to calculate derived fields
deliverySchema.pre('save', function () {
    // Calculate net quantity
    this.net_quantity = (this.car_volume || 0) - (this.discount_volume || 0);

    // Calculate total value for client
    this.total_value = this.net_quantity * (this.price_per_meter || 0);

    // Calculate crusher total cost (if crusher delivery)
    if (this.crusher_id) {
        this.crusher_total_cost = this.net_quantity * (this.material_price_at_time || 0);
        this.supplier_total_cost = 0;
    }
    
    // Calculate supplier total cost (if supplier delivery)
    if (this.supplier_id) {
        this.supplier_total_cost = this.net_quantity * (this.material_price_at_time || 0);
        this.crusher_total_cost = 0;
    }

    // Calculate contractor total charge
    this.contractor_total_charge = this.net_quantity * (this.contractor_charge_per_meter || 0);
});

module.exports = mongoose.model('Delivery', deliverySchema);