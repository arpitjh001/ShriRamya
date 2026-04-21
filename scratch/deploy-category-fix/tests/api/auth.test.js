/**
 * Authentication API Tests
 * Tests for /api/v1/auth/* endpoints
 */

const { request, BACKEND_URL, getAuthHeaders } = require('./setup');

describe('🔐 Authentication API', () => {
  const testEmail = `test_${Date.now()}@shriramya.com`;
  const testPassword = 'Test@123456';
  
  describe('POST /api/v1/auth/register', () => {
    it('✅ should register a new customer successfully', async () => {
      const response = await request(BACKEND_URL)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test Customer',
          email: testEmail,
          password: testPassword,
          phone: '9876543210',
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).toHaveProperty('email', testEmail);
    });
    
    it('❌ should fail with invalid email format', async () => {
      const response = await request(BACKEND_URL)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test User',
          email: 'invalid-email',
          password: testPassword,
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
    
    it('❌ should fail with weak password', async () => {
      const response = await request(BACKEND_URL)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test User',
          email: `weak_${Date.now()}@test.com`,
          password: '123',
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
    
    it('❌ should fail with duplicate email', async () => {
      const response = await request(BACKEND_URL)
        .post('/api/v1/auth/register')
        .send({
          name: 'Duplicate User',
          email: testEmail,
          password: testPassword,
        });
      
      // Either 400 or 409 depending on implementation
      expect([400, 409]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });
    
    it('❌ should fail with missing required fields', async () => {
      const response = await request(BACKEND_URL)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test User',
          // missing email and password
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('POST /api/v1/auth/login', () => {
    it('✅ should login with correct credentials', async () => {
      const response = await request(BACKEND_URL)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).toHaveProperty('email', testEmail);
    });
    
    it('❌ should fail with wrong password', async () => {
      const response = await request(BACKEND_URL)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword123',
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
    
    it('❌ should fail with non-existent email', async () => {
      const response = await request(BACKEND_URL)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@shriramya.com',
          password: testPassword,
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
    
    it('❌ should fail with missing credentials', async () => {
      const response = await request(BACKEND_URL)
        .post('/api/v1/auth/login')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('GET /api/v1/auth/me', () => {
    let authToken;
    
    beforeAll(async () => {
      // Login to get token
      const loginRes = await request(BACKEND_URL)
        .post('/api/v1/auth/login')
        .send({ email: testEmail, password: testPassword });
      
      authToken = loginRes.body.data?.token;
    });
    
    it('✅ should return current user with valid token', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/v1/auth/me')
        .set(getAuthHeaders(authToken));
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('email', testEmail);
    });
    
    it('❌ should fail with invalid token', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/v1/auth/me')
        .set(getAuthHeaders('invalid_token_here'));
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
    
    it('❌ should fail without token', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/v1/auth/me');
      
      expect(response.status).toBe(401);
    });
  });
  
  describe('GET /api/v1/auth/check-admin', () => {
    it('✅ should return admin status for admin user', async () => {
      // Use admin credentials from setup
      const loginRes = await request(BACKEND_URL)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@shriramya.com',
          password: 'Admin@123',
        });
      
      const adminToken = loginRes.body.data?.token;
      
      if (!adminToken) {
        console.warn('⚠️ Admin credentials not available, skipping test');
        return;
      }
      
      const response = await request(BACKEND_URL)
        .get('/api/v1/auth/check-admin')
        .set(getAuthHeaders(adminToken));
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
    
    it('❌ should fail for non-admin user', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/v1/auth/check-admin')
        .set(getAuthHeaders(authToken));
      
      expect(response.status).toBe(403);
    });
  });
  
  describe('POST /api/v1/auth/refresh', () => {
    it('❌ should fail with invalid refresh token', async () => {
      const response = await request(BACKEND_URL)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid_refresh_token' });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
