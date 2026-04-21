const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.join(__dirname, '.env') });

const { Product, Order, User } = require('./src/models');
const productService = require('./src/services/product.service');
const mongoProductRepository = require('./src/repositories/product.mongo.repository');

async function runVerify() {
    console.log('Connecting to MongoDB...');
    const mongoUri = process.env.MONGO_URL + (process.env.DB_NAME || '');
    console.log('Using URI:', mongoUri);
    await mongoose.connect(mongoUri);
    console.log('Connected.');

    try {
        const tenantId = 1;
        const testSku = 'TEST-PROD-' + Date.now();
        
        // 1. Create a test product with variants
        console.log('--- Step 1: Create Product ---');
        const productData = {
            name: 'Verification Product',
            basePrice: 5000,
            salePrice: 4500,
            sku: testSku,
            status: 'publish',
            tenant_id: tenantId,
            variants: [
                {
                    sku: testSku + '-S',
                    price: 2000,
                    discountPrice: 1800,
                    stock: 10,
                    attributes: { size: 'S', color: 'Red' }
                },
                {
                    sku: testSku + '-M',
                    price: 2500,
                    discountPrice: 2200,
                    stock: 5,
                    attributes: { size: 'M', color: 'Blue' }
                }
            ]
        };

        const productId = await mongoProductRepository.createProduct(productData, tenantId);
        console.log('Product created:', productId);

        const product = await Product.findById(productId);
        const variantS = product.variants[0];
        const variantM = product.variants[1];

        // 2. Verify Stock Decrement Logic
        console.log('\n--- Step 2: Verify Stock Decrement Logic ---');
        
        console.log('Simulating stock decrement for variant S (Qty: 2)...');
        const successS = await productService.decrementStock(productId.toString(), variantS._id.toString(), 2);
        console.log('Success S:', successS);
        
        const updatedProduct = await Product.findById(productId);
        const updatedVariantS = updatedProduct.variants.id(variantS._id);
        console.log(`Variant S Stock after decrement: ${updatedVariantS.stock} (Expected: 8)`);
        
        if (updatedVariantS.stock !== 8) {
            throw new Error('Stock decrement failed for variant S');
        }

        console.log('Simulating stock decrement for variant M (Qty: 1)...');
        const successM = await productService.decrementStock(productId.toString(), variantM._id.toString(), 1);
        console.log('Success M:', successM);

        const finalProduct = await Product.findById(productId);
        const finalVariantM = finalProduct.variants.id(variantM._id);
        console.log(`Variant M Stock after decrement: ${finalVariantM.stock} (Expected: 4)`);

        if (finalVariantM.stock !== 4) {
            throw new Error('Stock decrement failed for variant M');
        }

        // Cleanup
        await Product.findByIdAndDelete(productId);
        console.log('Test product deleted.');

        console.log('\n--- Verification SUCCESS ---');

    } catch (error) {
        console.error('\n--- Verification FAILED ---');
        console.error(error);
    } finally {
        await mongoose.connection.close();
    }
}

runVerify();
