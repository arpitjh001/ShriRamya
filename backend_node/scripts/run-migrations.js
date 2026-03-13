/**
 * Script to run database migrations
 */

const { runMigrations } = require('../src/utils/dbMigration');

console.log('Running database migrations...\n');

runMigrations()
    .then(() => {
        console.log('\n✅ Migrations completed!');
        process.exit(0);
    })
    .catch((err) => {
        console.error('\n❌ Migration error:', err.message);
        process.exit(1);
    });
