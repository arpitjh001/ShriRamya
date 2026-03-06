/**
 * WooCommerce Product Creation Performance Benchmark
 *
 * Measures timing for:
 *  1. Global attribute resolution
 *  2. Parent variable product creation (no images)
 *  3. Variation batch creation (4 variations)
 *  4. Image attachment (deferred)
 *  5. Full pipeline total
 *
 * Usage:
 *   node scripts/benchmark-product-creation.js
 *
 * Requirements:
 *   - WooCommerce running and accessible
 *   - Global attributes pa_size/pa_color already set up
 *   - .env loaded with WOOCOMMERCE_URL, WOOCOMMERCE_CONSUMER_KEY, WOOCOMMERCE_CONSUMER_SECRET
 */

const { performance } = require('perf_hooks');

// Load config through the project's own config module
const config = require('../src/config/config');
const wcClient = require('../src/config/integrations/woocommerce');

// ─── Helpers ────────────────────────────────────────────────────────
function ms(start) {
    return (performance.now() - start).toFixed(1);
}

function slugify(v) {
    return String(v).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// ─── Benchmark ──────────────────────────────────────────────────────
async function runBenchmark() {
    const timings = {};
    let productId = null;

    try {
        console.log('╔══════════════════════════════════════════════════════╗');
        console.log('║  WooCommerce Product Creation Benchmark              ║');
        console.log('╚══════════════════════════════════════════════════════╝');
        console.log(`Target: ${config.woocommerce.url}`);
        console.log('');

        // ── Step 1: Resolve global attributes ────────────────────
        const t1 = performance.now();
        const attrsResp = await wcClient.get('/products/attributes', { params: { per_page: 100 } });
        const attrs = attrsResp.data;
        const sizeAttr = attrs.find(a => a.slug === 'pa_size' || a.name.toLowerCase() === 'size');
        const colorAttr = attrs.find(a => a.slug === 'pa_color' || a.name.toLowerCase() === 'color');

        if (!sizeAttr || !colorAttr) {
            throw new Error('Global attributes pa_size/pa_color not found. Run setup-wc-attributes.js first.');
        }

        const [sizeTermsResp, colorTermsResp] = await Promise.all([
            wcClient.get(`/products/attributes/${sizeAttr.id}/terms`, { params: { per_page: 100 } }),
            wcClient.get(`/products/attributes/${colorAttr.id}/terms`, { params: { per_page: 100 } }),
        ]);
        timings.attributeResolution = ms(t1);
        console.log(`✓ Attribute Resolution:  ${timings.attributeResolution}ms`);

        // ── Step 2: Create parent variable product (NO images) ─
        const uniqueSlug = `bench-${Date.now()}`;
        const parentPayload = {
            name: `Benchmark Product ${uniqueSlug}`,
            type: 'variable',
            status: 'draft', // draft to avoid polluting storefront
            sku: uniqueSlug,
            attributes: [
                { id: sizeAttr.id, variation: true, visible: true, options: ['S', 'M'] },
                { id: colorAttr.id, variation: true, visible: true, options: ['Red', 'Blue'] },
            ],
        };

        const t2 = performance.now();
        const parentResp = await wcClient.post('/products', parentPayload);
        productId = parentResp.data.id;
        timings.parentCreation = ms(t2);
        console.log(`✓ Parent Creation (ID ${productId}): ${timings.parentCreation}ms`);

        // ── Step 3: Batch create 4 variations ────────────────────
        const matrix = [
            { size: 'S', color: 'Red' },
            { size: 'S', color: 'Blue' },
            { size: 'M', color: 'Red' },
            { size: 'M', color: 'Blue' },
        ];

        const batchPayload = {
            create: matrix.map(({ size, color }) => ({
                regular_price: '999',
                manage_stock: true,
                stock_quantity: 10,
                sku: `${uniqueSlug}-${slugify(size)}-${slugify(color)}`,
                attributes: [
                    { id: sizeAttr.id, option: size },
                    { id: colorAttr.id, option: color },
                ],
            })),
        };

        const t3 = performance.now();
        const batchResp = await wcClient.post(`/products/${productId}/variations/batch`, batchPayload);
        timings.variationBatch = ms(t3);
        const createdCount = (batchResp.data.create || []).filter(v => v.id).length;
        console.log(`✓ Variation Batch (${createdCount}/4): ${timings.variationBatch}ms`);

        // ── Step 4: Image attachment (simulate with placeholder) ─
        const t4 = performance.now();
        await wcClient.put(`/products/${productId}`, {
            images: [
                { src: 'https://via.placeholder.com/600x800.png?text=Benchmark' },
            ],
        });
        timings.imageAttach = ms(t4);
        console.log(`✓ Image Attach (1 img):  ${timings.imageAttach}ms`);

        // ── Summary ──────────────────────────────────────────────
        const totalMs = (
            parseFloat(timings.attributeResolution) +
            parseFloat(timings.parentCreation) +
            parseFloat(timings.variationBatch) +
            parseFloat(timings.imageAttach)
        ).toFixed(1);

        console.log('');
        console.log('┌───────────────────────────────────────────────┐');
        console.log('│          PERFORMANCE BREAKDOWN                │');
        console.log('├──────────────────────┬────────────────────────┤');
        console.log(`│ Attribute Resolution │ ${timings.attributeResolution.padStart(18)}ms │`);
        console.log(`│ Parent Creation      │ ${timings.parentCreation.padStart(18)}ms │`);
        console.log(`│ Variation Batch (4)  │ ${timings.variationBatch.padStart(18)}ms │`);
        console.log(`│ Image Attach (1)     │ ${timings.imageAttach.padStart(18)}ms │`);
        console.log('├──────────────────────┼────────────────────────┤');
        console.log(`│ TOTAL PIPELINE       │ ${totalMs.padStart(18)}ms │`);
        console.log('└──────────────────────┴────────────────────────┘');

        // ── Bottleneck analysis ──────────────────────────────────
        console.log('');
        const steps = [
            { name: 'Attribute Resolution', time: parseFloat(timings.attributeResolution) },
            { name: 'Parent Creation', time: parseFloat(timings.parentCreation) },
            { name: 'Variation Batch', time: parseFloat(timings.variationBatch) },
            { name: 'Image Attach', time: parseFloat(timings.imageAttach) },
        ];
        const bottleneck = steps.reduce((a, b) => a.time > b.time ? a : b);
        console.log(`⚠ Bottleneck: ${bottleneck.name} (${bottleneck.time.toFixed(1)}ms — ${((bottleneck.time / parseFloat(totalMs)) * 100).toFixed(0)}% of total)`);

        if (parseFloat(timings.imageAttach) > parseFloat(timings.variationBatch)) {
            console.log('💡 TIP: Image processing is slower than variation creation. Use defer_images=true.');
        }
        if (parseFloat(timings.variationBatch) > 3000) {
            console.log('💡 TIP: Variation batch > 3s. Check MySQL innodb_buffer_pool_size and Redis Object Cache.');
        }

    } catch (error) {
        console.error('❌ Benchmark failed:', error.response?.data || error.message);
    } finally {
        // ── Cleanup ──────────────────────────────────────────────
        if (productId) {
            try {
                await wcClient.delete(`/products/${productId}`, { params: { force: true } });
                console.log(`\n🧹 Cleanup: Deleted test product ${productId}`);
            } catch (e) {
                console.warn(`⚠ Cleanup failed for product ${productId}: ${e.message}`);
            }
        }
    }
}

runBenchmark();
