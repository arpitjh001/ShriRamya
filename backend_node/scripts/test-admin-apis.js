#!/usr/bin/env node
/**
 * API Test Suite - Analytics & Native Products Tabs
 * Tests all APIs used in Admin Dashboard
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:8080/api/v1';
let authToken = '';

const results = {
  passed: [],
  failed: [],
  total: 0
};

const log = (message, type = 'info') => {
  const icon = type === 'pass' ? '✅' : type === 'fail' ? '❌' : '📝';
  console.log(`${icon} ${message}`);
};

const test = async (name, fn) => {
  results.total++;
  try {
    await fn();
    results.passed.push(name);
    log(`PASS: ${name}`, 'pass');
    return true;
  } catch (error) {
    results.failed.push({ name, error: error.message });
    log(`FAIL: ${name} - ${error.message}`, 'fail');
    return false;
  }
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

// Authentication
async function getAuthToken() {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'testadmin@shriramya.com',
      password: 'Test123!'
    });
    authToken = response.data.data.access_token;
    log('Auth token obtained', 'pass');
    return true;
  } catch (error) {
    log('Login failed - creating new user', 'fail');
    try {
      const registerEmail = `test_${Date.now()}@shriramya.com`;
      await axios.post(`${BASE_URL}/auth/register`, {
        name: 'Test Admin',
        email: registerEmail,
        password: 'Test123!'
      });
      const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        email: registerEmail,
        password: 'Test123!'
      });
      authToken = loginResponse.data.data.access_token;
      log('New user created and logged in', 'pass');
      return true;
    } catch (regError) {
      log('Registration also failed: ' + regError.message, 'fail');
      return false;
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// NATIVE PRODUCTS TAB APIs
// ═══════════════════════════════════════════════════════════════

async function testNativeProductsAPIs() {
  log('\n=== NATIVE PRODUCTS TAB APIs ===\n');

  await test('GET /products - List all products', async () => {
    const response = await axios.get(`${BASE_URL}/products?per_page=10`);
    assert(response.data.success === true, 'Request failed');
    assert(Array.isArray(response.data.data.products), 'Products not an array');
    log(`  Found ${response.data.data.products.length} products`);
  });

  await test('GET /products/:id - Get single product', async () => {
    const products = await axios.get(`${BASE_URL}/products?per_page=1`);
    const productId = products.data.data.products[0].id;
    const response = await axios.get(`${BASE_URL}/products/${productId}`);
    assert(response.data.success === true, 'Request failed');
    assert(response.data.data.id === productId, 'Wrong product returned');
    log(`  Retrieved product: ${response.data.data.name}`);
  });

  await test('GET /products/:id/variants - Get product variants', async () => {
    const products = await axios.get(`${BASE_URL}/products?per_page=1`);
    const productId = products.data.data.products[0].id;
    const response = await axios.get(`${BASE_URL}/products/${productId}`);
    assert(response.data.data.variants, 'No variants found');
    log(`  Found ${response.data.data.variants.length} variants`);
  });

  await test('POST /products - Create product', async () => {
    const testProduct = {
      name: `Test Product ${Date.now()}`,
      description: 'API Test Product',
      basePrice: 999,
      status: 'draft',
      variants: [
        {
          sku: `TEST-${Date.now()}`,
          price: 999,
          stock: 10,
          attributes: { Color: 'Red', Size: 'M' }
        }
      ]
    };
    const response = await axios.post(`${BASE_URL}/products`, testProduct, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    assert(response.data.success === true, 'Create failed');
    assert(response.data.data.id, 'No product ID returned');
    log(`  Created product ID: ${response.data.data.id}`);
  });

  await test('PUT /products/:id - Update product', async () => {
    const products = await axios.get(`${BASE_URL}/products?per_page=1`);
    const productId = products.data.data.products[0].id;
    const updateData = {
      name: 'Updated Product Name',
      basePrice: 1299
    };
    const response = await axios.put(`${BASE_URL}/products/${productId}`, updateData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    assert(response.data.success === true, 'Update failed');
    log(`  Updated product: ${response.data.data.name}`);
  });

  await test('POST /products/:id/variants - Add variant', async () => {
    const products = await axios.get(`${BASE_URL}/products?per_page=1`);
    const productId = products.data.data.products[0].id;
    const variantData = {
      sku: `VAR-${Date.now()}`,
      price: 1499,
      stock: 15,
      attributes: { Color: 'Blue', Size: 'L' }
    };
    const response = await axios.post(`${BASE_URL}/products/${productId}/variants`, variantData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    assert(response.data.success === true, 'Add variant failed');
    log(`  Added variant: ${response.data.data.sku}`);
  });

  await test('PUT /products/:id/variants/:variant_id - Update variant', async () => {
    const products = await axios.get(`${BASE_URL}/products?per_page=1`);
    const productId = products.data.data.products[0].id;
    const variantId = products.data.data.products[0].variants[0].id;
    const updateData = {
      price: 1999,
      stock: 25
    };
    const response = await axios.put(`${BASE_URL}/products/${productId}/variants/${variantId}`, updateData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    assert(response.data.success === true, 'Update variant failed');
    log(`  Updated variant price: ${response.data.data.price}`);
  });

  await test('DELETE /products/:id/variants/:variant_id - Delete variant', async () => {
    const products = await axios.get(`${BASE_URL}/products?per_page=1`);
    const productId = products.data.data.products[0].id;
    const variantId = products.data.data.products[0].variants[0].id;
    const response = await axios.delete(`${BASE_URL}/products/${productId}/variants/${variantId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    assert(response.data.success === true, 'Delete variant failed');
    log(`  Deleted variant ID: ${variantId}`);
  });
}

// ═══════════════════════════════════════════════════════════════
// CATEGORIES TAB APIs
// ═══════════════════════════════════════════════════════════════

async function testCategoriesAPIs() {
  log('\n=== CATEGORIES TAB APIs ===\n');

  await test('GET /categories - List all categories', async () => {
    const response = await axios.get(`${BASE_URL}/categories`);
    assert(response.data.success === true, 'Request failed');
    // Handle both array and object responses
    const categories = Array.isArray(response.data.data) ? response.data.data : (response.data.data?.categories || []);
    assert(Array.isArray(categories), 'Categories not an array');
    log(`  Found ${categories.length} categories`);
  });

  await test('GET /categories/:id - Get category by ID', async () => {
    const response = await axios.get(`${BASE_URL}/categories`);
    const categories = Array.isArray(response.data.data) ? response.data.data : (response.data.data?.categories || []);
    if (categories.length > 0) {
      const categoryId = categories[0].id;
      const categoryResponse = await axios.get(`${BASE_URL}/categories/${categoryId}`);
      assert(categoryResponse.data.success === true, 'Request failed');
      log(`  Retrieved category: ${categoryResponse.data.data.name}`);
    } else {
      log('  No categories to test', 'info');
    }
  });

  await test('GET /categories/slug/:slug - Get category by slug', async () => {
    const response = await axios.get(`${BASE_URL}/categories/slug/uncategorized`);
    assert(response.data.success === true, 'Request failed');
    log(`  Retrieved category by slug: ${response.data.data.name}`);
  });

  await test('POST /categories - Create category', async () => {
    const categoryData = {
      name: `Test Category ${Date.now()}`,
      slug: `test-category-${Date.now()}`,
      description: 'API Test Category'
    };
    const response = await axios.post(`${BASE_URL}/categories`, categoryData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    assert(response.data.success === true, 'Create failed');
    assert(response.data.data.id, 'No category ID returned');
    log(`  Created category ID: ${response.data.data.id}`);
  });

  await test('PUT /categories/:id - Update category', async () => {
    const response = await axios.get(`${BASE_URL}/categories`);
    const categories = Array.isArray(response.data.data) ? response.data.data : (response.data.data?.categories || []);
    if (categories.length > 0) {
      const categoryId = categories[0].id;
      const updateData = {
        name: 'Updated Category Name',
        description: 'Updated description'
      };
      const updateResponse = await axios.put(`${BASE_URL}/categories/${categoryId}`, updateData, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      assert(updateResponse.data.success === true, 'Update failed');
      log(`  Updated category: ${updateResponse.data.data.name}`);
    }
  });

  await test('DELETE /categories/:id - Delete category', async () => {
    const response = await axios.get(`${BASE_URL}/categories`);
    const categories = Array.isArray(response.data.data) ? response.data.data : (response.data.data?.categories || []);
    const testCategory = categories.find(c => c.name && c.name.includes('Test'));
    if (testCategory) {
      const deleteResponse = await axios.delete(`${BASE_URL}/categories/${testCategory.id}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      assert(deleteResponse.data.success === true, 'Delete failed');
      log(`  Deleted category ID: ${testCategory.id}`);
    } else {
      log('  No test category to delete', 'info');
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// ANALYTICS TAB APIs
// ═══════════════════════════════════════════════════════════════

async function testAnalyticsAPIs() {
  log('\n=== ANALYTICS TAB APIs ===\n');

  await test('GET /admin/analytics/overview - Dashboard overview', async () => {
    const response = await axios.get(`${BASE_URL}/admin/analytics/overview`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    assert(response.data.success === true, 'Request failed');
    log(`  Retrieved dashboard overview`);
    if (response.data.data) {
      log(`    Today: ${response.data.data.today?.orders || 0} orders`);
      log(`    Month: ${response.data.data.month?.orders || 0} orders`);
    }
  });

  await test('GET /admin/analytics/sales - Sales analytics', async () => {
    const response = await axios.get(`${BASE_URL}/admin/analytics/sales`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    assert(response.data.success === true, 'Request failed');
    log(`  Retrieved sales analytics`);
  });

  await test('GET /admin/analytics/products - Product analytics', async () => {
    const response = await axios.get(`${BASE_URL}/admin/analytics/products`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    assert(response.data.success === true, 'Request failed');
    log(`  Retrieved product analytics`);
  });

  await test('GET /admin/analytics/revenue - Revenue analytics', async () => {
    const response = await axios.get(`${BASE_URL}/admin/analytics/revenue`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    assert(response.data.success === true, 'Request failed');
    log(`  Retrieved revenue analytics`);
  });
}

// ═══════════════════════════════════════════════════════════════
// INVENTORY TAB APIs
// ═══════════════════════════════════════════════════════════════

async function testInventoryAPIs() {
  log('\n=== INVENTORY TAB APIs ===\n');

  await test('GET /admin/warehouses - List warehouses', async () => {
    const response = await axios.get(`${BASE_URL}/admin/warehouses`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    assert(response.data.success === true, 'Request failed');
    log(`  Found ${response.data.data.length} warehouses`);
  });

  await test('GET /admin/inventory/low-stock - Low stock alerts', async () => {
    const response = await axios.get(`${BASE_URL}/admin/inventory/low-stock`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    assert(response.data.success === true, 'Request failed');
    log(`  Found ${response.data.data.length} low stock items`);
  });
}

// ═══════════════════════════════════════════════════════════════
// MAIN TEST RUNNER
// ═══════════════════════════════════════════════════════════════

async function runAllTests() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   API Test Suite - Admin Dashboard Tabs                  ║');
  console.log('║   Testing: Products, Categories, Analytics, Inventory    ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('\n');

  // Get auth token
  log('Getting authentication token...');
  const authSuccess = await getAuthToken();
  if (!authSuccess) {
    log('Authentication failed. Stopping tests.', 'fail');
    process.exit(1);
  }
  console.log('\n');

  // Run all tests
  await testNativeProductsAPIs();
  await testCategoriesAPIs();
  await testAnalyticsAPIs();
  await testInventoryAPIs();

  // Print summary
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('                    TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Total Tests:  ${results.total}`);
  console.log(`Passed:       ${results.passed.length} ✅`);
  console.log(`Failed:       ${results.failed.length} ❌`);
  console.log(`Pass Rate:    ${((results.passed.length / results.total) * 100).toFixed(2)}%`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('\n');

  if (results.failed.length > 0) {
    console.log('Failed Tests:');
    results.failed.forEach(f => {
      console.log(`  ❌ ${f.name}: ${f.error}`);
    });
    console.log('\n');
  }

  const passRate = (results.passed.length / results.total) * 100;
  if (passRate >= 90) {
    console.log('🎉 API STATUS: ALL CRITICAL APIs WORKING ✅');
  } else if (passRate >= 70) {
    console.log('⚠️  API STATUS: SOME APIs NEED ATTENTION');
  } else {
    console.log('❌ API STATUS: MULTIPLE APIs FAILED');
  }
  console.log('\n');

  // Generate report
  generateReport();

  process.exit(results.failed.length > 0 ? 1 : 0);
}

function generateReport() {
  const report = `# API Test Report - Admin Dashboard Tabs

**Test Date:** ${new Date().toISOString()}
**Base URL:** ${BASE_URL}

---

## Test Results

| Category | Passed | Failed | Total |
|----------|--------|--------|-------|
| Native Products | ${results.passed.filter(r => r.includes('products') || r.includes('variant')).length} | ${results.failed.filter(r => r.name.includes('products') || r.name.includes('variant')).length} | ${results.total} |
| Categories | ${results.passed.filter(r => r.includes('categories')).length} | ${results.failed.filter(r => r.name.includes('categories')).length} | ${results.total} |
| Analytics | ${results.passed.filter(r => r.includes('analytics')).length} | ${results.failed.filter(r => r.name.includes('analytics')).length} | ${results.total} |
| Inventory | ${results.passed.filter(r => r.includes('warehouses') || r.includes('inventory')).length} | ${results.failed.filter(r => r.name.includes('warehouses') || r.name.includes('inventory')).length} | ${results.total} |

---

## Passed Tests

${results.passed.map(r => `- ✅ ${r}`).join('\n')}

---

## Failed Tests

${results.failed.length > 0 ? results.failed.map(f => `- ❌ ${f.name}\n  **Error:** ${f.error}`).join('\n\n') : 'None - All tests passed! ✅'}

---

## Recommendations

${results.failed.length > 0 ? `
### Issues to Fix:
${results.failed.map(f => `1. **${f.name}** - ${f.error}`).join('\n')}
` : 'All APIs are working correctly! No fixes needed.'}

---

**Report Generated:** ${new Date().toISOString()}
**Status:** ${results.failed.length === 0 ? '✅ ALL PASS' : '⚠️ SOME FAILURES'}
`;

  const fs = require('fs');
  fs.writeFileSync('API_TEST_REPORT.md', report);
  console.log('📄 Test report saved to: API_TEST_REPORT.md\n');
}

// Start tests
runAllTests();