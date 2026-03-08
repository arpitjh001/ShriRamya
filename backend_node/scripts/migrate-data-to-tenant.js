/**
 * Data Migration Script
 * Assigns all existing records to default tenant (tenant_id = 1)
 * 
 * Usage: npm run migrate:data
 */

const { mysqlPool } = require('../src/config/db');

async function migrateDataToDefaultTenant() {
    console.log('Starting data migration to default tenant...\n');

    try {
        // Ensure default tenant exists
        console.log('1. Ensuring default tenant exists...');
        const [tenants] = await mysqlPool.query('SELECT id FROM tenants WHERE id = 1');
        
        if (tenants.length === 0) {
            await mysqlPool.query(
                "INSERT INTO tenants (id, name, domain, status) VALUES (1, 'Default Store', 'default', 'active')"
            );
            console.log('   ✓ Created default tenant');
        } else {
            console.log('   ✓ Default tenant exists');
        }

        // Ensure RBAC roles exist
        console.log('\n2. Ensuring RBAC roles exist...');
        const [roles] = await mysqlPool.query('SELECT id, name FROM roles');
        
        if (roles.length === 0) {
            console.log('   Running RBAC migration...');
            const fs = require('fs');
            const path = require('path');
            const migrationPath = path.join(__dirname, '../../migrations/20260307_create_multi_tenant_rbac.sql');
            
            if (fs.existsSync(migrationPath)) {
                const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
                // Split by semicolons and execute each statement
                const statements = migrationSQL.split(';').filter(s => s.trim().length > 0);
                
                for (const statement of statements) {
                    if (statement.trim().length > 0 && !statement.trim().startsWith('--')) {
                        try {
                            await mysqlPool.query(statement);
                        } catch (err) {
                            // Ignore errors for existing tables/records
                        }
                    }
                }
                console.log('   ✓ RBAC migration completed');
            }
        } else {
            console.log(`   ✓ Found ${roles.length} roles`);
        }

        // Migrate products
        console.log('\n3. Migrating products to default tenant...');
        const [productsResult] = await mysqlPool.query(
            'UPDATE products SET tenant_id = 1 WHERE tenant_id IS NULL OR tenant_id = 0'
        );
        console.log(`   ✓ Updated ${productsResult.affectedRows} products`);

        // Migrate product_variants
        console.log('\n4. Migrating product variants to default tenant...');
        const [variantsResult] = await mysqlPool.query(
            'UPDATE product_variants SET tenant_id = 1 WHERE tenant_id IS NULL OR tenant_id = 0'
        );
        console.log(`   ✓ Updated ${variantsResult.affectedRows} variants`);

        // Migrate variant_inventory
        console.log('\n5. Migrating variant inventory to default tenant...');
        const [inventoryResult] = await mysqlPool.query(
            'UPDATE variant_inventory SET tenant_id = 1 WHERE tenant_id IS NULL OR tenant_id = 0'
        );
        console.log(`   ✓ Updated ${inventoryResult.affectedRows} inventory records`);

        // Migrate categories
        console.log('\n6. Migrating categories to default tenant...');
        const [categoriesResult] = await mysqlPool.query(
            'UPDATE categories SET tenant_id = 1 WHERE tenant_id IS NULL OR tenant_id = 0'
        );
        console.log(`   ✓ Updated ${categoriesResult.affectedRows} categories`);

        // Migrate orders
        console.log('\n7. Migrating orders to default tenant...');
        const [ordersResult] = await mysqlPool.query(
            'UPDATE orders SET tenant_id = 1 WHERE tenant_id IS NULL OR tenant_id = 0'
        );
        console.log(`   ✓ Updated ${ordersResult.affectedRows} orders`);

        // Migrate order_items
        console.log('\n8. Migrating order items to default tenant...');
        const [orderItemsResult] = await mysqlPool.query(
            'UPDATE order_items SET tenant_id = 1 WHERE tenant_id IS NULL OR tenant_id = 0'
        );
        console.log(`   ✓ Updated ${orderItemsResult.affectedRows} order items`);

        // Migrate carts
        console.log('\n9. Migrating carts to default tenant...');
        const [cartsResult] = await mysqlPool.query(
            'UPDATE carts SET tenant_id = 1 WHERE tenant_id IS NULL OR tenant_id = 0'
        );
        console.log(`   ✓ Updated ${cartsResult.affectedRows} carts`);

        // Migrate reviews
        console.log('\n10. Migrating reviews to default tenant...');
        const [reviewsResult] = await mysqlPool.query(
            'UPDATE reviews SET tenant_id = 1 WHERE tenant_id IS NULL OR tenant_id = 0'
        );
        console.log(`   ✓ Updated ${reviewsResult.affectedRows} reviews`);

        // Migrate coupons
        console.log('\n11. Migrating coupons to default tenant...');
        const [couponsResult] = await mysqlPool.query(
            'UPDATE coupons SET tenant_id = 1 WHERE tenant_id IS NULL OR tenant_id = 0'
        );
        console.log(`   ✓ Updated ${couponsResult.affectedRows} coupons`);

        // Sync tenant_id in variants and inventory from products
        console.log('\n12. Syncing tenant_id across related tables...');
        
        // Update variants tenant_id from products
        const [variantsSync] = await mysqlPool.query(`
            UPDATE product_variants pv
            INNER JOIN products p ON pv.product_id = p.id
            SET pv.tenant_id = p.tenant_id
            WHERE pv.tenant_id != p.tenant_id
        `);
        console.log(`   ✓ Synced ${variantsSync.affectedRows} variants from products`);

        // Update inventory tenant_id from variants
        const [inventorySync] = await mysqlPool.query(`
            UPDATE variant_inventory vi
            INNER JOIN product_variants pv ON vi.variant_id = pv.id
            SET vi.tenant_id = pv.tenant_id
            WHERE vi.tenant_id != pv.tenant_id
        `);
        console.log(`   ✓ Synced ${inventorySync.affectedRows} inventory records from variants`);

        // Update order_items tenant_id from orders
        const [orderItemsSync] = await mysqlPool.query(`
            UPDATE order_items oi
            INNER JOIN orders o ON oi.order_id = o.id
            SET oi.tenant_id = o.tenant_id
            WHERE oi.tenant_id != o.tenant_id
        `);
        console.log(`   ✓ Synced ${orderItemsSync.affectedRows} order items from orders`);

        // Update product_categories tenant_id from products
        const [productCategoriesSync] = await mysqlPool.query(`
            UPDATE product_categories pc
            INNER JOIN products p ON pc.product_id = p.id
            INNER JOIN categories c ON pc.category_id = c.id
            SET c.tenant_id = p.tenant_id
            WHERE c.tenant_id != p.tenant_id
        `);
        console.log(`   ✓ Synced ${productCategoriesSync.affectedRows} categories from products`);

        console.log('\n✅ Data migration completed successfully!\n');
        
        // Print summary
        console.log('Migration Summary:');
        console.log('==================');
        
        const counts = await mysqlPool.query(`
            SELECT 
                (SELECT COUNT(*) FROM products) as products,
                (SELECT COUNT(*) FROM product_variants) as variants,
                (SELECT COUNT(*) FROM variant_inventory) as inventory,
                (SELECT COUNT(*) FROM categories) as categories,
                (SELECT COUNT(*) FROM orders) as orders,
                (SELECT COUNT(*) FROM order_items) as order_items,
                (SELECT COUNT(*) FROM carts) as carts,
                (SELECT COUNT(*) FROM reviews) as reviews,
                (SELECT COUNT(*) FROM coupons) as coupons,
                (SELECT COUNT(*) FROM tenants) as tenants,
                (SELECT COUNT(*) FROM roles) as roles,
                (SELECT COUNT(*) FROM permissions) as permissions
        `);
        
        const stats = counts[0][0];
        console.log(`- Products: ${stats.products}`);
        console.log(`- Variants: ${stats.variants}`);
        console.log(`- Inventory: ${stats.inventory}`);
        console.log(`- Categories: ${stats.categories}`);
        console.log(`- Orders: ${stats.orders}`);
        console.log(`- Order Items: ${stats.order_items}`);
        console.log(`- Carts: ${stats.carts}`);
        console.log(`- Reviews: ${stats.reviews}`);
        console.log(`- Coupons: ${stats.coupons}`);
        console.log(`- Tenants: ${stats.tenants}`);
        console.log(`- Roles: ${stats.roles}`);
        console.log(`- Permissions: ${stats.permissions}`);
        
    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error(error.stack);
        throw error;
    } finally {
        process.exit(0);
    }
}

// Run migration
console.log('=================================');
console.log('Multi-Tenant Data Migration');
console.log('=================================\n');
migrateDataToDefaultTenant();
