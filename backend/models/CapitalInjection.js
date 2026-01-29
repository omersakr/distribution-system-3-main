const mongoose = require('mongoose');

const capitalInjectionSchema = new mongoose.Schema({
    administration_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Administration',
        required: true
    },
    project_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
        get: v => Math.round(v * 100) / 100,
        set: v => Math.round(v * 100) / 100
    },
    notes: {
        type: String
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { getters: true },
    toObject: { getters: true }
});

// Indexes for efficient queries
capitalInjectionSchema.index({ administration_id: 1 });
capitalInjectionSchema.index({ project_id: 1 });
capitalInjectionSchema.index({ date: -1 });

module.exports = mongoose.model('CapitalInjection', capitalInjectionSchema);