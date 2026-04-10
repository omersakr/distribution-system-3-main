/**
 * Migration: Fix Delivery Total Value Calculation
 * 
 * Problem: total_value was calculated using net_quantity instead of quantity
 * Solution: Recalculate total_value for all deliveries using quantity
 * 
 * Date: 2026-04-06
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function fixDeliveryTotalValueCalculation() {
    try {
        console.log('🔧 Starting migration: Fix Delivery Total Value Calculation');
        console.log('Connecting to MongoDB...');
        
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const Delivery = mongoose.model('Delivery', require('../models/Delivery').schema);

        // Get all deliveries
        const deliveries = await Delivery.find({});
        console.log(`📦 Found ${deliveries.length} deliveries to process`);

        let updatedCount = 0;
        let errorCount = 0;

        for (const delivery of deliveries) {
            try {
                const oldTotalValue = delivery.total_value;
                
                // Recalculate total_value using quantity instead of net_quantity
                const newTotalValue = (delivery.quantity || 0) * (delivery.price_per_meter || 0);
                
                if (Math.abs(oldTotalValue - newTotalValue) > 0.01) {
                    // Update the delivery
                    await Delivery.updateOne(
                        { _id: delivery._id },
                        { 
                            $set: { 
                                total_value: Math.round(newTotalValue * 100) / 100
                            } 
                        }
                    );
                    
                    updatedCount++;
                    console.log(`  ✓ Updated delivery ${delivery._id}:`);
                    console.log(`    - Old total: ${oldTotalValue.toFixed(2)}`);
                    console.log(`    - New total: ${newTotalValue.toFixed(2)}`);
                    console.log(`    - Quantity: ${delivery.quantity}`);
                    console.log(`    - Price: ${delivery.price_per_meter}`);
                }
            } catch (error) {
                errorCount++;
                console.error(`  ✗ Error processing delivery ${delivery._id}:`, error.message);
            }
        }

        console.log('\n📊 Migration Summary:');
        console.log(`  - Total deliveries: ${deliveries.length}`);
        console.log(`  - Updated: ${updatedCount}`);
        console.log(`  - Errors: ${errorCount}`);
        console.log(`  - Unchanged: ${deliveries.length - updatedCount - errorCount}`);

        await mongoose.connection.close();
        console.log('\n✅ Migration completed successfully');
        
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration if called directly
if (require.main === module) {
    fixDeliveryTotalValueCalculation();
}

module.exports = fixDeliveryTotalValueCalculation;
