const mongoose = require('mongoose');

const crusherOpeningBalanceSchema = new mongoose.Schema({
    crusher_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Crusher',
        required: true
    },
    project_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: false  // Optional: only required for positive balances (we owe them)
    },
    amount: {
        type: Number,
        required: true,
        default: 0,
        get: v => Math.round(v * 100) / 100,
        set: v => Math.round(v * 100) / 100
    },
    description: {
        type: String,
        maxlength: 500
    },
    date: {
        type: Date,
        default: Date.now
    },
    is_deleted: {
        type: Boolean,
        default: false
    },
    deleted_at: {
        type: Date,
        default: null
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { getters: true },
    toObject: { getters: true }
});

// Index for faster queries
crusherOpeningBalanceSchema.index({ crusher_id: 1, project_id: 1 });
crusherOpeningBalanceSchema.index({ is_deleted: 1 });

module.exports = mongoose.model('CrusherOpeningBalance', crusherOpeningBalanceSchema);
