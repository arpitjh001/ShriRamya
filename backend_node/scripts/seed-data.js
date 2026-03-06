/**
 * Seed Script: Categories + Products (Simple + Variable) + Images
 *
 * Usage (run inside the backend container):
 *   node scripts/seed-data.js
 *
 * Prerequisites:
 *   - WooCommerce running and accessible
 *   - Global attributes pa_size/pa_color set up (run setup-wc-attributes.js first)
 */

const wcClient = require('../src/config/integrations/woocommerce');

// ─── Royalty-free placeholder images from picsum.photos ────────────
const IMG = {
    lehenga2: 'https://via.placeholder.com/600x800.png',
    dupatta1: 'https://via.placeholder.com/600x800.png',
    dupatta2: 'https://via.placeholder.com/600x800.png',
    gallery1: 'https://via.placeholder.com/600x800.png',
    gallery2: 'https://via.placeholder.com/600x800.png',
    gallery3: 'https://via.placeholder.com/600x800.png',
    kurti1: 'https://via.placeholder.com/600x800.png',
    kurti2: 'https://via.placeholder.com/600x800.png',
    saree1: 'https://via.placeholder.com/600x800.png',
    saree2: 'https://via.placeholder.com/600x800.png',
    lehenga1: 'https://via.placeholder.com/600x800.png',
};

// ─── Categories ────────────────────────────────────────────────────
const CATEGORIES = [
    { name: 'Sarees', slug: 'sarees', description: 'Traditional and designer sarees' },
    { name: 'Kurtis', slug: 'kurtis', description: 'Casual and festive kurtis' },
    { name: 'Lehengas', slug: 'lehengas', description: 'Bridal and party lehengas' },
    { name: 'Dupattas', slug: 'dupattas', description: 'Handcrafted dupattas' },
    { name: 'New Arrivals', slug: 'new-arrivals', description: 'Latest additions' },
    { name: 'Sale', slug: 'sale', description: 'Discounted items' },
];

// ─── Simple Products ───────────────────────────────────────────────
const SIMPLE_PRODUCTS = [
    {
        name: 'Silk Dupatta — Gold Border',
        type: 'simple',
        sku: 'dup-gold-001-v3',
        regular_price: '1299',
        sale_price: '999',
        description: 'Pure silk dupatta with hand-embroidered gold border. Lightweight and elegant.',
        manage_stock: true,
        stock_quantity: 50,
        status: 'publish',
        categorySlug: 'dupattas',
        images: [],
    },
    {
        name: 'Cotton Kurti — Summer Collection',
        type: 'simple',
        sku: 'kur-sum-001-v3',
        regular_price: '899',
        description: 'Breathable cotton kurti perfect for summer. Machine washable.',
        manage_stock: true,
        stock_quantity: 100,
        status: 'publish',
        categorySlug: 'kurtis',
        images: [],
    },
    {
        name: 'Chiffon Dupatta — Pastel Pink',
        type: 'simple',
        sku: 'dup-pink-001-v3',
        regular_price: '799',
        sale_price: '599',
        description: 'Light chiffon dupatta in pastel pink. Perfect for festive occasions.',
        manage_stock: true,
        stock_quantity: 75,
        status: 'publish',
        categorySlug: 'dupattas',
        images: [],
    },
];

// ─── Variable Products ─────────────────────────────────────────────
const VARIABLE_PRODUCTS = [
    {
        name: 'Banarasi Silk Saree — Royal Collection',
        sku: 'sre-bana-001-v3',
        regular_price: '5999',
        sale_price: '4999',
        description: 'Handwoven Banarasi silk saree with intricate zari work. Available in multiple sizes and colors.',
        status: 'publish',
        categorySlug: 'sarees',
        stockBase: 15,
        images: [],
    },
    {
        name: 'Designer Lehenga — Bridal Collection',
        sku: 'leh-bri-001-v3',
        regular_price: '12999',
        description: 'Heavy embroidered bridal lehenga with cancan lining. Premium georgette fabric.',
        status: 'publish',
        categorySlug: 'lehengas',
        stockBase: 8,
        images: [],
    },
    {
        name: 'Printed Kurti — Festive Range',
        sku: 'kur-fes-001-v3',
        regular_price: '1999',
        sale_price: '1499',
        description: 'Block-printed kurti with mirror work. Perfect for festive gatherings.',
        status: 'publish',
        categorySlug: 'kurtis',
        stockBase: 25,
        images: [],
    },
];

