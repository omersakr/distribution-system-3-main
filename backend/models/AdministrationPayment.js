const mongoose = require('mongoose');

const administrationPaymentSchema = new mongoose.Schema({
    administration_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Administration',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
        get: v => Math.round(v * 100) / 100,
        set: v => Math.round(v * 100) / 100
    },
    method: {
        type: String,
        maxlength: 100
    },
    details: {
        type: String
    },
    note: {
        type: String
    },
    payment_image: {
        type: String // Base64 encoded image
    },
    paid_at: {
        type: Date,
        required: true,
        default: Date.now
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { getters: true },
    toObject: { getters: true }
});

// Indexes for efficient queries
administrationPaymentSchema.index({ administration_id: 1 });
administrationPaymentSchema.index({ paid_at: -1 });

module.exports = mongoose.model('AdministrationPayment', administrationPaymentSchema);