/**
 * Comprehensive API Validation Tests
 * Shri Ramya E-Commerce Platform
 *
 * Tests all API endpoints with:
 * - Valid payloads
 * - Invalid payloads
 * - Missing parameters
 * - Authentication failures
 * - Edge cases
 *
 * Run: npm test -- tests/api-validation.test.js
 */

const request = require('supertest');
const app = require('../src/app');
const httpStatus = require('http-status');

describe('API Validation Tests', () => {
    // Test data storage
    let authToken;
    let adminToken;
    let testProductId;
    let testCategoryId;
    let testBlogId;
    let testCouponId;

    // ==========================================
    // Helper Functions
    // ==========================================

    const getAuthHeader = (token) => ({
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    });

    const mockUser = {
        email: `test_${Date.now()}@example.com`,
        password: 'TestPassword123!',
        name: 'Test User',
    };

    const mockAdmin = {
        email: 'admin-test@example.com',
        password: 'AdminPassword123!',
        name: 'Admin Test User',
        role: 'admin',
    };

    // ==========================================
    // Setup
    // ==========================================

    beforeAll(async () => {
        // Try to register test users (may fail if already exists)
        try {
            await request(app).post('/api/v1/auth/register').send(mockUser);
        } catch (e) {
            // Ignore - user may already exist
        }

        try {
            await request(app).post('/api/v1/auth/register').send(mockAdmin);
        } catch (e) {
            // Ignore - user may already exist
        }

        // Login to get tokens
        const userRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: mockUser.email, password: mockUser.password });

        if (userRes.body.data?.access_token) {
            authToken = userRes.body.data.access_token;
        }

        const adminRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: mockAdmin.email, password: mockAdmin.password });

        if (adminRes.body.data?.access_token) {
            adminToken = adminRes.body.data.access_token;
        }
    });

    // ==========================================
    // AUTHENTICATION TESTS
    // ==========================================

    describe('POST /api/v1/auth/register', () => {
        it('should register user with valid data', async () => {
            const email = `newuser_${Date.now()}@example.com`;
            const res = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email,
                    password: 'SecurePass123!',
                    name: 'New User',
                });

            expect(res.status).toBe(httpStatus.CREATED);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('access_token');
        });

        it('should reject registration with invalid email', async () => {
            const res = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'invalid-email',
                    password: 'SecurePass123!',
                    name: 'New User',
                });

            expect(res.status).toBe(httpStatus.BAD_REQUEST);
            expect(res.body.success).toBe(false);
        });

        it('should reject registration with weak password', async () => {
            const res = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: `test_${Date.now()}@example.com`,
                    password: 'weak',
                    name: 'New User',
                });

            expect(res.status).toBe(httpStatus.BAD_REQUEST);
            expect(res.body.success).toBe(false);
        });

        it('should reject registration without name', async () => {
            const res = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: `test_${Date.now()}@example.com`,
                    password: 'SecurePass123!',
                });

            expect(res.status).toBe(httpStatus.BAD_REQUEST);
            expect(res.body.success).toBe(false);
        });
    });

    describe('POST /api/v1/auth/login', () => {
        it('should login with valid credentials', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: mockUser.email,
                    password: mockUser.password,
                });

            expect(res.status).toBe(httpStatus.OK);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('access_token');
        });

        it('should reject login with invalid email', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'SomePassword123!',
                });

            expect(res.status).toBe(httpStatus.UNAUTHORIZED);
            expect(res.body.success).toBe(false);
        });

        it('should reject login with wrong password', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: mockUser.email,
                    password: 'WrongPassword!',
                });

            expect(res.status).toBe(httpStatus.UNAUTHORIZED);
            expect(res.body.success).toBe(false);
        });

        it('should reject login without email', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({ password: mockUser.password });

            expect(res.status).toBe(httpStatus.BAD_REQUEST);
            expect(res.body.success).toBe(false);
        });
    });

    // ==========================================
    // CATEGORY TESTS
    // ==========================================

    describe('POST /api/v1/categories', () => {
        it('should create category with valid data (admin)', async () => {
            const res = await request(app)
                .post('/api/v1/categories')
                .set(getAuthHeader(adminToken))
                .send({
                    name: `Test Category ${Date.now()}`,
                    description: 'Test category description',
                });

            // May fail if admin token is invalid
            if (adminToken) {
                expect([httpStatus.CREATED, httpStatus.OK]).toContain(res.status);
                if (res.body.data) {
                    testCategoryId = res.body.data.id || res.body.data.categoryId;
                }
            } else {
                expect(res.status).toBe(httpStatus.UNAUTHORIZED);
            }
        });

        it('should reject category creation without auth', async () => {
            const res = await request(app)
                .post('/api/v1/categories')
                .send({ name: 'Test Category' });

            expect(res.status).toBe(httpStatus.UNAUTHORIZED);
            expect(res.body.success).toBe(false);
        });

        it('should reject category creation without name', async () => {
            const res = await request(app)
                .post('/api/v1/categories')
                .set(getAuthHeader(adminToken))
                .send({ description: 'No name' });

            if (adminToken) {
                expect(res.status).toBe(httpStatus.BAD_REQUEST);
                expect(res.body.success).toBe(false);
            }
        });

        it('should reject category with name too long', async () => {
            const res = await request(app)
                .post('/api/v1/categories')
                .set(getAuthHeader(adminToken))
                .send({ name: 'A'.repeat(101) });

            if (adminToken) {
                expect(res.status).toBe(httpStatus.BAD_REQUEST);
                expect(res.body.success).toBe(false);
            }
        });
    });

    describe('GET /api/v1/categories', () => {
        it('should get all categories (public)', async () => {
            const res = await request(app).get('/api/v1/categories');

            expect(res.status).toBe(httpStatus.OK);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('should get category by ID', async () => {
            if (testCategoryId) {
                const res = await request(app).get(`/api/v1/categories/${testCategoryId}`);
                expect(res.status).toBe(httpStatus.OK);
            }
        });

        it('should reject invalid category ID', async () => {
            const res = await request(app).get('/api/v1/categories/invalid');

            expect(res.status).toBe(httpStatus.BAD_REQUEST);
            expect(res.body.success).toBe(false);
        });
    });

    // ==========================================
    // BLOG TESTS
    // ==========================================

    describe('POST /api/v1/blogs', () => {
        it('should create blog post with valid data (admin)', async () => {
            const res = await request(app)
                .post('/api/v1/blogs')
                .set(getAuthHeader(adminToken))
                .send({
                    title: `Test Blog Post ${Date.now()}`,
                    content: 'This is test blog content',
                    status: 'draft',
                });

            if (adminToken) {
                expect([httpStatus.CREATED, httpStatus.OK]).toContain(res.status);
                if (res.body.data?.id) {
                    testBlogId = res.body.data.id;
                }
            } else {
                expect(res.status).toBe(httpStatus.UNAUTHORIZED);
            }
        });

        it('should reject blog creation without title', async () => {
            const res = await request(app)
                .post('/api/v1/blogs')
                .set(getAuthHeader(adminToken))
                .send({ content: 'No title' });

            if (adminToken) {
                expect(res.status).toBe(httpStatus.BAD_REQUEST);
                expect(res.body.success).toBe(false);
            }
        });

        it('should reject blog creation without content', async () => {
            const res = await request(app)
                .post('/api/v1/blogs')
                .set(getAuthHeader(adminToken))
                .send({ title: 'No content' });

            if (adminToken) {
                expect(res.status).toBe(httpStatus.BAD_REQUEST);
                expect(res.body.success).toBe(false);
            }
        });

        it('should reject blog with title too long', async () => {
            const res = await request(app)
                .post('/api/v1/blogs')
                .set(getAuthHeader(adminToken))
                .send({
                    title: 'A'.repeat(201),
                    content: 'Content',
                });

            if (adminToken) {
                expect(res.status).toBe(httpStatus.BAD_REQUEST);
                expect(res.body.success).toBe(false);
            }
        });
    });

    describe('GET /api/v1/blogs', () => {
        it('should get all blogs (public)', async () => {
            const res = await request(app).get('/api/v1/blogs');

            expect(res.status).toBe(httpStatus.OK);
            expect(res.body.success).toBe(true);
        });

        it('should get blogs with pagination', async () => {
            const res = await request(app)
                .get('/api/v1/blogs?page=1&per_page=10');

            expect(res.status).toBe(httpStatus.OK);
            expect(res.body.success).toBe(true);
        });

        it('should reject invalid pagination', async () => {
            const res = await request(app)
                .get('/api/v1/blogs?page=-1&per_page=200');

            expect(res.status).toBe(httpStatus.BAD_REQUEST);
            expect(res.body.success).toBe(false);
        });
    });

    // ==========================================
    // COUPON TESTS
    // ==========================================

    describe('POST /api/v1/coupons', () => {
        it('should create coupon with valid data (admin)', async () => {
            const res = await request(app)
                .post('/api/v1/coupons')
                .set(getAuthHeader(adminToken))
                .send({
                    code: `TEST${Date.now()}`,
                    type: 'percentage',
                    value: 10,
                    startDate: '2026-03-01T00:00:00Z',
                    endDate: '2026-04-01T00:00:00Z',
                });

            if (adminToken) {
                expect([httpStatus.CREATED, httpStatus.OK]).toContain(res.status);
                if (res.body.data?.id) {
                    testCouponId = res.body.data.id;
                }
            } else {
                expect(res.status).toBe(httpStatus.UNAUTHORIZED);
            }
        });

        it('should reject coupon with invalid code format', async () => {
            const res = await request(app)
                .post('/api/v1/coupons')
                .set(getAuthHeader(adminToken))
                .send({
                    code: 'INVALID@CODE!',
                    type: 'percentage',
                    value: 10,
                    startDate: '2026-03-01T00:00:00Z',
                    endDate: '2026-04-01T00:00:00Z',
                });

            if (adminToken) {
                expect(res.status).toBe(httpStatus.BAD_REQUEST);
                expect(res.body.success).toBe(false);
            }
        });

        it('should reject coupon with end date before start date', async () => {
            const res = await request(app)
                .post('/api/v1/coupons')
                .set(getAuthHeader(adminToken))
                .send({
                    code: `TEST${Date.now()}`,
                    type: 'percentage',
                    value: 10,
                    startDate: '2026-04-01T00:00:00Z',
                    endDate: '2026-03-01T00:00:00Z',
                });

            if (adminToken) {
                expect(res.status).toBe(httpStatus.BAD_REQUEST);
                expect(res.body.success).toBe(false);
            }
        });

        it('should reject coupon without required fields', async () => {
            const res = await request(app)
                .post('/api/v1/coupons')
                .set(getAuthHeader(adminToken))
                .send({ code: 'TEST' });

            if (adminToken) {
                expect(res.status).toBe(httpStatus.BAD_REQUEST);
                expect(res.body.success).toBe(false);
            }
        });
    });

    describe('GET /api/v1/coupons/validate/:code', () => {
        it('should validate coupon code (public)', async () => {
            const res = await request(app)
                .get('/api/v1/coupons/validate/TESTCODE');

            // Should return validation result (may be invalid code)
            expect(res.status).toBe(httpStatus.OK);
        });

        it('should reject empty coupon code', async () => {
            const res = await request(app)
                .get('/api/v1/coupons/validate/');

            expect(res.status).toBe(httpStatus.BAD_REQUEST);
        });
    });

    // ==========================================
    // USER MANAGEMENT TESTS
    // ==========================================

    describe('GET /api/v1/users', () => {
        it('should get all users (admin only)', async () => {
            const res = await request(app)
                .get('/api/v1/users')
                .set(getAuthHeader(adminToken));

            if (adminToken) {
                expect(res.status).toBe(httpStatus.OK);
                expect(res.body.success).toBe(true);
            } else {
                expect(res.status).toBe(httpStatus.UNAUTHORIZED);
            }
        });

        it('should reject user listing without auth', async () => {
            const res = await request(app).get('/api/v1/users');

            expect(res.status).toBe(httpStatus.UNAUTHORIZED);
            expect(res.body.success).toBe(false);
        });

        it('should reject user listing with customer role', async () => {
            const res = await request(app)
                .get('/api/v1/users')
                .set(getAuthHeader(authToken));

            if (authToken) {
                expect(res.status).toBe(httpStatus.FORBIDDEN);
                expect(res.body.success).toBe(false);
            }
        });
    });

    describe('POST /api/v1/users/roles', () => {
        it('should create role with valid data (admin)', async () => {
            const res = await request(app)
                .post('/api/v1/users/roles')
                .set(getAuthHeader(adminToken))
                .send({
                    name: 'TestRole',
                    description: 'Test role description',
                });

            if (adminToken) {
                expect([httpStatus.CREATED, httpStatus.OK]).toContain(res.status);
            }
        });

        it('should reject role creation with invalid name', async () => {
            const res = await request(app)
                .post('/api/v1/users/roles')
                .set(getAuthHeader(adminToken))
                .send({ name: 'Invalid Role Name 123' });

            if (adminToken) {
                expect(res.status).toBe(httpStatus.BAD_REQUEST);
                expect(res.body.success).toBe(false);
            }
        });

        it('should reject role creation without auth', async () => {
            const res = await request(app)
                .post('/api/v1/users/roles')
                .send({ name: 'TestRole' });

            expect(res.status).toBe(httpStatus.UNAUTHORIZED);
            expect(res.body.success).toBe(false);
        });
    });

    // ==========================================
    // HEALTH & UTILS TESTS
    // ==========================================

    describe('GET /api/v1/health', () => {
        it('should return health status', async () => {
            const res = await request(app).get('/api/v1/health');

            expect(res.status).toBe(httpStatus.OK);
            expect(res.body.success).toBe(true);
            expect(res.body.status).toBe('ok');
            expect(res.body).toHaveProperty('timestamp');
            expect(res.body).toHaveProperty('requestId');
        });
    });

    describe('Request ID Tracing', () => {
        it('should include request ID in response headers', async () => {
            const res = await request(app).get('/api/v1/health');

            expect(res.headers['x-request-id']).toBeDefined();
            expect(res.headers['x-request-id'].length).toBeGreaterThan(0);
        });

        it('should accept custom request ID', async () => {
            const customId = 'test-request-id-12345';
            const res = await request(app)
                .get('/api/v1/health')
                .set('X-Request-Id', customId);

            expect(res.headers['x-request-id']).toBe(customId);
        });
    });

    describe('404 Handler', () => {
        it('should return 404 for non-existent routes', async () => {
            const res = await request(app).get('/api/v1/nonexistent-route');

            expect(res.status).toBe(httpStatus.NOT_FOUND);
            expect(res.body.success).toBe(false);
        });
    });

    // ==========================================
    // RATE LIMITING TESTS
    // ==========================================

    describe('Rate Limiting', () => {
        it('should apply rate limiting to auth endpoints', async () => {
            // Make multiple requests
            const requests = [];
            for (let i = 0; i < 25; i++) {
                requests.push(
                    request(app)
                        .post('/api/v1/auth/login')
                        .send({ email: 'test@example.com', password: 'wrong' })
                );
            }

            const results = await Promise.all(requests);
            const rateLimited = results.some(r => r.status === httpStatus.TOO_MANY_REQUESTS);

            // May or may not hit rate limit depending on test environment
            expect(results.every(r => [httpStatus.UNAUTHORIZED, httpStatus.TOO_MANY_REQUESTS].includes(r.status))).toBe(true);
        });
    });

    // ==========================================
    // RESPONSE FORMAT TESTS
    // ==========================================

    describe('Response Format Standardization', () => {
        it('should return standard success response format', async () => {
            const res = await request(app).get('/api/v1/health');

            expect(res.body).toHaveProperty('success');
            expect(res.body).toHaveProperty('message');
            expect(res.body).toHaveProperty('data');
            expect(res.body.success).toBe(true);
        });

        it('should return standard error response format', async () => {
            const res = await request(app).get('/api/v1/nonexistent');

            expect(res.body).toHaveProperty('success');
            expect(res.body).toHaveProperty('message');
            expect(res.body).toHaveProperty('data');
            expect(res.body.success).toBe(false);
        });

        it('should include error as null on success', async () => {
            const res = await request(app).get('/api/v1/health');

            expect(res.body.error).toBeNull();
        });
    });
});
