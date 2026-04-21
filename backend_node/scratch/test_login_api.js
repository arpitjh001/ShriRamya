const axios = require('axios');
require('dotenv').config({ path: 'c:/Users/Lenovo/shriramya/ShriRamya/backend_node/.env' });

const API_URL = 'http://localhost:8000/api/v1';

async function testLogin() {
  try {
    console.log(`Attempting login for admin@shriramya.com...`);
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@shriramya.com',
      password: 'Admin@123',
      tenantId: 1
    });

    console.log('Login Result:', response.status);
    console.log('User Data:', JSON.stringify(response.data.data.user, null, 2));
    console.log('Access Token exists:', !!response.data.data.access_token);

    const token = response.data.data.access_token;
    
    console.log('\nTesting /check-admin...');
    const adminCheck = await axios.get(`${API_URL}/auth/check-admin`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Check Admin Result:', JSON.stringify(adminCheck.data, null, 2));

  } catch (error) {
    console.error('Login Failed!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
  }
}

testLogin();
