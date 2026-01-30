const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
    expense_date: {
        type: Date,
        required: true
    },
    description: {
        type: String,
        required: true,
        maxlength: 255
    },
    amount: {
        type: Number,
        required: true,
        get: v => Math.round(v * 100) / 100,
        set: v => Math.round(v * 100) / 100
    },
    notes: {
        type: String
    },
    project_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client', // Reference to Client as projects are mapped to clients
        required: false // Make it optional for backward compatibility
    },
    // Legacy fields for backward compatibility
    method: {
        type: String
    },
    details: {
        type: String
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
expenseSchema.index({ expense_date: 1 });
expenseSchema.index({ project_id: 1 });

module.exports = mongoose.model('Expense', expenseSchema);