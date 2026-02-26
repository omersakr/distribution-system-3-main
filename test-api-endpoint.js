// Quick test to see if the opening balance models work
const mongoose = require('mongoose');
require('dotenv').config();

async function testModels() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/construction-management');
        console.log('✅ Connected to database');

        const CrusherOpeningBalance = require('./backend/models/CrusherOpeningBalance');
        const ContractorOpeningBalance = require('./backend/models/ContractorOpeningBalance');
        const SupplierOpeningBalance = require('./backend/models/SupplierOpeningBalance');

        const projectId = '697e55bbd2ed7266c60323eb';

        console.log('\n🔨 Testing Crusher Opening Balances...');
        const crusherBalances = await CrusherOpeningBalance.find({
            project_id: projectId,
            is_deleted: false
        }).populate('crusher_id', 'name').lean();
        console.log(`Found ${crusherBalances.length} crusher opening balances`);
        console.log(JSON.stringify(crusherBalances, null, 2));

        console.log('\n👷 Testing Contractor Opening Balances...');
        const contractorBalances = await ContractorOpeningBalance.find({
            project_id: projectId,
            is_deleted: false
        }).populate('contractor_id', 'name').lean();
        console.log(`Found ${contractorBalances.length} contractor opening balances`);
        console.log(JSON.stringify(contractorBalances, null, 2));

        console.log('\n📦 Testing Supplier Opening Balances...');
        const supplierBalances = await SupplierOpeningBalance.find({
            project_id: projectId,
            is_deleted: false
        }).populate('supplier_id', 'name').lean();
        console.log(`Found ${supplierBalances.length} supplier opening balances`);
        console.log(JSON.stringify(supplierBalances, null, 2));

        await mongoose.connection.close();
        console.log('\n✅ Test completed successfully');
    } catch (error) {
        console.error('❌ Error:', error);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

testModels();
