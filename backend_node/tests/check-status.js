const axios = require('axios');

async function check() {
  try {
    // Login to get token
    const loginRes = await axios.post('http://localhost:8000/api/v1/auth/login', {
      email: 'admin@shriramya.com',
      password: 'Admin@123'
    });
    const token = loginRes.data.data.access_token;
    console.log('Token obtained.');

    const res = await axios.post('http://localhost:8000/api/v1/categories', {
      name: 'Status Check Cat ' + Date.now(),
      slug: 'status-check-' + Date.now()
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('Status Code:', res.status);
    console.log('Body:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    if (err.response) {
      console.log('Error Status:', err.response.status);
      console.log('Error Data:', err.response.data);
    } else {
      console.error('Error:', err.message);
    }
  }
}

check();
