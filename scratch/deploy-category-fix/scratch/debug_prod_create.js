
const BASE_URL = 'https://www.shriramya.com/api/v1';

async function debugCreate() {
  // Login
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@shriramya.com', password: 'Admin@123' })
  });
  const loginData = await loginRes.json();
  const token = loginData?.data?.token;
  
  if (!token) {
    console.error('Login failed');
    return;
  }

  // Try create
  const product = {
    name: 'DEBUG PRODUCT ' + Date.now(),
    description: 'Debug production 500',
    fabric: 'Cotton',
    basePrice: 100,
    status: 'draft',
    images: ['https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=800']
  };

  const res = await fetch(`${BASE_URL}/products`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(product)
  });

  const data = await res.json();
  console.log('Status:', res.status);
  console.log('Response:', JSON.stringify(data, null, 2));
}

debugCreate();
