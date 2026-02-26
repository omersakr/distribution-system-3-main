/**
 * Migration Script: Fix Missing material_price_at_time in Deliveries
 * 
 * This script finds all deliveries with missing or zero material_price_at_time
 * and populates it by looking up the material price from the crusher or supplier.
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Delivery = require('../models/Delivery');
const Crusher = require('../models/Crusher');
const Supplier = require('../models/Supplier');

async function fixDeliveryMaterialPrices() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/construction_management', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connected to MongoDB');

        // Find all deliveries with missing or zero material_price_at_time
        const deliveries = await Delivery.find({
            $or: [
                { material_price_at_time: { $exists: false } },
                { material_price_at_time: null },
                { material_price_at_time: 0 }
            ]
        });

        console.log(`\n📦 Found ${deliveries.length} deliveries with missing material prices\n`);

        if (deliveries.length === 0) {
            console.log('✅ No deliveries need fixing!');
            await mongoose.connection.close();
            return;
        }

        let fixed = 0;
        let failed = 0;
        const failures = [];

        for (const delivery of deliveries) {
            try {
                let materialPrice = null;

                // Try to get price from crusher
                if (delivery.crusher_id) {
                    const crusher = await Crusher.findById(delivery.crusher_id);
                    if (crusher) {
                        // Use the crusher's method to get price by material
                        materialPrice = crusher.getPriceByMaterial(delivery.material);
                    }
                }

                // Try to get price from supplier if not found in crusher
                if (!materialPrice && delivery.supplier_id) {
                    const supplier = await Supplier.findById(delivery.supplier_id);
                    if (supplier && supplier.materials && Array.isArray(supplier.materials)) {
                        const material = supplier.materials.find(m => m.name === delivery.material);
                        if (material && material.price_per_unit) {
                            materialPrice = material.price_per_unit;
                        }
                    }
                }

                if (materialPrice && materialPrice > 0) {
                    // Update the delivery
                    delivery.material_price_at_time = materialPrice;
                    await delivery.save();
                    
                    console.log(`✅ Fixed delivery ${delivery._id}:`);
                    console.log(`   Material: ${delivery.material}`);
                    console.log(`   Price: ${materialPrice}`);
                    console.log(`   Source: ${delivery.crusher_id ? 'Crusher' : 'Supplier'}`);
                    console.log('');
                    
                    fixed++;
                } else {
                    console.log(`⚠️  Could not find price for delivery ${delivery._id}:`);
                    console.log(`   Material: ${delivery.material}`);
                    console.log(`   Crusher ID: ${delivery.crusher_id || 'N/A'}`);
                    console.log(`   Supplier ID: ${delivery.supplier_id || 'N/A'}`);
                    console.log('');
                    
                    failures.push({
                        id: delivery._id,
                        material: delivery.material,
                        crusher_id: delivery.crusher_id,
                        supplier_id: delivery.supplier_id
                    });
                    failed++;
                }
            } catch (error) {
                console.error(`❌ Error processing delivery ${delivery._id}:`, error.message);
                failed++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 MIGRATION SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total deliveries processed: ${deliveries.length}`);
        console.log(`✅ Successfully fixed: ${fixed}`);
        console.log(`❌ Failed to fix: ${failed}`);
        console.log('='.repeat(60));

        if (failures.length > 0) {
            console.log('\n⚠️  DELIVERIES THAT NEED MANUAL FIXING:');
            console.log('These deliveries could not be fixed automatically.');
            console.log('Please update them manually with the correct material price.\n');
            failures.forEach(f => {
                console.log(`Delivery ID: ${f.id}`);
                console.log(`Material: ${f.material}`);
                console.log(`Crusher ID: ${f.crusher_id || 'N/A'}`);
                console.log(`Supplier ID: ${f.supplier_id || 'N/A'}`);
                console.log('---');
            });
        }

        await mongoose.connection.close();
        console.log('\n✅ Migration completed and database connection closed');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
}

// Run the migration
console.log('🚀 Starting migration: Fix Delivery Material Prices');
console.log('='.repeat(60));
fixDeliveryMaterialPrices();
