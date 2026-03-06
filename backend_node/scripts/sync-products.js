const mongoose = require('mongoose');
const wcClient = require('../config/integrations/woocommerce');
const productRepository = require('../repositories/product.repository');
const config = require('../config/config');

async function syncAllProducts() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(config.mongoose.url);
        console.log('Connected.');

        let page = 1;
        let totalSynced = 0;
        let hasMore = true;

        while (hasMore) {
            console.log(`Fetching page ${page} from WooCommerce...`);
            const response = await wcClient.get('/products', {
                params: { per_page: 50, page }
            });

            const products = response.data;
            if (products.length === 0) {
                hasMore = false;
                break;
            }

            console.log(`Syncing ${products.length} products to MongoDB...`);
            for (const product of products) {
                await productRepository.sync(product);
                totalSynced++;
            }

            console.log(`Page ${page} complete. Total synced: ${totalSynced}`);
            page++;
        }

        console.log('Full sync completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Sync failed:', error.message);
        process.exit(1);
    }
}

syncAllProducts();

