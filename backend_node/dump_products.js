const { mysqlPool } = require('./src/config/db');

async function dumpProducts() {
    try {
        const [products] = await mysqlPool.query('SELECT id, name, images, sku FROM products WHERE id IN (21, 22)');
        console.log('--- PRODUCTS ---');
        console.log(JSON.stringify(products, null, 2));

        const [variants] = await mysqlPool.query('SELECT id, product_id, sku, image, attributes_json FROM product_variants WHERE product_id IN (21, 22)');
        console.log('\n--- VARIANTS ---');
        console.log(JSON.stringify(variants, null, 2));

        process.exit(0);
    } catch (error) {
        console.error('Error dumping products:', error);
        process.exit(1);
    }
}

dumpProducts();
