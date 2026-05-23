const axios = require('axios');

async function run() {
  const BACKEND_URL = 'http://localhost:8000';
  
  console.log('1. Attempting login without CSRF...');
  try {
    const res = await axios.post(`${BACKEND_URL}/api/v1/auth/login`, {
      email: 'admin@shriramya.com',
      password: 'Admin@123'
    });
    console.log('Login success:', res.data);
  } catch (err) {
    console.log('Login failed without CSRF:', err.response?.status, err.response?.data);
  }

  console.log('\n2. Fetching CSRF token first...');
  try {
    const csrfRes = await axios.get(`${BACKEND_URL}/api/v1/csrf-token`);
    console.log('CSRF response headers:', csrfRes.headers['set-cookie']);
    console.log('CSRF token:', csrfRes.data);
    
    const csrfToken = csrfRes.data.data.csrf_token;
    const cookie = csrfRes.headers['set-cookie']?.[0]?.split(';')?.[0];
    
    console.log('\n3. Attempting login with CSRF token and cookie...');
    const loginRes = await axios.post(`${BACKEND_URL}/api/v1/auth/login`, {
      email: 'admin@shriramya.com',
      password: 'Admin@123'
    }, {
      headers: {
        'x-csrf-token': csrfToken,
        'Cookie': cookie
      }
    });
    console.log('Login success with CSRF:', loginRes.data);
  } catch (err) {
    console.log('Login failed with CSRF:', err.response?.status, err.response?.data);
  }
}

run().catch(console.error);
