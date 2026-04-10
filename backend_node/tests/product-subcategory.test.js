/**
 * Product Subcategory Integration Tests
 */

const request = require('supertest');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

describe('Product Subcategory Integration', () => {
  jest.setTimeout(60000);

  let adminToken;
  let testCategoryId;
  let testGroupId;
  let testValueIds = [];
  let testProductId;

  beforeAll(async () => {
    const loginRes = await request(BACKEND_URL)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@shriramya.com', password: 'Admin@123' });

    expect(loginRes.status).toBe(200);
    adminToken = loginRes.body.data?.access_token || loginRes.body.data?.token;
    expect(adminToken).toBeTruthy();

    const catRes = await request(BACKEND_URL)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `TestCategory_${Date.now()}`,
        slug: `test-cat-${Date.now()}`,
        description: 'Test category for subcategories',
      });

    expect(catRes.status).toBe(200);
    testCategoryId = catRes.body.data?.id;
    expect(testCategoryId).toBeTruthy();

    const groupRes = await request(BACKEND_URL)
      .post(`/api/v1/categories/${testCategoryId}/subcategories`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Fabric' });

    expect(groupRes.status).toBe(201);
    testGroupId = groupRes.body.data?.id;
    expect(testGroupId).toBeTruthy();

    const val1 = await request(BACKEND_URL)
      .post(`/api/v1/subcategories/groups/${testGroupId}/values`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Silk', slug: 'silk' });

    const val2 = await request(BACKEND_URL)
      .post(`/api/v1/subcategories/groups/${testGroupId}/values`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Cotton', slug: 'cotton' });

    expect(val1.status).toBe(201);
    expect(val2.status).toBe(201);

    testValueIds = [val1.body.data?.id, val2.body.data?.id].filter(Boolean);
    expect(testValueIds).toHaveLength(2);
  });

  afterAll(async () => {
    if (!adminToken) {
      return;
    }

    if (testProductId) {
      await request(BACKEND_URL)
        .delete(`/api/v1/products/${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    }

    if (testGroupId) {
      await request(BACKEND_URL)
        .delete(`/api/v1/subcategories/groups/${testGroupId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    }

    if (testCategoryId) {
      await request(BACKEND_URL)
        .delete(`/api/v1/categories/${testCategoryId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    }
  });

  it('creates a product with subcategory values', async () => {
    const response = await request(BACKEND_URL)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `SubcatTestProduct_${Date.now()}`,
        description: 'A product with subcategories',
        basePrice: 500,
        status: 'draft',
        categories: [testCategoryId],
        subcategoryValueIds: testValueIds,
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.subcategories).toHaveLength(2);

    testProductId = response.body.data.id;
  });

  it('returns subcategory values from GET /products/:id', async () => {
    const response = await request(BACKEND_URL)
      .get(`/api/v1/products/${testProductId}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data.subcategories)).toBe(true);
    expect(response.body.data.subcategories).toHaveLength(2);

    const names = response.body.data.subcategories.map((subcategory) => subcategory.name);
    expect(names).toContain('Silk');
    expect(names).toContain('Cotton');
  });

  it('updates product subcategory values', async () => {
    const response = await request(BACKEND_URL)
      .put(`/api/v1/products/${testProductId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ subcategoryValueIds: [testValueIds[0]] });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.subcategories).toHaveLength(1);
    expect(response.body.data.subcategories[0].name).toBe('Silk');

    const getRes = await request(BACKEND_URL)
      .get(`/api/v1/products/${testProductId}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.subcategories).toHaveLength(1);
    expect(getRes.body.data.subcategories[0].name).toBe('Silk');
  });

  it('clears product subcategory values when an empty array is provided', async () => {
    const response = await request(BACKEND_URL)
      .put(`/api/v1/products/${testProductId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ subcategoryValueIds: [] });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.subcategories).toEqual([]);

    const getRes = await request(BACKEND_URL)
      .get(`/api/v1/products/${testProductId}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.subcategories).toEqual([]);
  });
});
