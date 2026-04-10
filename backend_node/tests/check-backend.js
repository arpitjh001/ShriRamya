const axios = require('axios');

const BACKEND_URL = 'http://localhost:8000';

async function check() {
  try {
    console.log('Checking health...');
    const health = await axios.get(`${BACKEND_URL}/api/v1/health`);
    console.log('Health:', health.data);

    console.log('Checking login...');
    const login = await axios.post(`${BACKEND_URL}/api/v1/auth/login`, {
      email: 'admin@shriramya.com',
      password: 'Admin@123'
    });
    console.log('Login response:', JSON.stringify(login.data, null, 2));
    console.log('Login successful, token found:', !!login.data.data?.access_token || !!login.data.data?.token);
  } catch (err) {
    console.error('Error:', err.message);
    if (err.response) {
      console.error('Response:', err.response.data);
    }
  }
}

check();
