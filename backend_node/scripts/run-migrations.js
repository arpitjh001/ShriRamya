#!/usr/bin/env node
/**
 * Database Migration Runner
 * Usage: npm run migrate
 */

const { runMigrations } = require('../src/utils/dbMigration');

console.log('🚀 Starting database migrations...\n');

runMigrations()
  .then(() => {
    console.log('\n✅ All migrations completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