// ─── Helpers ───────────────────────────────────────────────────────
function slugify(v) {
    return String(v).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

async function findAttribute(slug) {
    const resp = await wcClient.get('/products/attributes', { params: { per_page: 100 } });
    return resp.data.find(a => a.slug === slug || a.slug === slug.replace('pa_', ''));
}

// ─── Main ──────────────────────────────────────────────────────────
async function seed() {
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║         ShriRamya — Data Seeding Script          ║');
    console.log('╚══════════════════════════════════════════════════╝');

    // ── Step 1: Create Categories ──
    console.log('\n📂 Creating categories...');
    const categoryMap = {};

    for (const cat of CATEGORIES) {
        try {
            // Check if already exists
            const existing = await wcClient.get('/products/categories', {
                params: { slug: cat.slug, per_page: 1 },
            });
            if (existing.data.length > 0) {
                categoryMap[cat.slug] = existing.data[0].id;
                console.log(`  ✓ ${cat.name} (ID: ${existing.data[0].id}) — already exists`);
                continue;
            }

            const resp = await wcClient.post('/products/categories', cat);
            categoryMap[cat.slug] = resp.data.id;
            console.log(`  ✓ ${cat.name} (ID: ${resp.data.id}) — created`);
        } catch (err) {
            // WC returns term_exists error if slug already exists
            if (err.response?.data?.code === 'term_exists') {
                const existId = err.response.data.data?.resource_id;
                categoryMap[cat.slug] = existId;
                console.log(`  ✓ ${cat.name} (ID: ${existId}) — already exists`);
            } else {
                console.error(`  ✗ ${cat.name}: ${err.response?.data?.message || err.message}`);
            }
        }
    }

    console.log('\nCategory Map:', JSON.stringify(categoryMap, null, 2));

    // ── Step 2: Resolve Attributes ──
    console.log('\n🏷️  Resolving attributes...');
    const sizeAttr = await findAttribute('pa_size');
    const colorAttr = await findAttribute('pa_color');

    if (!sizeAttr || !colorAttr) {
        console.error('✗ Global attributes pa_size/pa_color not found. Run setup-wc-attributes.js first.');
        process.exit(1);
    }
    console.log(`  Size Attribute ID: ${sizeAttr.id}`);
    console.log(`  Color Attribute ID: ${colorAttr.id}`);

    // ── Step 3: Create Simple Products ──
    console.log('\n📦 Creating simple products...');
    const simpleResults = [];

    for (const prod of SIMPLE_PRODUCTS) {
        try {
            const catId = categoryMap[prod.categorySlug];
            const payload = {
                name: prod.name,
                type: 'simple',
                sku: prod.sku,
                regular_price: prod.regular_price,
                sale_price: prod.sale_price || '',
                description: prod.description,
                manage_stock: prod.manage_stock,
                stock_quantity: prod.stock_quantity,
                status: prod.status,
                categories: catId ? [{ id: catId }] : [],
                images: prod.images,
            };

            const resp = await wcClient.post('/products', payload);
            simpleResults.push({ id: resp.data.id, name: prod.name, sku: prod.sku });
            console.log(`  ✓ ${prod.name} (ID: ${resp.data.id})`);
        } catch (err) {
            console.error(`  ✗ ${prod.name}: ${err.response?.data?.message || err.message}`);
        }
    }

    // ── Step 4: Create Variable Products + Variations ──
    console.log('\n🧵 Creating variable products with 9 variations each...');
    const SIZES = ['S', 'M', 'L'];
    const COLORS = ['Red', 'Blue', 'Green'];
    const variableResults = [];

    for (const prod of VARIABLE_PRODUCTS) {
        try {
            const catId = categoryMap[prod.categorySlug];
            const newArrivalId = categoryMap['new-arrivals'];

            // Parent product (no images first for speed)
            const parentPayload = {
                name: prod.name,
                type: 'variable',
                sku: prod.sku,
                description: prod.description,
                status: prod.status,
                categories: [catId && { id: catId }, newArrivalId && { id: newArrivalId }].filter(Boolean),
                attributes: [
                    { id: sizeAttr.id, variation: true, visible: true, options: SIZES },
                    { id: colorAttr.id, variation: true, visible: true, options: COLORS },
                ],
            };

            const parentResp = await wcClient.post('/products', parentPayload);
            const parentId = parentResp.data.id;
            const parentSlug = parentResp.data.slug;
            console.log(`  ✓ Parent: ${prod.name} (ID: ${parentId})`);

            // Variation batch
            const batchPayload = {
                create: [],
            };

            for (const size of SIZES) {
                for (const color of COLORS) {
                    batchPayload.create.push({
                        regular_price: prod.regular_price,
                        sale_price: prod.sale_price || '',
                        manage_stock: true,
                        stock_quantity: prod.stockBase,
                        sku: `${parentSlug}-${slugify(size)}-${slugify(color)}`,
                        attributes: [
                            { id: sizeAttr.id, option: size },
                            { id: colorAttr.id, option: color },
                        ],
                    });
                }
            }

            const batchResp = await wcClient.post(`/products/${parentId}/variations/batch`, batchPayload);
            const createdCount = (batchResp.data.create || []).filter(v => v.id).length;
            console.log(`    ✓ Variations: ${createdCount}/9 created`);

            // Attach images
            if (prod.images && prod.images.length > 0) {
                await wcClient.put(`/products/${parentId}`, { images: prod.images });
                console.log(`    ✓ Images: ${prod.images.length} attached`);
            }

            variableResults.push({
                id: parentId,
                name: prod.name,
                sku: prod.sku,
                variations: createdCount,
            });

        } catch (err) {
            console.error(`  ✗ ${prod.name}: ${err.response?.data?.message || err.message}`);
        }
    }

    // ── Summary ──
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║              SEEDING COMPLETE                    ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log(`\nCategories: ${Object.keys(categoryMap).length}`);
    console.log(`Simple Products: ${simpleResults.length}`);
    console.log(`Variable Products: ${variableResults.length}`);
    console.log(`Total Variations: ${variableResults.reduce((s, p) => s + p.variations, 0)}`);
    console.log('\nSimple Products:', JSON.stringify(simpleResults, null, 2));
    console.log('Variable Products:', JSON.stringify(variableResults, null, 2));
    console.log('Category Map:', JSON.stringify(categoryMap, null, 2));
}

seed()
    .then(() => {
        console.log('\n✅ Done.');
        process.exit(0);
    })
    .catch((err) => {
        console.error('\n❌ Seeding failed:', err.message);
        process.exit(1);
    });
