const mongoose = require('mongoose');

const contractorPaymentSchema = new mongoose.Schema({
    contractor_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contractor',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        get: v => Math.round(v * 100) / 100,
        set: v => Math.round(v * 100) / 100
    },
    method: {
        type: String,
        maxlength: 50
    },
    details: {
        type: String,
        maxlength: 255
    },
    note: {
        type: String
    },
    payment_image: {
        type: String // Base64 encoded image
    },
    paid_at: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { getters: true },
    toObject: { getters: true }
});

module.exports = mongoose.model('ContractorPayment', contractorPaymentSchema);