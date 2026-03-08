const axios = require('axios');

async function testLogin() {
    try {
        const response = await axios.post('http://localhost:8080/api/v1/auth/login', {
            email: 'admin@shriramya.com',
            password: 'Admin@123'
        });
        console.log('✅ Login Succesful:');
        console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('❌ Login Failed:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error Message:', error.message);
        }
    }
}

testLogin();
