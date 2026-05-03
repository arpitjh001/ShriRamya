/**
 * simulate_edge_cases.js
 * Script to populate the database with edge case product scenarios for testing.
 */
const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:8000/api/v1';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@shriramya.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(async (config) => {
  if (!config.headers.Authorization && !config.url.includes('/auth/login')) {
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    config.headers.Authorization = `Bearer ${loginRes.data.data.access_token}`;
  }
  return config;
});

const scenarios = [
  {
    name: 'Edge: No Variants Product',
    description: 'A product with no variants, should use base price and stock.',
    basePrice: 1500,
    status: 'published',
    sku: 'EDGE-NO-VAR',
    totalStock: 50,
    variants: []
  },
  {
    name: 'Edge: Single Variant Product',
    description: 'A product with exactly one variant, should be auto-selected.',
    basePrice: 2000,
    status: 'published',
    sku: 'EDGE-SINGLE-VAR',
    variants: [
      {
        sku: 'EDGE-SINGLE-VAR-M',
        price: 2000,
        stock: 10,
        attributes: { color: 'blue', size: 'm' }
      }
    ]
  },
  {
    name: 'Edge: Matrix Variants',
    description: 'A product with multiple colors and sizes for matrix validation.',
    basePrice: 2500,
    status: 'published',
    sku: 'EDGE-MATRIX',
    variants: [
      { sku: 'EM-RED-S', price: 2500, stock: 5, attributes: { color: 'red', size: 's' } },
      { sku: 'EM-RED-M', price: 2500, stock: 0, attributes: { color: 'red', size: 'm' } },
      { sku: 'EM-BLUE-S', price: 2500, stock: 10, attributes: { color: 'blue', size: 's' } }
    ]
  },
  {
    name: 'Edge: Out of Stock',
    description: 'All variants out of stock.',
    basePrice: 3000,
    status: 'published',
    sku: 'EDGE-OOS',
    variants: [
      { sku: 'EO-RED', price: 3000, stock: 0, attributes: { color: 'red', size: 'freesize' } }
    ]
  }
];

async function runSimulation() {
  console.log('🚀 Starting Edge Case Simulation...');
  
  for (const scenario of scenarios) {
    try {
      const res = await api.post('/products', scenario);
      console.log(`✅ Created: ${scenario.name} (ID: ${res.data.id})`);
    } catch (err) {
      console.error(`❌ Failed: ${scenario.name} - ${err.response?.data?.message || err.message}`);
    }
  }
  
  console.log('🏁 Simulation Finished!');
}

runSimulation();
