const fs = require('fs');
const path = require('path');
const { mysqlPool } = require('../src/config/db');

const migrate = async () => {
    const fileName = process.argv[2] || '20260304_create_product_tables.sql';
    console.log(`Using migration file: ${fileName}`);
    const sqlPath = path.join(__dirname, 'migrations', fileName);
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split by semicolon and filter empty lines
    const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

    const connection = await mysqlPool.getConnection();
    try {
        console.log('Starting migration...');
        for (const statement of statements) {
            await connection.query(statement);
        }
        console.log('Migration completed successfully');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        connection.release();
        process.exit(0);
    }
};

migrate();
