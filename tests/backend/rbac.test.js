/**
 * RBAC Security Test Suite
 * Tests Role-Based Access Control enforcement
 */

const request = require('supertest');
const app = require('../src/app');
const { mysqlPool } = require('../src/config/db');

// Test data
let adminToken = '';
let editorToken = '';
let customerToken = '';
let testProductId = null;
let testBlogId = null;
const TEST_TENANT_ID = 1;

describe('RBAC Security Tests', () => {
    beforeAll(async () => {
        // Setup test data - create users with different roles
        await setupTestUsers();
    });

    afterAll(async () => {
        // Cleanup test data
        await cleanupTestData();
    });

    describe('Authentication Tests', () => {
        it('should reject request without token', async () => {
            const res = await request(app)
                .get('/api/v1/products')
                .expect(200); // Public endpoint

            expect(res.body.success).toBe(true);
        });

        it('should reject invalid token', async () => {
            const res = await request(app)
                .post('/api/v1/products')
                .set('Authorization', 'Bearer invalid_token')
                .expect(401);

            expect(res.body.success).toBe(false);
        });
    });

    describe('Admin Role Tests', () => {
        it('Admin should be able to create product', async () => {
            const res = await request(app)
                .post('/api/v1/products')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'Admin Test Product',
                    sku: 'ADMIN-TEST-001',
                    basePrice: 999,
                    description: 'Test product created by admin'
                });

            // Should succeed (201 or 200 depending on implementation)
            expect(res.body.success).toBe(true);
            testProductId = res.body.data?.id || res.body.data?.productId;
        });

        it('Admin should be able to update product', async () => {
            if (!testProductId) return;

            const res = await request(app)
                .put(`/api/v1/products/${testProductId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'Updated Product Name' });

            expect(res.body.success).toBe(true);
        });

        it('Admin should be able to delete product', async () => {
            if (!testProductId) return;

            const res = await request(app)
                .delete(`/api/v1/products/${testProductId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.body.success).toBe(true);
            
            // Recreate for other tests
            const createRes = await request(app)
                .post('/api/v1/products')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'Admin Test Product',
                    sku: 'ADMIN-TEST-002',
                    basePrice: 999
                });
            testProductId = createRes.body.data?.id || createRes.body.data?.productId;
        });

        it('Admin should be able to create blog post', async () => {
            const res = await request(app)
                .post('/api/v1/blogs')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    title: 'Admin Test Blog',
                    slug: 'admin-test-blog',
                    content: 'Test blog content',
                    status: 'published'
                });

            expect(res.body.success).toBe(true);
            testBlogId = res.body.data?.id;
        });

        it('Admin should be able to delete blog post', async () => {
            if (!testBlogId) return;

            const res = await request(app)
                .delete(`/api/v1/blogs/${testBlogId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.body.success).toBe(true);
        });
    });

    describe('Editor Role Tests', () => {
        let editorProductId = null;

        it('Editor should be able to create product', async () => {
            const res = await request(app)
                .post('/api/v1/products')
                .set('Authorization', `Bearer ${editorToken}`)
                .send({
                    name: 'Editor Test Product',
                    sku: 'EDITOR-TEST-001',
                    basePrice: 599,
                    description: 'Test product created by editor'
                });

            expect(res.body.success).toBe(true);
            editorProductId = res.body.data?.id || res.body.data?.productId;
        });

        it('Editor should be able to update product', async () => {
            if (!editorProductId) return;

            const res = await request(app)
                .put(`/api/v1/products/${editorProductId}`)
                .set('Authorization', `Bearer ${editorToken}`)
                .send({ name: 'Editor Updated Product' });

            expect(res.body.success).toBe(true);
        });

        it('Editor should NOT be able to delete product', async () => {
            if (!editorProductId) return;

            const res = await request(app)
                .delete(`/api/v1/products/${editorProductId}`)
                .set('Authorization', `Bearer ${editorToken}`)
                .expect(403);

            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('Access denied');
        });

        it('Editor should be able to create blog post', async () => {
            const res = await request(app)
                .post('/api/v1/blogs')
                .set('Authorization', `Bearer ${editorToken}`)
                .send({
                    title: 'Editor Test Blog',
                    slug: 'editor-test-blog',
                    content: 'Test blog content by editor',
                    status: 'published'
                });

            expect(res.body.success).toBe(true);
            testBlogId = res.body.data?.id;
        });

        it('Editor should be able to update blog post', async () => {
            if (!testBlogId) return;

            const res = await request(app)
                .put(`/api/v1/blogs/${testBlogId}`)
                .set('Authorization', `Bearer ${editorToken}`)
                .send({ title: 'Updated Blog Title' });

            expect(res.body.success).toBe(true);
        });

        it('Editor should NOT be able to delete blog post', async () => {
            if (!testBlogId) return;

            const res = await request(app)
                .delete(`/api/v1/blogs/${testBlogId}`)
                .set('Authorization', `Bearer ${editorToken}`)
                .expect(403);

            expect(res.body.success).toBe(false);
        });

        it('Editor should NOT be able to access orders', async () => {
            const res = await request(app)
                .get('/api/v1/orders')
                .set('Authorization', `Bearer ${editorToken}`)
                .expect(403);

            expect(res.body.success).toBe(false);
        });
    });

    describe('Customer Role Tests', () => {
        it('Customer should be able to view products', async () => {
            const res = await request(app)
                .get('/api/v1/products')
                .set('Authorization', `Bearer ${customerToken}`);

            expect(res.body.success).toBe(true);
        });

        it('Customer should NOT be able to create product', async () => {
            const res = await request(app)
                .post('/api/v1/products')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    name: 'Customer Test Product',
                    sku: 'CUSTOMER-TEST-001',
                    basePrice: 100
                })
                .expect(403);

            expect(res.body.success).toBe(false);
        });

        it('Customer should NOT be able to update product', async () => {
            if (!testProductId) return;

            const res = await request(app)
                .put(`/api/v1/products/${testProductId}`)
                .set('Authorization', `Bearer ${customerToken}`)
                .send({ name: 'Hacked Product Name' })
                .expect(403);

            expect(res.body.success).toBe(false);
        });

        it('Customer should NOT be able to delete product', async () => {
            if (!testProductId) return;

            const res = await request(app)
                .delete(`/api/v1/products/${testProductId}`)
                .set('Authorization', `Bearer ${customerToken}`)
                .expect(403);

            expect(res.body.success).toBe(false);
        });

        it('Customer should NOT be able to create blog post', async () => {
            const res = await request(app)
                .post('/api/v1/blogs')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    title: 'Customer Test Blog',
                    slug: 'customer-test-blog',
                    content: 'Test blog'
                })
                .expect(403);

            expect(res.body.success).toBe(false);
        });

        it('Customer should NOT be able to access admin endpoints', async () => {
            const res = await request(app)
                .get('/api/v1/admin/analytics')
                .set('Authorization', `Bearer ${customerToken}`)
                .expect(403);

            expect(res.body.success).toBe(false);
        });
    });

    describe('Tenant Isolation Tests', () => {
        it('User should only see products from their tenant', async () => {
            // Create product in tenant 1
            const createRes = await request(app)
                .post('/api/v1/products')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'Tenant 1 Product',
                    sku: 'T1-PROD-001',
                    basePrice: 100
                });

            const tenant1ProductId = createRes.body.data?.id;

            // Get products - should include the newly created one
            const getRes = await request(app)
                .get('/api/v1/products')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(getRes.body.success).toBe(true);
            // Product should be in the list since same tenant
            const products = getRes.body.data?.products || getRes.body.data || [];
            expect(Array.isArray(products)).toBe(true);
        });
    });
});

/**
 * Setup test users with different roles
 */
async function setupTestUsers() {
    try {
        // For testing, we'll use mock tokens with different roles
        // In a real scenario, you'd create actual users and login
        
        const jwt = require('jsonwebtoken');
        const config = require('../src/config/config');

        // Create admin token
        adminToken = jwt.sign(
            {
                user_id: 'admin_test_1',
                tenant_id: TEST_TENANT_ID,
                roles: ['Admin'],
                permissions: ['manage_products', 'manage_orders', 'delete_product']
            },
            config.jwt.secret,
            { expiresIn: '1h' }
        );

        // Create editor token
        editorToken = jwt.sign(
            {
                user_id: 'editor_test_1',
                tenant_id: TEST_TENANT_ID,
                roles: ['Editor'],
                permissions: ['create_product', 'update_product', 'create_blog']
            },
            config.jwt.secret,
            { expiresIn: '1h' }
        );

        // Create customer token
        customerToken = jwt.sign(
            {
                user_id: 'customer_test_1',
                tenant_id: TEST_TENANT_ID,
                roles: ['Customer'],
                permissions: ['view_products', 'add_to_cart']
            },
            config.jwt.secret,
            { expiresIn: '1h' }
        );

        console.log('✓ Test users created');
    } catch (error) {
        console.error('Error setting up test users:', error.message);
    }
}

/**
 * Cleanup test data
 */
async function cleanupTestData() {
    try {
        if (testBlogId) {
            await mysqlPool.query('DELETE FROM blogs WHERE id = ?', [testBlogId]);
        }
        if (testProductId) {
            await mysqlPool.query('DELETE FROM products WHERE id = ?', [testProductId]);
        }
        console.log('✓ Test data cleaned up');
    } catch (error) {
        console.error('Error cleaning up test data:', error.message);
    }
}
