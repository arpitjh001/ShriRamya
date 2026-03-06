require('dotenv').config();
const mongoose = require('mongoose');
const productService = require('../src/services/product.service');
const wcClient = require('../src/config/integrations/woocommerce');

async function seedReal() {
    try {
        await mongoose.connect(process.env.MONGO_URL + process.env.DB_NAME);
        console.log('Connected to MongoDB');

        // Verify categories
        const cats = await wcClient.get('/products/categories');
        const sareeCat = cats.data.find(c => c.slug === 'sarees');

        if (!sareeCat) {
            console.error('Sarees category missing. Run seed-data.js first.');
            process.exit(1);
        }

        console.log('Creating Variable Product With Real Image...');
        const vProd = await productService.createProduct({
            name: 'Pikachu Embroidered Saree',
            sku: 'sre-pika-101',
            regular_price: '4999',
            description: 'Special edition saree with electric yellow accents.',
            categoryId: sareeCat.id,
            status: 'publish',
            images: [
                { src: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png' },
                { src: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png' }
            ],
            stockBase: 10
        });

        console.log(`✓ Variable product created: ${vProd.name} with ${vProd.variation_count} variations.`);

        const vProd2 = await productService.createProduct({
            name: 'Charmander Embroidered Saree',
            sku: 'sre-char-101',
            regular_price: '5999',
            description: 'Special edition saree with flame orange accents.',
            categoryId: sareeCat.id,
            status: 'publish',
            images: [
                { src: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png' },
                { src: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png' }
            ],
            stockBase: 5
        });
        console.log(`✓ Variable product created: ${vProd2.name} with ${vProd2.variation_count} variations.`);

        console.log('Creating Simple Product With Real Image...');
        const sProd = await wcClient.post('/products', {
            name: 'Charmander Orange Scarf',
            type: 'simple',
            sku: 'scarf-char-101',
            regular_price: '999',
            description: 'Warm orange scarf.',
            categories: [{ id: sareeCat.id }],
            status: 'publish',
            images: [
                { src: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png' }
            ]
        });

        await require('../src/repositories/product.repository').sync(sProd.data);
        console.log(`✓ Simple product created: ${sProd.data.name}`);

        const sProd2 = await wcClient.post('/products', {
            name: 'Pikachu Yellow Belt',
            type: 'simple',
            sku: 'belt-pika-101',
            regular_price: '599',
            description: 'Electric yellow belt.',
            categories: [{ id: sareeCat.id }],
            status: 'publish',
            images: [
                { src: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png' }
            ]
        });
        await require('../src/repositories/product.repository').sync(sProd2.data);
        console.log(`✓ Simple product created: ${sProd2.data.name}`);

        console.log('DONE.');
        process.exit(0);

    } catch (e) {
        console.error(e.response?.data || e.message);
        process.exit(1);
    }
}

seedReal();
