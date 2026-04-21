/**
 * Tenant Isolation Test Suite
 * Tests multi-tenant data separation and security
 */

const request = require('supertest');
const app = require('../src/app');
const { mysqlPool } = require('../src/config/db');

// Test data
let tenant1AdminToken = '';
let tenant2AdminToken = '';
let tenant1ProductId = null;
let tenant2ProductId = null;

const TENANT_1_ID = 1;
const TENANT_2_ID = 2;

describe('Tenant Isolation Security Tests', () => {
    beforeAll(async () => {
        await setupTenants();
    });

    afterAll(async () => {
        await cleanupTestData();
    });

    describe('Cross-Tenant Data Access Tests', () => {
        it('Tenant 1 admin should create product in Tenant 1', async () => {
            const res = await request(app)
                .post('/api/v1/products')
                .set('Authorization', `Bearer ${tenant1AdminToken}`)
                .send({
                    name: 'Tenant 1 Product',
                    sku: 'T1-PROD-001',
                    basePrice: 999,
                    description: 'Product for Tenant 1'
                });

            expect(res.body.success).toBe(true);
            tenant1ProductId = res.body.data?.id || res.body.data?.productId;
            
            // Verify product has correct tenant_id
            const [rows] = await mysqlPool.query(
                'SELECT tenant_id FROM products WHERE id = ?',
                [tenant1ProductId]
            );
            expect(rows[0]?.tenant_id).toBe(TENANT_1_ID);
        });

        it('Tenant 2 admin should create product in Tenant 2', async () => {
            const res = await request(app)
                .post('/api/v1/products')
                .set('Authorization', `Bearer ${tenant2AdminToken}`)
                .send({
                    name: 'Tenant 2 Product',
                    sku: 'T2-PROD-001',
                    basePrice: 599,
                    description: 'Product for Tenant 2'
                });

            expect(res.body.success).toBe(true);
            tenant2ProductId = res.body.data?.id || res.body.data?.productId;
            
            // Verify product has correct tenant_id
            const [rows] = await mysqlPool.query(
                'SELECT tenant_id FROM products WHERE id = ?',
                [tenant2ProductId]
            );
            expect(rows[0]?.tenant_id).toBe(TENANT_2_ID);
        });

        it('Tenant 1 admin should NOT see Tenant 2 products', async () => {
            const res = await request(app)
                .get('/api/v1/products')
                .set('Authorization', `Bearer ${tenant1AdminToken}`);

            expect(res.body.success).toBe(true);
            
            const products = res.body.data?.products || res.body.data || [];
            expect(Array.isArray(products)).toBe(true);
            
            // Should NOT contain Tenant 2's product
            const tenant2Product = products.find(p => p.id === tenant2ProductId);
            expect(tenant2Product).toBeUndefined();
        });

        it('Tenant 2 admin should NOT see Tenant 1 products', async () => {
            const res = await request(app)
                .get('/api/v1/products')
                .set('Authorization', `Bearer ${tenant2AdminToken}`);

            expect(res.body.success).toBe(true);
            
            const products = res.body.data?.products || res.body.data || [];
            expect(Array.isArray(products)).toBe(true);
            
            // Should NOT contain Tenant 1's product
            const tenant1Product = products.find(p => p.id === tenant1ProductId);
            expect(tenant1Product).toBeUndefined();
        });

        it('Tenant 1 admin should NOT access Tenant 2 product by ID', async () => {
            if (!tenant2ProductId) return;

            const res = await request(app)
                .get(`/api/v1/products/${tenant2ProductId}`)
                .set('Authorization', `Bearer ${tenant1AdminToken}`);

            // Should return 404 (not found) since product doesn't exist in Tenant 1
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('not found');
        });

        it('Tenant 2 admin should NOT access Tenant 1 product by ID', async () => {
            if (!tenant1ProductId) return;

            const res = await request(app)
                .get(`/api/v1/products/${tenant1ProductId}`)
                .set('Authorization', `Bearer ${tenant2AdminToken}`);

            // Should return 404 (not found) since product doesn't exist in Tenant 2
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('not found');
        });

        it('Tenant 1 admin should NOT update Tenant 2 product', async () => {
            if (!tenant2ProductId) return;

            const res = await request(app)
                .put(`/api/v1/products/${tenant2ProductId}`)
                .set('Authorization', `Bearer ${tenant1AdminToken}`)
                .send({ name: 'Hacked Product Name' });

            expect(res.body.success).toBe(false);
        });

        it('Tenant 2 admin should NOT delete Tenant 1 product', async () => {
            if (!tenant1ProductId) return;

            const res = await request(app)
                .delete(`/api/v1/products/${tenant1ProductId}`)
                .set('Authorization', `Bearer ${tenant2AdminToken}`);

            expect(res.body.success).toBe(false);
            
            // Verify product still exists
            const [rows] = await mysqlPool.query(
                'SELECT id FROM products WHERE id = ?',
                [tenant1ProductId]
            );
            expect(rows.length).toBe(1);
        });
    });

    describe('Blog Tenant Isolation Tests', () => {
        let tenant1BlogId = null;
        let tenant2BlogId = null;

        it('Tenant 1 editor should create blog in Tenant 1', async () => {
            const res = await request(app)
                .post('/api/v1/blogs')
                .set('Authorization', `Bearer ${tenant1AdminToken}`)
                .send({
                    title: 'Tenant 1 Blog',
                    slug: 'tenant-1-blog',
                    content: 'Blog content for Tenant 1',
                    status: 'published'
                });

            expect(res.body.success).toBe(true);
            tenant1BlogId = res.body.data?.id;
        });

        it('Tenant 2 editor should create blog in Tenant 2', async () => {
            const res = await request(app)
                .post('/api/v1/blogs')
                .set('Authorization', `Bearer ${tenant2AdminToken}`)
                .send({
                    title: 'Tenant 2 Blog',
                    slug: 'tenant-2-blog',
                    content: 'Blog content for Tenant 2',
                    status: 'published'
                });

            expect(res.body.success).toBe(true);
            tenant2BlogId = res.body.data?.id;
        });

        it('Tenant 1 should NOT see Tenant 2 blogs', async () => {
            const res = await request(app)
                .get('/api/v1/blogs')
                .set('Authorization', `Bearer ${tenant1AdminToken}`);

            expect(res.body.success).toBe(true);
            
            const blogs = res.body.data?.posts || res.body.data || [];
            expect(Array.isArray(blogs)).toBe(true);
            
            // Should NOT contain Tenant 2's blog
            const tenant2Blog = blogs.find(b => b.id === tenant2BlogId);
            expect(tenant2Blog).toBeUndefined();
        });

        it('Tenant 2 should NOT see Tenant 1 blogs', async () => {
            const res = await request(app)
                .get('/api/v1/blogs')
                .set('Authorization', `Bearer ${tenant2AdminToken}`);

            expect(res.body.success).toBe(true);
            
            const blogs = res.body.data?.posts || res.body.data || [];
            expect(Array.isArray(blogs)).toBe(true);
            
            // Should NOT contain Tenant 1's blog
            const tenant1Blog = blogs.find(b => b.id === tenant1BlogId);
            expect(tenant1Blog).toBeUndefined();
        });

        it('Tenant 1 should NOT update Tenant 2 blog', async () => {
            if (!tenant2BlogId) return;

            const res = await request(app)
                .put(`/api/v1/blogs/${tenant2BlogId}`)
                .set('Authorization', `Bearer ${tenant1AdminToken}`)
                .send({ title: 'Hacked Blog Title' });

            expect(res.body.success).toBe(false);
        });

        it('Tenant 2 should NOT delete Tenant 1 blog', async () => {
            if (!tenant1BlogId) return;

            const res = await request(app)
                .delete(`/api/v1/blogs/${tenant1BlogId}`)
                .set('Authorization', `Bearer ${tenant2AdminToken}`);

            expect(res.body.success).toBe(false);
        });
    });

    describe('Tenant Settings Isolation Tests', () => {
        it('Tenant 1 should have isolated settings', async () => {
            const res = await request(app)
                .get('/api/v1/tenants/settings')
                .set('Authorization', `Bearer ${tenant1AdminToken}`);

            expect(res.body.success).toBe(true);
        });

        it('Tenant 2 should have isolated settings', async () => {
            const res = await request(app)
                .get('/api/v1/tenants/settings')
                .set('Authorization', `Bearer ${tenant2AdminToken}`);

            expect(res.body.success).toBe(true);
        });
    });
});

