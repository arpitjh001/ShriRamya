const http = require('http');

const data = JSON.stringify({
  tenantId: 1,
  name: 'Test Setup Product - No Variants',
  description: 'this is a test',
  basePrice: 500,
  stock: 25,
  categories: [],
  variants: [] // Deliberately sending empty as array
});

const login = () => {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.data && json.data.access_token) {
            resolve(json.data.access_token);
          } else {
            console.error('Login failed response:', body);
            reject('Login failed');
          }
        } catch(e) { reject(e); }
      });
    });
    
    // Test admin credentials
    req.write(JSON.stringify({
      email: 'admin@shriramya.com',
      password: 'Admin@123'
    }));
    req.end();
  });
};

const createProduct = (token) => {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/v1/products',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.write(data);
    req.end();
  });
};

async function run() {
  try {
    const token = await login();
    console.log('Logged in successfully.');
    
    const response = await createProduct(token);
    console.log('Create Product Response:', JSON.stringify(response, null, 2));

    if (response.success && response.data) {
      if (response.data.variants && response.data.variants.length > 0) {
        console.log('SUCCESS: Default variant was injected!', response.data.variants);
      } else {
        console.log('FAIL: Variants array is missing or empty.');
        process.exit(1);
      }
    } else {
      console.log('Failed to create product. Validation failed?');
      process.exit(1);
    }
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
