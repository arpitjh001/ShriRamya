/**
 * Phase 7: Category Product Mapping Seed Script
 * Maps existing products to appropriate categories and creates test data
 */

const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    port: 3307,
    user: 'wpuser',
    password: 'wppassword',
    database: 'shriramya',
};

async function seedCategoryProductMappings() {
    let connection;
    
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to MySQL');

        // Get all categories
        const [categories] = await connection.query('SELECT id, name, slug FROM categories');
        console.log(`\nFound ${categories.length} categories`);

        // Get all products
        const [products] = await connection.query('SELECT id, name, base_price FROM products WHERE status = "published"');
        console.log(`Found ${products.length} published products`);

        // Category to products mapping
        const categoryProductMap = {
            // Women Wear categories
            'sarees': [18, 19, 20, 21],  // All saree products
            'silk-sarees': [18, 19],
            'cotton-sarees': [20],
            'banarasi-sarees': [19],
            'party-wear-sarees': [18, 21],
            'kurtis': [21],
            'lehengas': [20],
            
            // Home & Lifestyle categories  
            'bedsheets': [],
            'pillow-covers': [],
            'cushion-covers': [],
            'table-runners': [],
            
            // General
            'uncategorized': [1, 2, 7, 9, 10, 11, 12, 13, 15],
            'most-desired': [18, 19, 20, 21],
        };

        // Get existing mappings
        const [existingMappings] = await connection.query('SELECT product_id, category_id FROM product_categories');
        const existingSet = new Set(existingMappings.map(m => `${m.product_id}-${m.category_id}`));

        console.log('\n--- Creating Category-Product Mappings ---\n');

        let addedCount = 0;
        let skippedCount = 0;

        for (const [categorySlug, productIds] of Object.entries(categoryProductMap)) {
            const category = categories.find(c => c.slug === categorySlug);
            
            if (!category) {
                console.log(`⚠️  Category "${categorySlug}" not found`);
                continue;
            }

            if (productIds.length === 0) {
                console.log(`ℹ️  Category "${categorySlug}" - No products assigned (empty collection)`);
                continue;
            }

            console.log(`\n📂 ${category.name} (${category.slug}):`);

            for (const productId of productIds) {
                const product = products.find(p => p.id === productId);
                
                if (!product) {
                    console.log(`   ⚠️  Product ID ${productId} not found`);
                    continue;
                }

                const mappingKey = `${productId}-${category.id}`;
                
                if (existingSet.has(mappingKey)) {
                    console.log(`   ⏭️  ${product.name} (already mapped)`);
                    skippedCount++;
                    continue;
                }

                try {
                    await connection.query(
                        'INSERT INTO product_categories (product_id, category_id) VALUES (?, ?)',
                        [productId, category.id]
                    );
                    console.log(`   ✅ ${product.name}`);
                    addedCount++;
                    existingSet.add(mappingKey);
                } catch (error) {
                    console.log(`   ❌ ${product.name} - ${error.message}`);
                }
            }
        }

        console.log('\n--- Summary ---');
        console.log(`✅ Added: ${addedCount} mappings`);
        console.log(`⏭️  Skipped: ${skippedCount} mappings (already existed)`);

        // Verify final state
        const [finalMappings] = await connection.query(`
            SELECT c.name as category, c.slug, COUNT(pc.product_id) as product_count
            FROM categories c
            LEFT JOIN product_categories pc ON c.id = pc.category_id
            GROUP BY c.id, c.name, c.slug
            ORDER BY product_count DESC
        `);

        console.log('\n--- Final Category Product Counts ---\n');
        console.log('Category                          | Products');
        console.log('----------------------------------|----------');
        for (const row of finalMappings) {
            const padding = ' '.repeat(Math.max(0, 33 - row.category.length));
            console.log(`${row.category}${padding} | ${row.product_count}`);
        }

        console.log('\n✅ Seed completed successfully!\n');

    } catch (error) {
        console.error('❌ Seed failed:', error.message);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run the seed
if (require.main === module) {
    seedCategoryProductMappings()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = seedCategoryProductMappings;
