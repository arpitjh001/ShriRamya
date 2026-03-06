require('dotenv').config();
const { mysqlPool } = require('../src/config/db');
const categoryService = require('../src/services/category.service');
const productService = require('../src/services/product.service');

const defaultStructure = [
    {
        name: 'Women Wear',
        children: [
            'Sarees',
            'Silk Sarees',
            'Cotton Sarees',
            'Banarasi Sarees',
            'Party Wear Sarees',
            'Kurtis',
            'Lehengas'
        ]
    },
    {
        name: 'Home & Lifestyle',
        children: [
            'Bedsheets',
            'Pillow Covers',
            'Cushion Covers',
            'Table Runners'
        ]
    }
];

async function migrate() {
    try {
        console.log('Migrating Categories...');
        // Create Default Categories
        for (const parent of defaultStructure) {
            let parentCat = await categoryService.getCategoryBySlug(categoryService.generateSlug(parent.name));
            if (!parentCat) {
                parentCat = await categoryService.createCategory({ name: parent.name });
            }

            for (const childName of parent.children) {
                let childCat = await categoryService.getCategoryBySlug(categoryService.generateSlug(childName));
                if (!childCat) {
                    await categoryService.createCategory({ name: childName, parent_id: parentCat.id });
                }
            }
        }

        // Ensure Uncategorized exists
        let uncategorized = await categoryService.getCategoryBySlug('uncategorized');
        if (!uncategorized) {
            uncategorized = await categoryService.createCategory({ name: 'Uncategorized', slug: 'uncategorized' });
        }

        // Assign categories to existing products
        const [products] = await mysqlPool.query('SELECT p.id, p.category_id, pc.category_id as pc_cat_id FROM products p left join product_categories pc on pc.product_id = p.id');
        const existingProductsWithNoCat = products.filter(p => !p.pc_cat_id);

        console.log(`Found ${existingProductsWithNoCat.length} products with no category assignment.`);

        for (const product of existingProductsWithNoCat) {
            // if it had an old category_id, we map it, else Uncategorized
            if (product.category_id) {
                await mysqlPool.query('INSERT IGNORE INTO product_categories (product_id, category_id) VALUES (?, ?)', [product.id, product.category_id]);
            } else {
                await mysqlPool.query('INSERT IGNORE INTO product_categories (product_id, category_id) VALUES (?, ?)', [product.id, uncategorized.id]);
            }
        }

        console.log('Migration Completed.');
    } catch (err) {
        console.error('Migration failed', err);
    } finally {
        process.exit(0);
    }
}

migrate();