/**
 * Setup test tenants and users
 */
async function setupTenants() {
    try {
        const jwt = require('jsonwebtoken');
        const config = require('../src/config/config');

        // Ensure Tenant 2 exists for testing
        const [tenants] = await mysqlPool.query('SELECT id FROM tenants WHERE id = ?', [TENANT_2_ID]);
        
        if (tenants.length === 0) {
            await mysqlPool.query(
                'INSERT INTO tenants (id, name, domain, status) VALUES (?, ?, ?, ?)',
                [TENANT_2_ID, 'Test Store 2', 'test2.local', 'active']
            );
        }

        // Create Tenant 1 admin token
        tenant1AdminToken = jwt.sign(
            {
                user_id: 'tenant1_admin',
                tenant_id: TENANT_1_ID,
                roles: ['Admin'],
                permissions: ['manage_products', 'manage_blogs', 'delete_product']
            },
            config.jwt.secret,
            { expiresIn: '1h' }
        );

        // Create Tenant 2 admin token
        tenant2AdminToken = jwt.sign(
            {
                user_id: 'tenant2_admin',
                tenant_id: TENANT_2_ID,
                roles: ['Admin'],
                permissions: ['manage_products', 'manage_blogs', 'delete_product']
            },
            config.jwt.secret,
            { expiresIn: '1h' }
        );

        console.log('✓ Test tenants setup complete');
    } catch (error) {
        console.error('Error setting up tenants:', error.message);
    }
}

/**
 * Cleanup test data
 */
async function cleanupTestData() {
    try {
        // Delete test products
        if (tenant1ProductId) {
            await mysqlPool.query('DELETE FROM products WHERE id = ?', [tenant1ProductId]);
        }
        if (tenant2ProductId) {
            await mysqlPool.query('DELETE FROM products WHERE id = ?', [tenant2ProductId]);
        }

        // Delete test blogs
        await mysqlPool.query("DELETE FROM blogs WHERE slug IN ('tenant-1-blog', 'tenant-2-blog')");

        console.log('✓ Tenant isolation test data cleaned up');
    } catch (error) {
        console.error('Error cleaning up test data:', error.message);
    }
}
