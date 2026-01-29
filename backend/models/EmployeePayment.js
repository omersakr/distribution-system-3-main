const mongoose = require('mongoose');

const employeePaymentSchema = new mongoose.Schema({
    employee_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
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

// Indexes for efficient queries
employeePaymentSchema.index({ employee_id: 1 });
employeePaymentSchema.index({ paid_at: 1 });

module.exports = mongoose.model('EmployeePayment', employeePaymentSchema);