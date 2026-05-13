const jwt = require('jsonwebtoken');
const axios = require('axios');
const path = require('path');

const projectRoot = 'c:\\Users\\Lenovo\\shriramya\\ShriRamya';
const config = require(path.join(projectRoot, 'backend_node/src/config/config'));

async function run() {
  const secret = config.jwt.secret.trim();
  const payload = {
    sub: '66d76f18224f000e99ae2a8a', // A valid admin ID from check_users.js if I had one, or just a dummy
    user_id: '66d76f18224f000e99ae2a8a',
    tenant_id: 2,
    roles: ['admin'],
    role: 'admin',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  };

  const token = jwt.sign(payload, secret);
  console.log('Generated Admin Token:', token);

  try {
    const response = await axios.get('http://localhost:8000/api/v1/products', {
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: {
        all_statuses: 'true'
      }
    });

    console.log('--- API Response ---');
    console.log('Status:', response.status);
    console.log('Products Count:', response.data.data?.products?.length);
    console.log('Pagination:', response.data.data?.pagination);
    
    if (response.data.data && response.data.data.length > 0) {
        console.log('First Product:', response.data.data[0].name, 'Status:', response.data.data[0].status);
    }
  } catch (err) {
    console.error('API Error:', err.response?.data || err.message);
  }
}

run();
