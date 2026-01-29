const mongoose = require('mongoose');

const administrationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        maxlength: 255
    },
    type: {
        type: String,
        enum: ['Partner', 'Funder'],
        required: true
    },
    phone_number: {
        type: String,
        maxlength: 20
    },
    notes: {
        type: String
    },
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
administrationSchema.index({ name: 1 });
administrationSchema.index({ type: 1 });
administrationSchema.index({ status: 1 });

// Soft delete will be handled in the service layer for now
// TODO: Fix pre-find hook for soft delete

module.exports = mongoose.model('Administration', administrationSchema);