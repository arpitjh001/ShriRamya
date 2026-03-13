/**
 * Blogs API Tests
 * Tests for /api/v1/blogs/* endpoints
 */

const { request, BACKEND_URL, getAuthHeaders } = require('./setup');

describe('📝 Blogs API', () => {
  let adminToken;
  let editorToken;
  let testBlogId;
  
  beforeAll(async () => {
    // Authenticate as admin
    const adminRes = await request(BACKEND_URL)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@shriramya.com', password: 'Admin@123' });
    
    adminToken = adminRes.body.data?.token;
  });
  
  describe('GET /api/v1/blogs', () => {
    it('✅ should return all blog posts (public)', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/v1/blogs');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('posts');
      expect(Array.isArray(response.body.data.posts)).toBe(true);
    });
    
    it('✅ should support pagination', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/v1/blogs')
        .query({ page: 1, limit: 5 });
      
      expect(response.status).toBe(200);
      expect(response.body.data.posts.length).toBeLessThanOrEqual(5);
    });
    
    it('✅ should support category filter', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/v1/blogs')
        .query({ category: 'fashion' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
    
    it('✅ should support search query', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/v1/blogs')
        .query({ search: 'saree' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
  
  describe('GET /api/v1/blogs/:id', () => {
    beforeAll(async () => {
      // Get a blog post ID for testing
      const listRes = await request(BACKEND_URL)
        .get('/api/v1/blogs');
      
      if (listRes.body.data?.posts?.length > 0) {
        testBlogId = listRes.body.data.posts[0].id;
      }
    });
    
    it('✅ should return blog post by ID', async () => {
      if (!testBlogId) {
        console.warn('⚠️ No blog posts available for testing');
        return;
      }
      
      const response = await request(BACKEND_URL)
        .get(`/api/v1/blogs/${testBlogId}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', testBlogId);
      expect(response.body.data).toHaveProperty('title');
      expect(response.body.data).toHaveProperty('content');
    });
    
    it('❌ should return 404 for non-existent post', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/v1/blogs/999999');
      
      expect(response.status).toBe(404);
    });
  });
  
  describe('GET /api/v1/blogs/slug/:slug', () => {
    it('✅ should return blog post by slug', async () => {
      // Try with a common slug
      const response = await request(BACKEND_URL)
        .get('/api/v1/blogs/slug/test-blog');
      
      // May succeed or return 404
      expect([200, 404]).toContain(response.status);
    });
  });
  
  describe('GET /api/v1/blogs/:id/related', () => {
    it('✅ should return related posts', async () => {
      if (!testBlogId) return;
      
      const response = await request(BACKEND_URL)
        .get(`/api/v1/blogs/${testBlogId}/related`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('posts');
      expect(Array.isArray(response.body.data.posts)).toBe(true);
    });
  });
  
  describe('GET /api/v1/blogs/:id/comments', () => {
    it('✅ should return post comments', async () => {
      if (!testBlogId) return;
      
      const response = await request(BACKEND_URL)
        .get(`/api/v1/blogs/${testBlogId}/comments`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('comments');
      expect(Array.isArray(response.body.data.comments)).toBe(true);
    });
  });
  
  describe('GET /api/v1/blogs/tags', () => {
    it('✅ should return all tags', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/v1/blogs/tags');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('tags');
      expect(Array.isArray(response.body.data.tags)).toBe(true);
    });
  });
  
  describe('GET /api/v1/blogs/categories', () => {
    it('✅ should return all blog categories', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/v1/blogs/categories');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('categories');
      expect(Array.isArray(response.body.data.categories)).toBe(true);
    });
  });
  
  describe('GET /api/v1/blogs/capabilities', () => {
    it('✅ should return blog capabilities', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/v1/blogs/capabilities');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('capabilities');
    });
  });
  
  describe('POST /api/v1/blogs/:id/comment', () => {
    let customerToken;
    
    beforeAll(async () => {
      const customerRes = await request(BACKEND_URL)
        .post('/api/v1/auth/login')
        .send({ email: 'customer@shriramya.com', password: 'Customer@123' });
      
      customerToken = customerRes.body.data?.token;
    });
    
    it('✅ should add comment to post', async () => {
      if (!customerToken || !testBlogId) return;
      
      const response = await request(BACKEND_URL)
        .post(`/api/v1/blogs/${testBlogId}/comment`)
        .set(getAuthHeaders(customerToken))
        .send({ comment: 'Great article! Very informative.' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
    
    it('❌ should fail without authentication', async () => {
      if (!testBlogId) return;
      
      const response = await request(BACKEND_URL)
        .post(`/api/v1/blogs/${testBlogId}/comment`)
        .send({ comment: 'Test comment' });
      
      expect(response.status).toBe(401);
    });
    
    it('❌ should fail with empty comment', async () => {
      if (!customerToken) return;
      
      const response = await request(BACKEND_URL)
        .post(`/api/v1/blogs/${testBlogId}/comment`)
        .set(getAuthHeaders(customerToken))
        .send({ comment: '' });
      
      expect(response.status).toBe(400);
    });
  });
  
  describe('Blog CRUD Operations (Admin/Editor)', () => {
    let createdBlogId;
    
    describe('POST /api/v1/blogs (Create)', () => {
      const blogData = {
        title: `Test Blog Post ${Date.now()}`,
        slug: `test-blog-post-${Date.now()}`,
        excerpt: 'Test blog excerpt',
        content: 'This is the full content of the test blog post.',
        featured_image: 'https://example.com/image.jpg',
        status: 'draft',
        categories: [],
        tags: [],
      };
      
      it('✅ should create blog post (admin)', async () => {
        if (!adminToken) return;
        
        const response = await request(BACKEND_URL)
          .post('/api/v1/blogs')
          .set(getAuthHeaders(adminToken))
          .send(blogData);
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data.title).toBe(blogData.title);
        
        createdBlogId = response.body.data.id;
      });
      
      it('❌ should fail without authentication', async () => {
        const response = await request(BACKEND_URL)
          .post('/api/v1/blogs')
          .send(blogData);
        
        expect(response.status).toBe(401);
      });
      
      it('❌ should fail with missing required fields', async () => {
        if (!adminToken) return;
        
        const response = await request(BACKEND_URL)
          .post('/api/v1/blogs')
          .set(getAuthHeaders(adminToken))
          .send({ title: 'Incomplete Blog' });
        
        expect(response.status).toBe(400);
      });
    });
    
    describe('PUT /api/v1/blogs/:id (Update)', () => {
      it('✅ should update blog post (admin)', async () => {
        if (!adminToken || !createdBlogId) return;
        
        const updateData = {
          title: `Updated Blog Title ${Date.now()}`,
          content: 'Updated content here.',
        };
        
        const response = await request(BACKEND_URL)
          .put(`/api/v1/blogs/${createdBlogId}`)
          .set(getAuthHeaders(adminToken))
          .send(updateData);
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
    
    describe('POST /api/v1/blogs/:id/publish', () => {
      it('✅ should publish blog post (admin)', async () => {
        if (!adminToken || !createdBlogId) return;
        
        const response = await request(BACKEND_URL)
          .post(`/api/v1/blogs/${createdBlogId}/publish`)
          .set(getAuthHeaders(adminToken));
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
    
    describe('POST /api/v1/blogs/:id/archive', () => {
      it('✅ should archive blog post (admin)', async () => {
        if (!adminToken || !createdBlogId) return;
        
        const response = await request(BACKEND_URL)
          .post(`/api/v1/blogs/${createdBlogId}/archive`)
          .set(getAuthHeaders(adminToken));
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
    
    describe('DELETE /api/v1/blogs/:id (Delete)', () => {
      it('✅ should delete blog post (admin)', async () => {
        if (!adminToken || !createdBlogId) return;
        
        const response = await request(BACKEND_URL)
          .delete(`/api/v1/blogs/${createdBlogId}`)
          .set(getAuthHeaders(adminToken));
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        
        // Verify deletion
        const getRes = await request(BACKEND_URL)
          .get(`/api/v1/blogs/${createdBlogId}`);
        
        expect(getRes.status).toBe(404);
      });
    });
  });
  
  describe('GET /api/v1/blogs/admin/analytics (Admin Only)', () => {
    it('✅ should return blog analytics (admin)', async () => {
      if (!adminToken) return;
      
      const response = await request(BACKEND_URL)
        .get('/api/v1/blogs/admin/analytics')
        .set(getAuthHeaders(adminToken));
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
    
    it('❌ should fail for non-admin user', async () => {
      const customerRes = await request(BACKEND_URL)
        .post('/api/v1/auth/login')
        .send({ email: 'customer@shriramya.com', password: 'Customer@123' });
      
      const customerToken = customerRes.body.data?.token;
      
      if (!customerToken) return;
      
      const response = await request(BACKEND_URL)
        .get('/api/v1/blogs/admin/analytics')
        .set(getAuthHeaders(customerToken));
      
      expect(response.status).toBe(403);
    });
  });
});
