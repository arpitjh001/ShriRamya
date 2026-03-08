const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');
const config = require('../src/config/config');
const User = require('../src/models/user.model');

describe('API Endpoints Automation Tests (Native)', () => {
    let adminToken;

    beforeAll(async () => {
        // Use a test DB (ensure we don't wipe production)
        const dbUrl = config.mongoose.url.includes('test') ? config.mongoose.url : `${config.mongoose.url}_test`;
        await mongoose.connect(dbUrl);

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

    describe('🛍️ Products (Native)', () => {
        test('GET /products - Success', async () => {
            const res = await request(app).get('/api/v1/products');
            expect(res.status).toBe(200);
            expect(res.body.data).toBeInstanceOf(Array);
        });

        test('POST /products - Failure (Missing fields)', async () => {
            const res = await request(app)
                .post('/api/v1/products')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'Incomplete' });
            expect(res.status).toBe(400);
        });
    });

    describe('📦 Orders & Customers (Native)', () => {
        test('GET /orders/my - Failure (No Auth)', async () => {
            const res = await request(app).get('/api/v1/orders/my');
            expect(res.status).toBe(401);
        });

        test('GET /orders/admin/all - Success (Admin)', async () => {
            const res = await request(app)
                .get('/api/v1/orders/admin/all')
                .set('Authorization', `Bearer ${adminToken}`);
            // Note: status 200 assumed if DB is connected and empty or has data
            expect(res.status).toBe(200);
        });

        test('GET /customers - Success (Admin)', async () => {
            const res = await request(app)
                .get('/api/v1/customers')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
        });
    });

    describe('📰 Blog (Native)', () => {
        test('GET /blogs - Success', async () => {
            const res = await request(app).get('/api/v1/blogs');
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
