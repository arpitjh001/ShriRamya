const axios = require('axios');

async function testAdminLogin() {
    try {
        const response = await axios.post('http://localhost:8080/api/v1/auth/login', {
            email: 'admin@shriramya.com',
            password: 'Admin@123'
        });
        console.log('✅ Login SUCCESSFUL!');
        console.log('User Role:', response.data.data.user.role);
        console.log('Access Token:', response.data.data.access_token.substring(0, 10), '...');
    } catch (error) {
        console.error('❌ Login FAILED!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }
    }
}

testAdminLogin();
