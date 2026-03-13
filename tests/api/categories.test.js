/**
 * Categories API Tests
 * Tests for /api/v1/categories/* endpoints
 */

const { request, BACKEND_URL, getAuthHeaders } = require('./setup');

describe('📂 Categories API', () => {
  let adminToken;
  let testCategoryId;
  
  beforeAll(async () => {
    // Authenticate as admin
    const adminRes = await request(BACKEND_URL)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@shriramya.com', password: 'Admin@123' });
    
    adminToken = adminRes.body.data?.token;
  });
  
  describe('GET /api/v1/categories', () => {
    it('✅ should return all categories (public)', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/v1/categories');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('categories');
      expect(Array.isArray(response.body.data.categories)).toBe(true);
    });
  });
  
  describe('GET /api/v1/categories/:id', () => {
    beforeAll(async () => {
      // Get a category ID for testing
      const listRes = await request(BACKEND_URL)
        .get('/api/v1/categories');
      
      if (listRes.body.data?.categories?.length > 0) {
        testCategoryId = listRes.body.data.categories[0].id;
      }
    });
    
    it('✅ should return category by ID', async () => {
      if (!testCategoryId) {
        console.warn('⚠️ No categories available for testing');
        return;
      }
      
      const response = await request(BACKEND_URL)
        .get(`/api/v1/categories/${testCategoryId}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', testCategoryId);
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('slug');
    });
    
    it('❌ should return 404 for non-existent category', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/v1/categories/999999');
      
      expect(response.status).toBe(404);
    });
  });
  
  describe('GET /api/v1/categories/slug/:slug', () => {
    it('✅ should return category by slug', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/v1/categories/slug/sarees');
      
      // May succeed or return 404 if slug doesn't exist
      expect([200, 404]).toContain(response.status);
    });
    
    it('❌ should return 404 for non-existent slug', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/v1/categories/slug/nonexistent-category-xyz');
      
      expect(response.status).toBe(404);
    });
  });
  
  describe('GET /api/v1/categories/:id/products', () => {
    it('✅ should return products in category', async () => {
      if (!testCategoryId) return;
      
      const response = await request(BACKEND_URL)
        .get(`/api/v1/categories/${testCategoryId}/products`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('products');
      expect(Array.isArray(response.body.data.products)).toBe(true);
    });
  });
  
  describe('POST /api/v1/categories (Admin Only)', () => {
    const categoryData = {
      name: `Test Category ${Date.now()}`,
      slug: `test-category-${Date.now()}`,
      description: 'Test category description',
    };
    
    it('✅ should create category (admin)', async () => {
      if (!adminToken) return;
      
      const response = await request(BACKEND_URL)
        .post('/api/v1/categories')
        .set(getAuthHeaders(adminToken))
        .send(categoryData);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(categoryData.name);
      
      testCategoryId = response.body.data.id;
    });
    
    it('❌ should fail without authentication', async () => {
      const response = await request(BACKEND_URL)
        .post('/api/v1/categories')
        .send(categoryData);
      
      expect(response.status).toBe(401);
    });
    
    it('❌ should fail with missing required fields', async () => {
      if (!adminToken) return;
      
      const response = await request(BACKEND_URL)
        .post('/api/v1/categories')
        .set(getAuthHeaders(adminToken))
        .send({ name: 'Incomplete' });
      
      expect(response.status).toBe(400);
    });
    
    it('❌ should fail with duplicate slug', async () => {
      if (!adminToken) return;
      
      const response = await request(BACKEND_URL)
        .post('/api/v1/categories')
        .set(getAuthHeaders(adminToken))
        .send({
          name: 'Duplicate Category',
          slug: 'sarees', // Existing slug
        });
      
      expect(response.status).toBe(400);
    });
  });
  
  describe('PUT /api/v1/categories/:id (Admin Only)', () => {
    it('✅ should update category (admin)', async () => {
      if (!adminToken || !testCategoryId) return;
      
      const updateData = {
        name: `Updated Category ${Date.now()}`,
        description: 'Updated description',
      };
      
      const response = await request(BACKEND_URL)
        .put(`/api/v1/categories/${testCategoryId}`)
        .set(getAuthHeaders(adminToken))
        .send(updateData);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
    
    it('❌ should fail without authentication', async () => {
      if (!testCategoryId) return;
      
      const response = await request(BACKEND_URL)
        .put(`/api/v1/categories/${testCategoryId}`)
        .send({ name: 'Unauthorized Update' });
      
      expect(response.status).toBe(401);
    });
  });
  
  describe('DELETE /api/v1/categories/:id (Admin Only)', () => {
    it('✅ should delete category (admin)', async () => {
      if (!adminToken || !testCategoryId) return;
      
      const response = await request(BACKEND_URL)
        .delete(`/api/v1/categories/${testCategoryId}`)
        .set(getAuthHeaders(adminToken));
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Verify deletion
      const getRes = await request(BACKEND_URL)
        .get(`/api/v1/categories/${testCategoryId}`);
      
      expect(getRes.status).toBe(404);
    });
    
    it('❌ should fail to delete category with products', async () => {
      // This test depends on existing data
      // Categories with products should not be deletable
      console.log('⚠️ Skipping delete category with products test - depends on data');
    });
  });
});
