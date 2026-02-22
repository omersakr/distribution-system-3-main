const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        maxlength: 255
    },
    phone_number: {
        type: String,
        maxlength: 20
    },
    notes: {
        type: String
    },
    opening_balance: {
        type: Number,
        default: 0,
        get: v => Math.round(v * 100) / 100,
        set: v => Math.round(v * 100) / 100
    },
    materials: [{
        name: {
            type: String,
            required: true,
            maxlength: 255
        },
        price_per_unit: {
            type: Number,
            required: true,
            min: 0,
            get: v => Math.round(v * 100) / 100,
            set: v => Math.round(v * 100) / 100
        }
    }],
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Active'
    },
    deleted_at: {
        type: Date,
        default: null
    },
    is_deleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { getters: true },
    toObject: { getters: true }
});

// Indexes for efficient queries
supplierSchema.index({ name: 1 });
supplierSchema.index({ status: 1 });

// Soft delete will be handled in the service layer for now
// TODO: Fix pre-find hook for soft delete

module.exports = mongoose.model('Supplier', supplierSchema);