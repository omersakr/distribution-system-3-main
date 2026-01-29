const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        maxlength: 255
    },
    job_title: {
        type: String,
        maxlength: 255
    },
    phone_number: {
        type: String,
        maxlength: 20
    },
    basic_salary: {
        type: Number,
        required: true,
        default: 0,
        get: v => Math.round(v * 100) / 100,
        set: v => Math.round(v * 100) / 100,
        alias: 'base_salary' // Support old field name
    },
    start_working_date: {
        type: Date,
        default: Date.now
    },
    end_working_date: {
        type: Date
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Active'
    },
    notes: {
        type: String
    },
    all_projects: {
        type: Boolean,
        default: false
    },
    assigned_projects: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client'
    }]
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { getters: true },
    toObject: { getters: true }
});

// Indexes for efficient queries
employeeSchema.index({ name: 1 });
employeeSchema.index({ status: 1 });
employeeSchema.index({ start_working_date: 1 });

module.exports = mongoose.model('Employee', employeeSchema);