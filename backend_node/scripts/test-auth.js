const axios = require('axios');

async function testAuth() {
    const baseUrl = 'http://localhost:8000/api/v1';
    const deviceId = 'device_test_001';

    try {
        console.log('Logging in...');
        const loginRes = await axios.post(`${baseUrl}/auth/login`, {
            email: 'admin@example.com',
            password: 'Password123!'
        }, {
            headers: { 'x-device-id': deviceId }
        });

        const token = loginRes.data.data.access_token;
        console.log('Login successful. Token acquired.');

        console.log('Testing /me endpoint...');
        const meRes = await axios.get(`${baseUrl}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-device-id': deviceId
            }
        });
        console.log('/me Response SUCCESS:', JSON.stringify(meRes.data, null, 2));

    } catch (error) {
        console.error('Error during test:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
    }
}

testAuth();

