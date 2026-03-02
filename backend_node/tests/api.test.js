const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');
const config = require('../src/config/config');
const User = require('../src/models/user.model');
const wcClient = require('../src/integrations/woocommerce');
const wpClient = require('../src/integrations/wordpress');

// Mock integrations
jest.mock('../src/integrations/woocommerce');
jest.mock('../src/integrations/wordpress');

describe('API Endpoints Automation Tests', () => {
    let adminToken;

    beforeAll(async () => {
        // Use a test DB or the real one
        await mongoose.connect(config.mongoose.url);

        // Seed admin if not present
        const adminEmail = 'admin-user@example.com';
        const adminPassword = 'AdminPassword123!';

        let admin = await User.findOne({ email: adminEmail });
        if (!admin) {
            admin = await User.create({
                email: adminEmail,
                password: adminPassword,
                name: 'Admin User',
                role: 'admin'
            });
        } else {
            admin.password = adminPassword;
            admin.role = 'admin';
            await admin.save();
        }

        // Login to get token
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: adminEmail, password: adminPassword });

        adminToken = res.body.data.access_token;
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    describe('🔐 Authentication', () => {
        test('POST /auth/login - Success', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({ email: 'admin-user@example.com', password: 'AdminPassword123!' });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('access_token');
        });

        test('POST /auth/login - Failure (Invalid pass)', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({ email: 'admin-user@example.com', password: 'wrong' });
            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });
    });

    describe('🛍️ Products', () => {
        test('GET /products - Success', async () => {
            wcClient.get.mockResolvedValue({ data: [{ id: 1, name: 'Product 1' }] });
            const res = await request(app).get('/api/v1/products');
            expect(res.status).toBe(200);
            expect(res.body.data).toBeInstanceOf(Array);
        });

        test('POST /products - Success (Admin Only)', async () => {
            const payload = {
                name: 'Silk Saree Test',
                description: 'Description',
                price: 5000,
                category: 'Sarees',
                color: 'Gold',
                size: 'Free',
                stock: 10
            };
            wcClient.post.mockResolvedValue({ data: { ...payload, id: 100 } });

            const res = await request(app)
                .post('/api/v1/products')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(payload);

            expect(res.status).toBe(201);
            expect(res.body.data.name).toBe(payload.name);
        });

        test('POST /products - Failure (Missing fields)', async () => {
            const res = await request(app)
                .post('/api/v1/products')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'Incomplete' });
            expect(res.status).toBe(400);
        });

        test('POST /products - Failure (Negative price)', async () => {
            const res = await request(app)
                .post('/api/v1/products')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'Bad Price',
                    description: 'd',
                    price: -10,
                    category: 'c',
                    color: 'r',
                    size: 's',
                    stock: 1
                });
            expect(res.status).toBe(400);
        });

        test('POST /products/categories - Success (Admin Only)', async () => {
            const payload = { name: 'Test Category' };
            wcClient.post.mockResolvedValue({ data: { ...payload, id: 50 } });

            const res = await request(app)
                .post('/api/v1/products/categories')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(payload);

            expect(res.status).toBe(201);
            expect(res.body.data.name).toBe(payload.name);
        });
    });

    describe('📦 Orders & Customers', () => {
        test('GET /orders - Failure (No Auth)', async () => {
            const res = await request(app).get('/api/v1/orders');
            expect(res.status).toBe(401);
        });

        test('GET /orders - Success (Admin)', async () => {
            const res = await request(app)
                .get('/api/v1/orders')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
        });

        test('GET /customers - Success (Admin)', async () => {
            const res = await request(app)
                .get('/api/v1/customers')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
        });
    });

    describe('📰 Blog', () => {
        test('GET /blog/posts - Success', async () => {
            wpClient.get.mockResolvedValue({ data: [{ id: 1, title: 'Blog 1' }] });
            const res = await request(app).get('/api/v1/blog/posts');
            expect(res.status).toBe(200);
        });
    });

    describe('🩺 Health Check', () => {
        test('GET /health - Success', async () => {
            const res = await request(app).get('/api/v1/health');
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ok');
            expect(res.body).toHaveProperty('timestamp');
        });
    });
});
