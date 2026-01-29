const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        maxlength: 255
    },
    phone: {
        type: String,
        maxlength: 100
    },
    opening_balance: {
        type: Number,
        default: 0,
        get: v => Math.round(v * 100) / 100,
        set: v => Math.round(v * 100) / 100
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

// Remove problematic virtual balance calculation
// Balance will be calculated in the service layer instead

// Soft delete will be handled in the service layer for now
// TODO: Fix pre-find hook for soft delete

module.exports = mongoose.model('Client', clientSchema);