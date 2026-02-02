const mongoose = require('mongoose');

// Project schema - mirrors Client schema for business requirements
const projectSchema = new mongoose.Schema({
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
    },
    // Additional field to track the original client ID for synchronization
    client_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: false // Optional for projects created independently
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { getters: true },
    toObject: { getters: true }
});

// Indexes for efficient queries
projectSchema.index({ name: 1 });
projectSchema.index({ is_deleted: 1 });
projectSchema.index({ client_id: 1 });
projectSchema.index({ created_at: -1 });

module.exports = mongoose.model('Project', projectSchema);