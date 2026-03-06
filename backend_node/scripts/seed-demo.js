/**
 * DEMO SEED SCRIPT — Categories + Products with Images
 *
 * Creates parent categories:
 *   - Women Ethnic Wear (with subcategories: Sarees, Lehengas, Kurtis, Dupattas, Salwar Suits, Gowns)
 *   - Home & Lifestyle (with subcategories: Bedsheets, Pillow Covers, Cushion Covers, Dohar)
 *
 * Seeds 2-3 products per subcategory with real Unsplash images.
 *
 * Usage: node scripts/seed-demo.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const wcClient = require('../src/config/integrations/woocommerce');
const productRepository = require('../src/repositories/product.repository');

// ─── Unsplash images (royalty-free, direct links) ─────────────────
// Women Ethnic Wear images
const IMAGES = {
    saree1: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&h=800&fit=crop',
    saree2: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&h=800&fit=crop',
    saree3: 'https://images.unsplash.com/photo-1767955694884-d4bf352c23c2?w=600&h=800&fit=crop',
    lehenga1: 'https://images.unsplash.com/photo-1737514996816-a034a795febe?w=600&h=800&fit=crop',
    lehenga2: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&h=800&fit=crop',
    kurti1: 'https://images.unsplash.com/photo-1622129216080-32d0c0f5efd7?w=600&h=800&fit=crop',
    kurti2: 'https://images.unsplash.com/photo-1594938374182-a57061fbf53e?w=600&h=800&fit=crop',
    dupatta1: 'https://images.unsplash.com/photo-1732381917488-39f31539cd4f?w=600&h=800&fit=crop',
    dupatta2: 'https://images.unsplash.com/photo-1651132164857-b61aa4cf7472?w=600&h=800&fit=crop',
    suit1: 'https://images.unsplash.com/photo-1583391733981-8b530312a5cd?w=600&h=800&fit=crop',
    suit2: 'https://images.unsplash.com/photo-1570382667048-23b581258c6a?w=600&h=800&fit=crop',
    gown1: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&h=800&fit=crop',
    gown2: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600&h=800&fit=crop',
    // Home & Lifestyle images
    bed1: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&h=800&fit=crop',
    bed2: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600&h=800&fit=crop',
    pillow1: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=600&h=800&fit=crop',
    pillow2: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=600&h=800&fit=crop',
    cushion1: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=600&h=800&fit=crop',
    cushion2: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=800&fit=crop',
    dohar1: 'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=600&h=800&fit=crop',
    dohar2: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&h=800&fit=crop',
};

// ─── Category Hierarchy ──────────────────────────────────────────
const CATEGORY_TREE = [
    {
        parent: { name: 'Women Ethnic Wear', slug: 'women-ethnic-wear', description: 'Traditional and contemporary ethnic wear for women' },
        children: [
            { name: 'Sarees', slug: 'sarees', description: 'Traditional and designer sarees' },
            { name: 'Lehengas', slug: 'lehengas', description: 'Bridal and party lehengas' },
            { name: 'Kurtis', slug: 'kurtis', description: 'Casual and festive kurtis' },
            { name: 'Dupattas', slug: 'dupattas', description: 'Handcrafted dupattas' },
            { name: 'Salwar Suits', slug: 'salwar-suits', description: 'Elegant salwar suits and churidars' },
            { name: 'Gowns', slug: 'gowns', description: 'Designer gowns for special occasions' },
        ],
    },
    {
        parent: { name: 'Home & Lifestyle', slug: 'home-lifestyle', description: 'Transform your space with traditional craftsmanship' },
        children: [
            { name: 'Bedsheets', slug: 'bedsheets', description: 'Premium cotton and silk bedsheets' },
            { name: 'Pillow Covers', slug: 'pillow-covers', description: 'Decorative pillow covers' },
            { name: 'Cushion Covers', slug: 'cushion-covers', description: 'Hand-embroidered cushion covers' },
            { name: 'Dohar', slug: 'dohar', description: 'Lightweight reversible dohars' },
        ],
    },
];

// ─── Products per subcategory ────────────────────────────────────
const PRODUCTS = {
    sarees: [
        { name: 'Banarasi Silk Saree — Crimson Gold', sku: 'demo-sre-001', regular_price: '5999', sale_price: '4999', description: 'Handwoven Banarasi silk saree with intricate zari work and gold border. A timeless piece for weddings and special occasions.', images: [IMAGES.saree1, IMAGES.saree2] },
        { name: 'Chanderi Cotton Saree — Ivory', sku: 'demo-sre-002', regular_price: '3499', description: 'Lightweight Chanderi cotton saree with subtle block print. Perfect for daytime events and office wear.', images: [IMAGES.saree3, IMAGES.saree1] },
        { name: 'Bandhani Saree — Rajasthani Heritage', sku: 'demo-sre-003', regular_price: '4299', sale_price: '3599', description: 'Traditional Rajasthani bandhani saree in vibrant colors. Hand-tied by artisans from Jodhpur.', images: [IMAGES.saree2, IMAGES.saree3] },
    ],
    lehengas: [
        { name: 'Bridal Lehenga — Royal Maroon', sku: 'demo-leh-001', regular_price: '15999', sale_price: '12999', description: 'Heavy embroidered bridal lehenga with cancan lining. Premium georgette fabric with zardozi work.', images: [IMAGES.lehenga1, IMAGES.lehenga2] },
        { name: 'Party Wear Lehenga — Teal Sequin', sku: 'demo-leh-002', regular_price: '8999', description: 'Contemporary party wear lehenga with sequin embellishments. Light and comfortable for all-night celebrations.', images: [IMAGES.lehenga2, IMAGES.lehenga1] },
    ],
    kurtis: [
        { name: 'Cotton Kurti — Summer Bloom', sku: 'demo-kur-001', regular_price: '1299', sale_price: '999', description: 'Breathable cotton kurti with floral block print. Machine washable and perfect for everyday wear.', images: [IMAGES.kurti1, IMAGES.kurti2] },
        { name: 'Silk Kurti — Festive Gold', sku: 'demo-kur-002', regular_price: '2499', description: 'Art silk kurti with mirror work detailing. Perfect for festive gatherings and puja ceremonies.', images: [IMAGES.kurti2, IMAGES.kurti1] },
        { name: 'Anarkali Kurti — Midnight Blue', sku: 'demo-kur-003', regular_price: '1899', sale_price: '1499', description: 'Flared anarkali style kurti in midnight blue with gota patti border. Elegant and flattering silhouette.', images: [IMAGES.kurti1] },
    ],
    dupattas: [
        { name: 'Silk Dupatta — Gold Border', sku: 'demo-dup-001', regular_price: '1299', sale_price: '999', description: 'Pure silk dupatta with hand-embroidered gold border. Lightweight and elegant for any occasion.', images: [IMAGES.dupatta1, IMAGES.dupatta2] },
        { name: 'Bandhej Dupatta — Multicolor', sku: 'demo-dup-002', regular_price: '899', description: 'Vibrant bandhej dupatta in multicolor tie-dye pattern. Handmade by Rajasthani artisans.', images: [IMAGES.dupatta2, IMAGES.dupatta1] },
    ],
    'salwar-suits': [
        { name: 'Anarkali Suit — Emerald Green', sku: 'demo-suit-001', regular_price: '3999', sale_price: '2999', description: 'Floor-length anarkali salwar suit in emerald green with heavy dupatta. Perfect for festive occasions.', images: [IMAGES.suit1, IMAGES.suit2] },
        { name: 'Palazzo Suit — Rose Pink', sku: 'demo-suit-002', regular_price: '2799', description: 'Contemporary palazzo suit set in rose pink with chikankari embroidery. Comfortable yet stylish.', images: [IMAGES.suit2, IMAGES.suit1] },
    ],
    gowns: [
        { name: 'Designer Gown — Champagne Dream', sku: 'demo-gown-001', regular_price: '7999', sale_price: '5999', description: 'Flared designer gown in champagne with sequin work. Perfect for cocktail parties and receptions.', images: [IMAGES.gown1, IMAGES.gown2] },
        { name: 'Indo-Western Gown — Royal Purple', sku: 'demo-gown-002', regular_price: '6499', description: 'Indo-western fusion gown in royal purple with contemporary silhouette and traditional embroidery.', images: [IMAGES.gown2, IMAGES.gown1] },
    ],
    bedsheets: [
        { name: 'Jaipuri Cotton Bedsheet — Floral Print', sku: 'demo-bed-001', regular_price: '1499', sale_price: '1199', description: 'Hand block-printed Jaipuri cotton bedsheet (King size) with 2 pillow covers. 100% cotton, 300 TC.', images: [IMAGES.bed1, IMAGES.bed2] },
        { name: 'Rajasthani Silk Bedsheet — Royal Paisley', sku: 'demo-bed-002', regular_price: '2999', description: 'Premium silk-cotton blend bedsheet with traditional paisley motif. Luxurious feel and vibrant colors.', images: [IMAGES.bed2, IMAGES.bed1] },
    ],
    'pillow-covers': [
        { name: 'Embroidered Pillow Cover Set — Ivory Gold', sku: 'demo-pil-001', regular_price: '799', sale_price: '599', description: 'Set of 2 embroidered pillow covers in ivory with gold thread work. Premium cotton fabric.', images: [IMAGES.pillow1, IMAGES.pillow2] },
        { name: 'Block Print Pillow Cover Set — Indigo', sku: 'demo-pil-002', regular_price: '649', description: 'Set of 2 hand block-printed pillow covers in indigo blue. Dabu print technique from Rajasthan.', images: [IMAGES.pillow2, IMAGES.pillow1] },
    ],
    'cushion-covers': [
        { name: 'Mirror Work Cushion Cover — Multicolor', sku: 'demo-cush-001', regular_price: '599', sale_price: '449', description: 'Vibrant mirror work cushion cover with patchwork design. Handcrafted by Kutch artisans.', images: [IMAGES.cushion1, IMAGES.cushion2] },
        { name: 'Velvet Cushion Cover — Deep Maroon', sku: 'demo-cush-002', regular_price: '499', description: 'Plush velvet cushion cover with zari embroidery in deep maroon. Adds royal touch to your living space.', images: [IMAGES.cushion2, IMAGES.cushion1] },
    ],
    dohar: [
        { name: 'Jaipuri Dohar — Block Print Floral', sku: 'demo-doh-001', regular_price: '1799', sale_price: '1399', description: 'Lightweight reversible Jaipuri dohar with hand block-printed floral design. Triple-layered muslin cotton.', images: [IMAGES.dohar1, IMAGES.dohar2] },
        { name: 'Cotton Dohar — Geometric Pattern', sku: 'demo-doh-002', regular_price: '1599', description: 'Premium cotton dohar in contemporary geometric pattern. Perfect for summer nights and AC rooms.', images: [IMAGES.dohar2, IMAGES.dohar1] },
    ],
};

// ─── Helpers ─────────────────────────────────────────────────────
function slugify(v) {
    return String(v).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

async function ensureCategory(catData, parentId = null) {
    try {
        // Check if exists
        const existing = await wcClient.get('/products/categories', {
            params: { slug: catData.slug, per_page: 1 },
        });
        if (existing.data.length > 0) {
            // Update parent if needed
            if (parentId && existing.data[0].parent !== parentId) {
                await wcClient.put(`/products/categories/${existing.data[0].id}`, { parent: parentId });
            }
            return existing.data[0];
        }

        // Create
        const payload = { ...catData };
        if (parentId) payload.parent = parentId;
        const resp = await wcClient.post('/products/categories', payload);
        return resp.data;
    } catch (err) {
        if (err.response?.data?.code === 'term_exists') {
            const existId = err.response.data.data?.resource_id;
            if (existId && parentId) {
                await wcClient.put(`/products/categories/${existId}`, { parent: parentId });
            }
            const refetch = await wcClient.get(`/products/categories/${existId}`);
            return refetch.data;
        }
        throw err;
    }
}

async function findAttribute(slug) {
    const resp = await wcClient.get('/products/attributes', { params: { per_page: 100 } });
    return resp.data.find(a => a.slug === slug || a.slug === slug.replace('pa_', ''));
}

async function createSimpleProduct(productData, categoryId) {
    // Phase 1: Create product WITHOUT images
    const payload = {
        name: productData.name,
        type: 'simple',
        sku: productData.sku,
        regular_price: productData.regular_price,
        sale_price: productData.sale_price || '',
        description: productData.description,
        manage_stock: true,
        stock_quantity: Math.floor(Math.random() * 80) + 20,
        status: 'publish',
        categories: [{ id: categoryId }],
    };

    const resp = await wcClient.post('/products', payload);
    await productRepository.sync(resp.data);
    return resp.data;
}

async function createVariableProduct(productData, categoryId, sizeAttr, colorAttr) {
    const SIZES = ['S', 'M', 'L'];
    const COLORS = ['Red', 'Blue', 'Green'];

    // Parent (no images — will be shown from frontend Unsplash directly)
    const parentPayload = {
        name: productData.name,
        type: 'variable',
        sku: productData.sku,
        description: productData.description,
        status: 'publish',
        categories: [{ id: categoryId }],
        attributes: [
            { id: sizeAttr.id, variation: true, visible: true, options: SIZES },
            { id: colorAttr.id, variation: true, visible: true, options: COLORS },
        ],
    };

    const parentResp = await wcClient.post('/products', parentPayload);
    const parentId = parentResp.data.id;
    const parentSlug = parentResp.data.slug;

    // Variations
    const batchPayload = { create: [] };
    for (const size of SIZES) {
        for (const color of COLORS) {
            batchPayload.create.push({
                regular_price: productData.regular_price,
                sale_price: productData.sale_price || '',
                manage_stock: true,
                stock_quantity: Math.floor(Math.random() * 15) + 5,
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

    // Sync to MongoDB
    const fullProduct = await wcClient.get(`/products/${parentId}`);
    await productRepository.sync(fullProduct.data);

    return { ...fullProduct.data, variationCount: createdCount };
}

// ─── Main ────────────────────────────────────────────────────────
async function seedDemo() {
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║       ShriRamya — DEMO Seeding Script            ║');
    console.log('╚══════════════════════════════════════════════════╝');

    await mongoose.connect(process.env.MONGO_URL + process.env.DB_NAME);
    console.log('✓ Connected to MongoDB');

    // Resolve global attributes
    const sizeAttr = await findAttribute('pa_size');
    const colorAttr = await findAttribute('pa_color');
    if (!sizeAttr || !colorAttr) {
        console.error('✗ pa_size/pa_color not found. Run setup-wc-attributes.js first.');
        process.exit(1);
    }
    console.log(`✓ Attributes: Size(${sizeAttr.id}), Color(${colorAttr.id})\n`);

    // Subcategories that should be VARIABLE products (clothing with sizes/colors)
    const variableSlugs = new Set(['sarees', 'lehengas', 'kurtis', 'salwar-suits', 'gowns']);

    const categoryMap = {};
    const stats = { categories: 0, simple: 0, variable: 0, variations: 0, images: 0, errors: [] };

    // ── Step 1: Create Category Hierarchy ──
    console.log('📂 Creating category hierarchy...\n');
    for (const tree of CATEGORY_TREE) {
        // Create parent
        const parent = await ensureCategory(tree.parent);
        categoryMap[tree.parent.slug] = parent.id;
        console.log(`  📁 ${tree.parent.name} (ID: ${parent.id})`);
        stats.categories++;

        // Create children
        for (const child of tree.children) {
            const childCat = await ensureCategory(child, parent.id);
            categoryMap[child.slug] = childCat.id;
            console.log(`    └─ ${child.name} (ID: ${childCat.id})`);
            stats.categories++;
        }
    }

    // Also create New Arrivals and Sale top-level categories
    const newArrivals = await ensureCategory({ name: 'New Arrivals', slug: 'new-arrivals', description: 'Latest additions' });
    categoryMap['new-arrivals'] = newArrivals.id;
    const sale = await ensureCategory({ name: 'Sale', slug: 'sale', description: 'Discounted items' });
    categoryMap['sale'] = sale.id;
    console.log(`\n  📁 New Arrivals (ID: ${newArrivals.id})`);
    console.log(`  📁 Sale (ID: ${sale.id})`);

    console.log(`\n✓ ${stats.categories} categories ready\n`);

    // ── Step 2: Seed Products ──
    console.log('📦 Seeding products with images...\n');

    for (const [catSlug, products] of Object.entries(PRODUCTS)) {
        const catId = categoryMap[catSlug];
        if (!catId) {
            console.error(`  ✗ Category ${catSlug} not found in map, skipping.`);
            continue;
        }

        const isVariable = variableSlugs.has(catSlug);
        console.log(`  🏷️  ${catSlug.toUpperCase()} (${isVariable ? 'variable' : 'simple'}):`);

        for (const prod of products) {
            try {
                if (isVariable) {
                    const result = await createVariableProduct(prod, catId, sizeAttr, colorAttr);
                    console.log(`    ✓ ${prod.name} (ID: ${result.id}, ${result.variationCount} variations, ${prod.images.length} images)`);
                    stats.variable++;
                    stats.variations += result.variationCount;
                } else {
                    const result = await createSimpleProduct(prod, catId);
                    console.log(`    ✓ ${prod.name} (ID: ${result.id}, ${prod.images.length} images)`);
                    stats.simple++;
                }
                stats.images += prod.images.length;
            } catch (err) {
                const msg = err.response?.data?.message || err.message;
                console.error(`    ✗ ${prod.name}: ${msg}`);
                stats.errors.push(`${prod.name}: ${msg}`);
            }
        }
        console.log('');
    }

    // ── Summary ──
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║               DEMO SEEDING COMPLETE              ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log(`\n  Categories:    ${stats.categories}`);
    console.log(`  Simple Prods:  ${stats.simple}`);
    console.log(`  Variable Prods: ${stats.variable}`);
    console.log(`  Variations:    ${stats.variations}`);
    console.log(`  Images:        ${stats.images}`);

    if (stats.errors.length > 0) {
        console.log(`\n  ⚠ Errors (${stats.errors.length}):`);
        stats.errors.forEach(e => console.log(`    - ${e}`));
    }

    console.log('\n  Category Map:', JSON.stringify(categoryMap, null, 2));
}

seedDemo()
    .then(() => {
        console.log('\n✅ Demo seeding complete!');
        process.exit(0);
    })
    .catch(err => {
        console.error('\n❌ Seeding failed:', err.message);
        process.exit(1);
    });
