/**
 * Run All Migrations
 * 
 * This script runs all migration scripts in sequence.
 */

const { execSync } = require('child_process');
const path = require('path');

const migrations = [
    'fix-delivery-material-prices.js',
    'fix-expense-categories.js',
    'fix-delivery-total-value-calculation.js'
];

console.log('🚀 Running all migrations...\n');
console.log('='.repeat(60));

migrations.forEach((migration, index) => {
    console.log(`\n[${index + 1}/${migrations.length}] Running: ${migration}`);
    console.log('='.repeat(60));
    
    try {
        const migrationPath = path.join(__dirname, migration);
        execSync(`node "${migrationPath}"`, { stdio: 'inherit' });
        console.log(`\n✅ Completed: ${migration}`);
    } catch (error) {
        console.error(`\n❌ Failed: ${migration}`);
        console.error(error.message);
        process.exit(1);
    }
});

console.log('\n' + '='.repeat(60));
console.log('✅ All migrations completed successfully!');
console.log('='.repeat(60));
