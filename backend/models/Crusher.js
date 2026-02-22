const mongoose = require('mongoose');

const crusherSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        maxlength: 255
    },
    opening_balance: {
        type: Number,
        default: 0,
        get: v => Math.round(v * 100) / 100,
        set: v => Math.round(v * 100) / 100
    },
    sand_price: {
        type: Number,
        default: 0,
        get: v => Math.round(v * 100) / 100,
        set: v => Math.round(v * 100) / 100
    },
    aggregate1_price: {
        type: Number,
        default: 0,
        get: v => Math.round(v * 100) / 100,
        set: v => Math.round(v * 100) / 100
    },
    aggregate2_price: {
        type: Number,
        default: 0,
        get: v => Math.round(v * 100) / 100,
        set: v => Math.round(v * 100) / 100
    },
    aggregate3_price: {
        type: Number,
        default: 0,
        get: v => Math.round(v * 100) / 100,
        set: v => Math.round(v * 100) / 100
    },
    aggregate6_powder_price: {
        type: Number,
        default: 0,
        get: v => Math.round(v * 100) / 100,
        set: v => Math.round(v * 100) / 100
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { getters: true },
    toObject: { getters: true }
});

// Method to get price by material type
crusherSchema.methods.getPriceByMaterial = function (material) {
    const materialMap = {
        'رمل': 'sand_price',
        'سن 1': 'aggregate1_price',
        'سن 2': 'aggregate2_price',
        'سن 3': 'aggregate3_price',
        'سن 6 بودرة': 'aggregate6_powder_price'
    };

    return this[materialMap[material]] || 0;
};

module.exports = mongoose.model('Crusher', crusherSchema);