const axios = require('axios');
const { performance } = require('perf_hooks');
const config = require('../src/config/config');

// Using axios directly to avoid overhead of service wrappers for audit
const client = axios.create({
    baseURL: `${config.woocommerce.url.replace(/\/$/, '')}/wp-json/wc/v3`,
    params: {
        consumer_key: config.woocommerce.user,
        consumer_secret: config.woocommerce.password
    },
    timeout: 60000
});

async function runBenchmark() {
    console.log('🚀 Starting WooCommerce Performance Audit Benchmark...');

    const productSlug = `perf-test-${Date.now()}`;
    const parentData = {
        name: `Performance Test Product ${new Date().toISOString()}`,
        type: 'variable',
        sku: productSlug,
        description: 'Benchmarking the performance of variable product creation.',
        attributes: [
            {
                id: 1, // Assume 1 for placeholder, script will fetch actual IDs below
                variation: true,
                visible: true,
                options: ['S', 'M']
            },
            {
                id: 2,
                variation: true,
                visible: true,
                options: ['Red', 'Blue']
            }
        ]
    };

    try {
        // 0. Setup: Get actual attribute IDs to be realistic
        console.log('--- Phase 0: Pre-flight Check ---');
        const attrs = await client.get('/products/attributes');
        const sizeAttr = attrs.data.find(a => a.name.toLowerCase().includes('size'));
        const colorAttr = attrs.data.find(a => a.name.toLowerCase().includes('color'));

        if (!sizeAttr || !colorAttr) {
            throw new Error('Global attributes not found. Run setup script first.');
        }

        parentData.attributes[0].id = sizeAttr.id;
        parentData.attributes[1].id = colorAttr.id;

        // 1. Parent Product Creation
        console.log('\n--- Phase 1: Parent Variable Product Creation ---');
        const t1Start = performance.now();
        const parentResponse = await client.post('/products', parentData);
        const t1End = performance.now();
        const productId = parentResponse.data.id;
        console.log(`✅ Parent Created. ID: ${productId} | Time: ${(t1End - t1Start).toFixed(2)}ms`);

        // 2. Variation Batch Creation
        console.log('\n--- Phase 2: Variation Batch Creation (4 variations) ---');
        const batchData = {
            create: [
                { sku: `${productSlug}-s-red`, regular_price: "999", manage_stock: true, stock_quantity: 10, attributes: [{ id: sizeAttr.id, option: "S" }, { id: colorAttr.id, option: "Red" }] },
                { sku: `${productSlug}-s-blue`, regular_price: "999", manage_stock: true, stock_quantity: 10, attributes: [{ id: sizeAttr.id, option: "S" }, { id: colorAttr.id, option: "Blue" }] },
                { sku: `${productSlug}-m-red`, regular_price: "1099", manage_stock: true, stock_quantity: 10, attributes: [{ id: sizeAttr.id, option: "M" }, { id: colorAttr.id, option: "Red" }] },
                { sku: `${productSlug}-m-blue`, regular_price: "1099", manage_stock: true, stock_quantity: 10, attributes: [{ id: sizeAttr.id, option: "M" }, { id: colorAttr.id, option: "Blue" }] }
            ]
        };

        const t2Start = performance.now();
        await client.post(`/products/${productId}/variations/batch`, batchData);
        const t2End = performance.now();
        console.log(`✅ Variations Batch Created. | Time: ${(t2End - t2Start).toFixed(2)}ms`);

        // 3. Overall Report
        console.log('\n================================================');
        console.log('📊 PERFORMANCE AUDIT REPORT');
        console.log('================================================');
        console.log(`Parent Creation:        ${(t1End - t1Start).toFixed(2)}ms`);
        console.log(`Variation Generation:  ${(t2End - t2Start).toFixed(2)}ms`);
        console.log(`Total Pipeline Time:   ${(t2End - t1Start).toFixed(2)}ms`);
        console.log('================================================');

        // Cleanup (optional)
        await client.delete(`/products/${productId}`, { params: { force: true } });
        console.log('\n🧹 Cleanup complete.');

    } catch (err) {
        console.error('❌ Benchmark failed:', err.response?.data || err.message);
    }
}

runBenchmark();
