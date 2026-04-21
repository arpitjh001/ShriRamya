/**
 * Migration Script: Add soft delete columns to categories
 * Run with: npm run migrate:categories
 */

// Load environment variables from scripts/.env first
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mysql = require('mysql2/promise');

async function runMigration() {
    let connection;
    
    try {
        // Create MySQL connection
        const pool = mysql.createPool({
            host: process.env.MYSQL_HOST || 'localhost',
            port: parseInt(process.env.MYSQL_PORT) || 3307,
            user: process.env.MYSQL_USER || 'root',
            password: process.env.MYSQL_PASSWORD || 'rootpassword',
            database: process.env.MYSQL_DATABASE || 'shriramya',
            waitForConnections: true,
            connectionLimit: 1,
            queueLimit: 0
        });

        connection = await pool.getConnection();
        console.log('✓ Connected to MySQL');

        // Check if columns already exist
        const [columns] = await connection.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_NAME = 'categories' 
            AND COLUMN_NAME IN ('deleted_at', 'is_deleted')
        `, [process.env.MYSQL_DATABASE || 'shriramya']);

        if (columns.length >= 2) {
            console.log('✓ Soft delete columns already exist');
        } else {
            // Add soft delete columns
            console.log('Adding soft delete columns to categories table...');
            
            await connection.query(`
                ALTER TABLE categories 
                ADD COLUMN IF NOT EXISTS deleted_at BIGINT DEFAULT NULL,
                ADD COLUMN IF NOT EXISTS is_deleted TINYINT(1) DEFAULT 0
            `);
            
            console.log('✓ Added deleted_at and is_deleted columns');

            // Add index for faster queries
            try {
                await connection.query(`
                    CREATE INDEX IF NOT EXISTS idx_categories_deleted 
                    ON categories(deleted_at, is_deleted)
                `);
                console.log('✓ Created index on deleted columns');
            } catch (indexErr) {
                console.log('⚠ Index creation skipped:', indexErr.message);
            }
        }

        // Verify the migration
        const [verify] = await connection.query(`
            SELECT deleted_at, is_deleted 
            FROM categories 
            LIMIT 1
        `);
        
        console.log('✓ Migration verified - columns are accessible');
        console.log('\n✅ Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.release();
            console.log('Database connection closed');
        }
        process.exit(0);
    }
}

// Run the migration
runMigration();
