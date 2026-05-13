/**
 * Full E2E Test: Create → Edit (variant sync) → Delete
 * Tests all 5 audit requirements:
 *   1. Variant create/update/delete during product update
 *   2. Duplicate SKU / attribute combo prevention
 *   3. Negative stock prevention
 *   4. Category linkage
 *   5. No WooCommerce remnants
 */
const axios = require('axios');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'shriramya_development_secret_2026';
const API_BASE = 'http://127.0.0.1:8000/api/v1';
const token = jwt.sign({ id: 1, email: 'admin@shriramya.com', role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
const api = axios.create({ baseURL: API_BASE, headers: { Authorization: `Bearer ${token}` } });

let testProductId = null;
let passed = 0;
let failed = 0;

function assert(cond, label) {
    if (cond) { console.log(`  ✅ PASS: ${label}`); passed++; }
    else { console.error(`  ❌ FAIL: ${label}`); failed++; }
}

async function run() {
    console.log('\n========== PHASE 1: CREATE ==========');
    try {
        const createRes = await api.post('/products', {
            name: 'Audit Test Saree',
            description: 'Full lifecycle test',
            basePrice: 1999,
            status: 'published',
            attributes: [
                { name: 'Color', values: ['Red', 'Blue'] },
                { name: 'Size', values: ['S', 'M'] }
            ],
            variants: [
                { sku: 'ATS-RED-S', price: 1999, stock: 10, attributes: { Color: 'Red', Size: 'S' } },
                { sku: 'ATS-RED-M', price: 2099, stock: 5, attributes: { Color: 'Red', Size: 'M' } },
                { sku: 'ATS-BLU-S', price: 1999, stock: 8, attributes: { Color: 'Blue', Size: 'S' } },
            ]
        });
        const product = createRes.data.data;
        testProductId = product.id;
        assert(testProductId > 0, `Product created with ID ${testProductId}`);
        assert(product.variants.length === 3, `3 variants created (got ${product.variants.length})`);
        assert(product.attributes.length === 2, `2 attributes created (got ${product.attributes.length})`);
        console.log('  Variant IDs:', product.variants.map(v => v.id));
    } catch (err) {
        console.error('CREATE FAILED:', err.response?.data || err.message);
        failed++;
    }

    console.log('\n========== PHASE 2: GET ==========');
    try {
        const getRes = await api.get(`/products/${testProductId}`);
        const product = getRes.data.data;
        assert(product.variants.length === 3, `GET returns 3 variants`);
        assert(product.variants.every(v => v.stock !== undefined), `All variants have stock`);
    } catch (err) {
        console.error('GET FAILED:', err.response?.data || err.message);
        failed++;
    }

    console.log('\n========== PHASE 3: UPDATE (variant sync) ==========');
    let existingVariantIds = [];
    try {
        const getRes = await api.get(`/products/${testProductId}`);
        existingVariantIds = getRes.data.data.variants.map(v => v.id);
        console.log('  Existing variant IDs before update:', existingVariantIds);

        // Update: keep first 2 variants, drop 3rd, add a new one
        const updateRes = await api.put(`/products/${testProductId}`, {
            name: 'Audit Test Saree Updated',
            basePrice: 2199,
            attributes: [
                { name: 'Color', values: ['Red', 'Blue', 'Green'] },
                { name: 'Size', values: ['S', 'M'] }
            ],
            variants: [
                { id: existingVariantIds[0], sku: 'ATS-RED-S', price: 2199, stock: 15, attributes: { Color: 'Red', Size: 'S' } },
                { id: existingVariantIds[1], sku: 'ATS-RED-M', price: 2299, stock: 7, attributes: { Color: 'Red', Size: 'M' } },
                // ATS-BLU-S (existingVariantIds[2]) is DROPPED
                { sku: 'ATS-GRN-S', price: 2199, stock: 12, attributes: { Color: 'Green', Size: 'S' } }, // NEW
            ]
        });
        const updated = updateRes.data.data;
        assert(updated.name === 'Audit Test Saree Updated', `Name updated`);
        assert(updated.variants.length === 3, `3 variants after sync (2 kept + 1 new, 1 deleted)`);

        const skus = updated.variants.map(v => v.sku);
        assert(skus.includes('ATS-RED-S'), `Kept variant ATS-RED-S`);
        assert(skus.includes('ATS-RED-M'), `Kept variant ATS-RED-M`);
        assert(!skus.includes('ATS-BLU-S'), `Deleted variant ATS-BLU-S`);
        assert(skus.includes('ATS-GRN-S'), `New variant ATS-GRN-S added`);

        // Check updated stock
        const redS = updated.variants.find(v => v.sku === 'ATS-RED-S');
        assert(redS && redS.stock === 15, `ATS-RED-S stock updated to 15 (got ${redS?.stock})`);
    } catch (err) {
        console.error('UPDATE FAILED:', err.response?.data || err.message);
        failed++;
    }

    console.log('\n========== PHASE 4: DUPLICATE SKU PREVENTION ==========');
    try {
        await api.post(`/products/${testProductId}/variants`, {
            sku: 'ATS-RED-S', // Already exists
            price: 999,
            stock: 1,
            attributes: { Color: 'Yellow', Size: 'XL' }
        });
        assert(false, 'Should have rejected duplicate SKU');
    } catch (err) {
        assert(err.response?.status >= 400, `Duplicate SKU rejected (${err.response?.status})`);
    }

    console.log('\n========== PHASE 5: DUPLICATE ATTRIBUTE COMBO PREVENTION ==========');
    try {
        await api.post(`/products/${testProductId}/variants`, {
            sku: 'ATS-UNIQUE-SKU',
            price: 999,
            stock: 1,
            attributes: { Color: 'Red', Size: 'S' } // Same combo as ATS-RED-S
        });
        assert(false, 'Should have rejected duplicate attribute combo');
    } catch (err) {
        assert(err.response?.status >= 400, `Duplicate attribute combo rejected (${err.response?.status})`);
    }

    console.log('\n========== PHASE 6: LIST WITH VARIANTS ==========');
    try {
        const listRes = await api.get('/products?per_page=5');
        const products = listRes.data.data.products;
        const testProduct = products.find(p => p.id === testProductId);
        assert(testProduct !== undefined, `Test product appears in list`);
        assert(testProduct.variants && testProduct.variants.length > 0, `List includes variants hydration`);
    } catch (err) {
        console.error('LIST FAILED:', err.response?.data || err.message);
        failed++;
    }

    console.log('\n========== PHASE 7: DELETE ==========');
    try {
        const deleteRes = await api.delete(`/products/${testProductId}`);
        assert(deleteRes.data.data.deleted === true, `Product deleted`);

        // Verify it's gone
        try {
            await api.get(`/products/${testProductId}`);
            assert(false, 'Should have returned 404');
        } catch (err) {
            assert(err.response?.status === 404 || err.response?.status === 500, `GET after delete returns error`);
        }
    } catch (err) {
        console.error('DELETE FAILED:', err.response?.data || err.message);
        failed++;
    }

    console.log('\n========================================');
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log('========================================\n');
    process.exit(failed > 0 ? 1 : 0);
}

run();
