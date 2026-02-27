// Test script to verify opening balance calculation
const mongoose = require('mongoose');
require('dotenv').config();

const { Contractor, ContractorOpeningBalance } = require('./backend/models');

async function testOpeningBalance() {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/construction-management');
        console.log('✅ Connected to database');

        // Get all contractors
        const contractors = await Contractor.find().limit(3);
        console.log(`\n📋 Found ${contractors.length} contractors\n`);

        for (const contractor of contractors) {
            console.log(`\n=== Contractor: ${contractor.name} ===`);
            console.log(`ID: ${contractor._id}`);
            console.log(`Old opening_balance field: ${contractor.opening_balance}`);

            // Get project-based opening balances
            const openingBalances = await ContractorOpeningBalance.find({
                contractor_id: contractor._id,
                is_deleted: false
            }).populate('project_id', 'name');

            console.log(`\nProject-based opening balances (${openingBalances.length}):`);
            let total = 0;
            openingBalances.forEach(ob => {
                console.log(`  - Project: ${ob.project_id?.name || 'Unknown'}`);
                console.log(`    Amount: ${ob.amount}`);
                console.log(`    Description: ${ob.description || 'N/A'}`);
                total += Number(ob.amount || 0);
            });

            console.log(`\n💰 Total Opening Balance: ${total}`);
            console.log('─'.repeat(50));
        }

        await mongoose.connection.close();
        console.log('\n✅ Test completed');
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

testOpeningBalance();
