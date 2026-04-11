const axios = require('axios');

async function debugCreate() {
  const baseURL = 'https://shriramya.com/api/v1';
  
  try {
    // 1. Login
    console.log('Logging in...');
    const loginRes = await axios.post(`${baseURL}/auth/login`, {
      email: 'admin@shriramya.com',
      password: 'Admin@123'
    });
    const token = loginRes.data.token || loginRes.data.data?.token;
    console.log('Token acquired.');

    const config = {
      headers: { Authorization: `Bearer ${token}` }
    };

    // 2. Create Product
    console.log('Attempting to create product...');
    const productData = {
      name: `Debug Product ${Date.now()}`,
      description: 'Debugging 500 error',
      basePrice: 100,
      stock: 50,
      status: 'draft',
      categories: []
    };

    try {
      const res = await axios.post(`${baseURL}/products`, productData, config);
      console.log('Success:', res.data);
    } catch (err) {
      console.log('FAILED with status:', err.response?.status);
      console.log('Error Data:', JSON.stringify(err.response?.data, null, 2));
      if (err.response?.status === 500) {
          console.log('Message:', err.response?.data?.message);
      }
    }
  } catch (error) {
    console.error('Script error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

debugCreate();
