const axios = require('axios');

async function testPerformance() {
    const baseUrl = 'http://localhost:8000/api/v1';
    const deviceId = 'perf_test_999';

    try {
        console.log('--- Performance Test: Batch Variation Creation ---');

        // 1. Login
        const loginRes = await axios.post(`${baseUrl}/auth/login`, {
            email: 'admin@example.com',
            password: 'Password123!'
        }, {
            headers: { 'x-device-id': deviceId }
        });
        const token = loginRes.data.data.access_token;

        // 2. Performance-Optimized Create
        const productData = {
            name: `Performance Optimized Saree ${Date.now()}`,
            type: 'variable',
            regular_price: '5000',
            description: 'Testing WooCommerce Batch API + Pre-created Attributes + Redis Cache',
            categories: [{ id: 15 }], // Assuming category 15 exists or update as needed
            attributes: [
                { name: 'Size', options: ['S', 'M'], variation: true, visible: true },
                { name: 'Color', options: ['Red', 'Blue'], variation: true, visible: true }
            ],
            variations: [
                { attributes: [{ name: 'Size', option: 'S' }, { name: 'Color', option: 'Red' }], price: '5000', stock: 10 },
                { attributes: [{ name: 'Size', option: 'S' }, { name: 'Color', option: 'Blue' }], price: '5200', stock: 5 },
                { attributes: [{ name: 'Size', option: 'M' }, { name: 'Color', option: 'Red' }], price: '5000', stock: 15 },
                { attributes: [{ name: 'Size', option: 'M' }, { name: 'Color', option: 'Blue' }], price: '5200', stock: 8 }
            ]
        };

        console.log('🚀 Sending Batch Creation Request...');
        const startTime = Date.now();
        const response = await axios.post(`${baseUrl}/products`, productData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-device-id': deviceId
            }
        });
        const endTime = Date.now();

        console.log(`✅ Product Created in ${endTime - startTime}ms`);
        console.log('Product ID:', response.data.data.id);

        // Total reduction comparison
        const beforeTime = 18000; // Average reported by user
        const reduction = beforeTime - (endTime - startTime);
        console.log(`⏱️ Performance Gain: ~${reduction}ms`);

    } catch (error) {
        console.error('❌ Test Failed:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
    }
}

testPerformance();
