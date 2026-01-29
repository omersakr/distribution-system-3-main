const { Client, Crusher, Contractor, Delivery, Expense, Payment, ContractorPayment, CrusherPayment } = require('../models');
const { formatCurrency } = require('./utils');

module.exports = {
    async dashboard(req, res, next) {
        try {
            // Use MongoDB models for consistent data
            const clientsCount = await Client.countDocuments();
            const crushersCount = await Crusher.countDocuments();
            const contractorsCount = await Contractor.countDocuments();
            const deliveriesCount = await Delivery.countDocuments();

            // Get all deliveries for proper calculations
            const deliveries = await Delivery.find();

            // CORRECT FINANCIAL LOGIC (matching API endpoint):

            // 1. Total Sales (Revenue from clients)
            const totalSales = deliveries.reduce((sum, d) => sum + Number(d.total_value || 0), 0);

            // 2. Total Crusher Costs (using historical prices)
            const totalCrusherCosts = deliveries.reduce((sum, d) => {
                const netQuantity = Number(d.car_volume || 0) - Number(d.discount_volume || 0);
                const materialPrice = Number(d.material_price_at_time || 0);
                return sum + (netQuantity * materialPrice);
            }, 0);

            // 3. Total Contractor Costs
            const totalContractorCosts = deliveries.reduce((sum, d) => sum + Number(d.contractor_total_charge || 0), 0);

            // 4. Operating expenses
            const expenseAgg = await Expense.aggregate([
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);
            const operatingExpenses = expenseAgg.length > 0 ? expenseAgg[0].total : 0;

            // 5. Total Expenses (all costs)
            const totalExpenses = totalCrusherCosts + totalContractorCosts + Number(operatingExpenses || 0);

            // 6. Net Profit (sales - all expenses) - CORRECT CALCULATION
            const netProfit = totalSales - totalExpenses;

            res.render('dashboard', {
                title: 'لوحة التحكم',
                activePage: 'dashboard',
                metrics: {
                    totalClients: Number(clientsCount || 0),
                    totalCrushers: Number(crushersCount || 0),
                    totalContractors: Number(contractorsCount || 0),
                    totalDeliveries: Number(deliveriesCount || 0),
                    totalSales: formatCurrency(totalSales),
                    netProfit: formatCurrency(netProfit),
                    totalExpenses: formatCurrency(totalExpenses),
                    operatingExpenses: formatCurrency(operatingExpenses)
                }
            });
        } catch (err) {
            next(err);
        }
    }
};
