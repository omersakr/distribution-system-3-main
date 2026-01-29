const mongoose = require('mongoose');

const crusherPaymentSchema = new mongoose.Schema({
    crusher_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Crusher',
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
        type: String // Base64 encoded image data
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

module.exports = mongoose.model('CrusherPayment', crusherPaymentSchema);