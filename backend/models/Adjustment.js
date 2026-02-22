const mongoose = require('mongoose');

const adjustmentSchema = new mongoose.Schema({
    entity_type: {
        type: String,
        required: true,
        enum: ['client', 'crusher', 'contractor', 'employee', 'supplier'],
        maxlength: 20
    },
    entity_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'entityModel'
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
    reason: {
        type: String
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { getters: true },
    toObject: { getters: true }
});

// Virtual to determine the model to reference based on entity_type
adjustmentSchema.virtual('entityModel').get(function () {
    const modelMap = {
        'client': 'Client',
        'crusher': 'Crusher',
        'contractor': 'Contractor',
        'employee': 'Employee',
        'supplier': 'Supplier'
    };
    return modelMap[this.entity_type];
});

// Index for efficient queries
adjustmentSchema.index({ entity_type: 1, entity_id: 1 });

module.exports = mongoose.model('Adjustment', adjustmentSchema);