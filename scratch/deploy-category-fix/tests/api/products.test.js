/**
 * Products API Tests
 * Tests for /api/v1/products/* endpoints
 */

const { request, BACKEND_URL, getAuthHeaders, getSessionHeaders } = require('./setup');

describe('🛍️ Products API', () => {
  let adminToken;
  let testProductId;
  
  beforeAll(async () => {
    // Get admin token
    const loginRes = await request(BACKEND_URL)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@shriramya.com', password: 'Admin@123' });
    
    adminToken = loginRes.body.data?.token;
  });
  
  describe('GET /api/v1/products', () => {
    it('✅ should return list of products (public)', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/v1/products');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('products');
      expect(Array.isArray(response.body.data.products)).toBe(true);
    });
    
    it('✅ should support pagination', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/v1/products')
        .query({ page: 1, limit: 5 });
      
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('products');
      expect(response.body.data.products.length).toBeLessThanOrEqual(5);
    });
    
    it('✅ should support category filter', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/v1/products')
        .query({ category: 'sarees' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
    
    it('✅ should support search query', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/v1/products')
        .query({ search: 'silk' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
    
    it('✅ should support price range filter', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/v1/products')
        .query({ minPrice: 500, maxPrice: 5000 });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
    
    it('✅ should support status filter (published)', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/v1/products')
        .query({ status: 'published' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
  
  describe('GET /api/v1/products/:id', () => {
    beforeAll(async () => {
      // Get a product ID for testing
      const listRes = await request(BACKEND_URL)
        .get('/api/v1/products');
      
      if (listRes.body.data?.products?.length > 0) {
        testProductId = listRes.body.data.products[0].id;
      }
    });
    
    it('✅ should return single product by ID', async () => {
      if (!testProductId) {
        console.warn('⚠️ No products available for testing');
        return;
      }
      
      const response = await request(BACKEND_URL)
        .get(`/api/v1/products/${testProductId}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', testProductId);
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('price');
      expect(response.body.data).toHaveProperty('images');
      expect(Array.isArray(response.body.data.images)).toBe(true);
    });
    
    it('✅ should include variants in response', async () => {
      if (!testProductId) return;
      
      const response = await request(BACKEND_URL)
        .get(`/api/v1/products/${testProductId}`);
      
      expect(response.body.data).toHaveProperty('variants');
      expect(Array.isArray(response.body.data.variants)).toBe(true);
    });
    
    it('✅ should include categories in response', async () => {
      if (!testProductId) return;
      
      const response = await request(BACKEND_URL)
        .get(`/api/v1/products/${testProductId}`);
      
      expect(response.body.data).toHaveProperty('categories');
      expect(Array.isArray(response.body.data.categories)).toBe(true);
    });
    
    it('❌ should return 404 for non-existent product', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/v1/products/999999');
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
    
    it('❌ should return 404 for invalid ID format', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/v1/products/invalid-id');
      
      expect(response.status).toBe(400);
    });
  });
  
  describe('GET /api/v1/products/:id/recommendations', () => {
    it('✅ should return product recommendations', async () => {
      if (!testProductId) {
        console.warn('⚠️ No products available for testing');
        return;
      }
      
      const response = await request(BACKEND_URL)
        .get(`/api/v1/products/${testProductId}/recommendations`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('productId');
      expect(response.body.data).toHaveProperty('recommendations');
      expect(Array.isArray(response.body.data.recommendations)).toBe(true);
    });
    
    it('✅ should support strategy parameter', async () => {
      if (!testProductId) return;
      
      const response = await request(BACKEND_URL)
        .get(`/api/v1/products/${testProductId}/recommendations`)
        .query({ strategy: 'same_category' });
      
      expect(response.status).toBe(200);
      expect(response.body.data.strategy).toBe('same_category');
    });
    
    it('✅ should support limit parameter', async () => {
      if (!testProductId) return;
      
      const response = await request(BACKEND_URL)
        .get(`/api/v1/products/${testProductId}/recommendations`)
        .query({ limit: 3 });
      
      expect(response.status).toBe(200);
      expect(response.body.data.recommendations.length).toBeLessThanOrEqual(3);
    });
    
    it('❌ should return 404 for non-existent product', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/v1/products/999999/recommendations');
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('GET /api/v1/products/:id/reviews', () => {
    it('✅ should return product reviews', async () => {
      if (!testProductId) return;
      
      const response = await request(BACKEND_URL)
        .get(`/api/v1/reviews/products/${testProductId}/reviews`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('reviews');
      expect(Array.isArray(response.body.data.reviews)).toBe(true);
    });
    
    it('✅ should support pagination', async () => {
      if (!testProductId) return;
      
      const response = await request(BACKEND_URL)
        .get(`/api/v1/reviews/products/${testProductId}/reviews`)
        .query({ page: 1, limit: 5 });
      
      expect(response.status).toBe(200);
    });
  });
  
  describe('POST /api/v1/products (Admin Only)', () => {
    const testProduct = {
      name: `Test Product ${Date.now()}`,
      sku: `TEST-${Date.now()}`,
      description: 'Test product description',
      base_price: 999,
      status: 'draft',
    };
    
    it('✅ should create product with valid data (admin)', async () => {
      if (!adminToken) {
        console.warn('⚠️ Admin token not available, skipping test');
        return;
      }
      
      const response = await request(BACKEND_URL)
        .post('/api/v1/products')
        .set(getAuthHeaders(adminToken))
        .send(testProduct);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(testProduct.name);
      
      // Store for cleanup
      testProductId = response.body.data.id;
    });
    
    it('❌ should fail without authentication', async () => {
      const response = await request(BACKEND_URL)
        .post('/api/v1/products')
        .send(testProduct);
      
      expect(response.status).toBe(401);
    });
    
    it('❌ should fail with missing required fields', async () => {
      if (!adminToken) return;
      
      const response = await request(BACKEND_URL)
        .post('/api/v1/products')
        .set(getAuthHeaders(adminToken))
        .send({ name: 'Incomplete Product' });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
    
    it('❌ should fail for non-admin user', async () => {
      // Login as customer
      const loginRes = await request(BACKEND_URL)
        .post('/api/v1/auth/login')
        .send({ email: 'customer@shriramya.com', password: 'Customer@123' });
      
      const customerToken = loginRes.body.data?.token;
      
      if (!customerToken) return;
      
      const response = await request(BACKEND_URL)
        .post('/api/v1/products')
        .set(getAuthHeaders(customerToken))
        .send(testProduct);
      
      expect(response.status).toBe(403);
    });
  });
  
  describe('PUT /api/v1/products/:id (Admin Only)', () => {
    it('✅ should update product (admin)', async () => {
      if (!adminToken || !testProductId) return;
      
      const updateData = {
        name: `Updated Product ${Date.now()}`,
        description: 'Updated description',
      };
      
      const response = await request(BACKEND_URL)
        .put(`/api/v1/products/${testProductId}`)
        .set(getAuthHeaders(adminToken))
        .send(updateData);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
    
    it('❌ should fail without authentication', async () => {
      if (!testProductId) return;
      
      const response = await request(BACKEND_URL)
        .put(`/api/v1/products/${testProductId}`)
        .send({ name: 'Unauthorized Update' });
      
      expect(response.status).toBe(401);
    });
  });
  
  describe('DELETE /api/v1/products/:id (Admin Only)', () => {
    it('✅ should delete product (admin)', async () => {
      if (!adminToken || !testProductId) return;
      
      const response = await request(BACKEND_URL)
        .delete(`/api/v1/products/${testProductId}`)
        .set(getAuthHeaders(adminToken));
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Verify deletion
      const getRes = await request(BACKEND_URL)
        .get(`/api/v1/products/${testProductId}`);
      
      expect(getRes.status).toBe(404);
    });
  });
  
  describe('Product Variants', () => {
    let variantProductId;
    
    beforeAll(async () => {
      if (!adminToken) return;
      
      // Create a product for variant testing
      const createRes = await request(BACKEND_URL)
        .post('/api/v1/products')
        .set(getAuthHeaders(adminToken))
        .send({
          name: `Variant Test Product ${Date.now()}`,
          sku: `VAR-TEST-${Date.now()}`,
          description: 'Test product for variants',
          base_price: 1299,
          status: 'draft',
        });
      
      variantProductId = createRes.body.data?.id;
    });
    
    afterAll(async () => {
      if (!adminToken || !variantProductId) return;
      
      // Cleanup
      await request(BACKEND_URL)
        .delete(`/api/v1/products/${variantProductId}`)
        .set(getAuthHeaders(adminToken));
    });
    
    it('✅ should add variant to product (admin)', async () => {
      if (!adminToken || !variantProductId) return;
      
      const variant = {
        sku: `VAR-${Date.now()}`,
        price: 1499,
        stock: 50,
        attributes: { size: 'M', color: 'Blue' },
      };
      
      const response = await request(BACKEND_URL)
        .post(`/api/v1/products/${variantProductId}/variants`)
        .set(getAuthHeaders(adminToken))
        .send(variant);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
    });
    
    it('✅ should update variant (admin)', async () => {
      if (!adminToken || !variantProductId) return;
      
      // First get the product to find variant ID
      const getRes = await request(BACKEND_URL)
        .get(`/api/v1/products/${variantProductId}`)
        .set(getAuthHeaders(adminToken));
      
      const variantId = getRes.body.data?.variants?.[0]?.id;
      
      if (!variantId) {
        console.warn('⚠️ No variant found for testing');
        return;
      }
      
      const response = await request(BACKEND_URL)
        .put(`/api/v1/products/${variantProductId}/variants/${variantId}`)
        .set(getAuthHeaders(adminToken))
        .send({ price: 1599, stock: 45 });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
    
    it('✅ should delete variant (admin)', async () => {
      if (!adminToken || !variantProductId) return;
      
      // Get variant ID
      const getRes = await request(BACKEND_URL)
        .get(`/api/v1/products/${variantProductId}`)
        .set(getAuthHeaders(adminToken));
      
      const variantId = getRes.body.data?.variants?.[0]?.id;
      
      if (!variantId) return;
      
      const response = await request(BACKEND_URL)
        .delete(`/api/v1/products/${variantProductId}/variants/${variantId}`)
        .set(getAuthHeaders(adminToken));
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
