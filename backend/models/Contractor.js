const mongoose = require('mongoose');

const contractorSchema = new mongoose.Schema({
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
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { getters: true },
    toObject: { getters: true }
});

// Virtual for calculating current balance
contractorSchema.virtual('balance').get(async function () {
    const Delivery = mongoose.model('Delivery');
    const ContractorPayment = mongoose.model('ContractorPayment');
    const Adjustment = mongoose.model('Adjustment');

    const deliveries = await Delivery.find({ contractor_id: this._id });
    const payments = await ContractorPayment.find({ contractor_id: this._id });
    const adjustments = await Adjustment.find({ entity_type: 'contractor', entity_id: this._id });

    const totalCharges = deliveries.reduce((sum, d) => sum + (d.contractor_total_charge || 0), 0);
    const totalPayments = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalAdjustments = adjustments.reduce((sum, a) => sum + (a.amount || 0), 0);

    return this.opening_balance + totalCharges + totalAdjustments - totalPayments;
});

module.exports = mongoose.model('Contractor', contractorSchema);