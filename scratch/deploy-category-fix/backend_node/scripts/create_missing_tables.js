/**
 * Script to create missing product_attributes tables
 */

const { mysqlPool } = require('../src/config/db');

async function createMissingTables() {
    console.log('Creating missing tables...\n');
    
    try {
        // 1. Create product_attributes table
        await mysqlPool.query(`
            CREATE TABLE IF NOT EXISTS product_attributes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                product_id INT NOT NULL,
                name VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_product (product_id),
                CONSTRAINT fk_product_attributes_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✓ product_attributes table created');

        // 2. Create product_attribute_values table
        await mysqlPool.query(`
            CREATE TABLE IF NOT EXISTS product_attribute_values (
                id INT AUTO_INCREMENT PRIMARY KEY,
                attribute_id INT NOT NULL,
                value VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_attribute (attribute_id),
                CONSTRAINT fk_attribute_values_attribute FOREIGN KEY (attribute_id) REFERENCES product_attributes(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✓ product_attribute_values table created');

        console.log('\n✅ All missing tables created successfully!');
        
        // Verify tables exist
        const [tables] = await mysqlPool.query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME IN ('product_attributes', 'product_attribute_values')
        `);
        
        console.log('\nTables in database:');
        tables.forEach(t => console.log(`  - ${t.TABLE_NAME}`));
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating tables:', error.message);
        process.exit(1);
    }
}

createMissingTables();
