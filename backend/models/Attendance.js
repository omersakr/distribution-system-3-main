const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    employee_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    period_start: {
        type: Date,
        required: true
    },
    period_end: {
        type: Date,
        required: true
    },
    // Total days in the period (calculated automatically)
    period_days: {
        type: Number,
        required: true,
        min: 1
    },
    // Either record attendance OR absence, not both
    attendance_days: {
        type: Number,
        min: 0,
        default: null
    },
    absence_days: {
        type: Number,
        min: 0,
        default: null
    },
    // Calculated field: actual worked days
    worked_days: {
        type: Number,
        required: true,
        min: 0
    },
    // Attendance type: 'attendance' or 'absence'
    record_type: {
        type: String,
        enum: ['attendance', 'absence'],
        required: true
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
attendanceSchema.index({ employee_id: 1 });
attendanceSchema.index({ period_start: 1, period_end: 1 });

// Compound index for unique periods per employee
attendanceSchema.index({ employee_id: 1, period_start: 1, period_end: 1 }, { unique: true });

// Virtual fields for backward compatibility
attendanceSchema.virtual('working_days').get(function() {
    return this.worked_days;
});

module.exports = mongoose.model('Attendance', attendanceSchema);