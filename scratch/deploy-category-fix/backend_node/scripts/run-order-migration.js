#!/usr/bin/env node
/**
 * Order Processing Engine Migration Runner
 * Usage: node scripts/run-order-migration.js
 */

const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const dbConfig = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: process.env.MYSQL_PORT || 3306,
    user: process.env.MYSQL_USER || 'wpuser',
    password: process.env.MYSQL_PASSWORD || 'wppassword',
    database: process.env.MYSQL_DATABASE || 'shriramya'
};

async function runMigration() {
    let connection;
    
    try {
        console.log('🔄 Connecting to MySQL database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to MySQL');

        // Read migration file
        const migrationPath = path.join(__dirname, '20260306_create_order_processing_engine.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('📄 Running Order Processing Engine migration...');
        
        // Split SQL into individual statements (handle multiple statements)
        const statements = migrationSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        let executed = 0;
        for (const statement of statements) {
            if (statement.trim()) {
                try {
                    await connection.query(statement);
                    executed++;
                } catch (err) {
                    // Ignore errors for INSERT ... ON DUPLICATE KEY
                    if (!err.code === 'ER_DUP_ENTRY') {
                        console.warn(`⚠️  Warning in statement: ${err.message}`);
                    }
                }
            }
        }

        console.log(`✅ Migration completed successfully! (${executed} statements executed)`);
        
        // Verify tables were created
        const [tables] = await connection.query(`
            SHOW TABLES LIKE 'order%'
        `);
        
        console.log('\n📊 Created tables:');
        tables.forEach(table => {
            const tableName = Object.values(table)[0];
            console.log(`   - ${tableName}`);
        });

        const [shipmentTables] = await connection.query(`
            SHOW TABLES LIKE 'shipment%'
        `);
        
        shipmentTables.forEach(table => {
            const tableName = Object.values(table)[0];
            console.log(`   - ${tableName}`);
        });

        const [refundTables] = await connection.query(`
            SHOW TABLES LIKE 'refund%'
        `);
        
        refundTables.forEach(table => {
            const tableName = Object.values(table)[0];
            console.log(`   - ${tableName}`);
        });

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n👋 Database connection closed');
        }
    }
}

// Run migration
runMigration();
