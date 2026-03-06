require('dotenv').config();
const mongoose = require('mongoose');
const wcClient = require('../src/config/integrations/woocommerce');
const productRepository = require('../src/repositories/product.repository');

async function sync() {
    try {
        await mongoose.connect(process.env.MONGO_URL + process.env.DB_NAME);
        console.log('Connected to MongoDB');

        let page = 1;
        while (true) {
            const res = await wcClient.get('/products', { params: { per_page: 100, page } });
            if (res.data.length === 0) break;
            for (const p of res.data) {
                await productRepository.sync(p);
                console.log(`Synced product ${p.name}`);
            }
            page++;
        }

        console.log('Done.');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

sync();
