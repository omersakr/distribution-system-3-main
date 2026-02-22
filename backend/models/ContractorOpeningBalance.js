const mongoose = require('mongoose');

const contractorOpeningBalanceSchema = new mongoose.Schema({
    contractor_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contractor',
        required: true
    },
    project_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
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
contractorOpeningBalanceSchema.index({ contractor_id: 1, project_id: 1 });
contractorOpeningBalanceSchema.index({ is_deleted: 1 });

module.exports = mongoose.model('ContractorOpeningBalance', contractorOpeningBalanceSchema);
