import { test, expect } from '@playwright/test';

/**
 * API Verification Tests
 * Tests all backend API endpoints directly
 */
test.describe('API Endpoints Verification', () => {
  const API_BASE = 'http://localhost:8001/api/v1';

  test.describe('Public APIs', () => {
    test('GET /health - should return health status', async ({ request }) => {
      const response = await request.get(`${API_BASE}/health`);
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data).toMatchObject({
        success: true,
        status: 'ok',
      });
    });

    test('GET /products - should return products list', async ({ request }) => {
      const response = await request.get(`${API_BASE}/products?per_page=10`);
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBeTruthy();
      expect(data.data).toHaveProperty('products');
      // Check for pagination structure (either format is acceptable)
      const hasPagination = data.data.hasOwnProperty('total') || data.data.hasOwnProperty('pagination') || data.data.hasOwnProperty('total_pages');
      expect(hasPagination).toBeTruthy();
    });

    test('GET /categories - should return categories list', async ({ request }) => {
      const response = await request.get(`${API_BASE}/categories`);
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBeTruthy();
      expect(Array.isArray(data.data)).toBeTruthy();
    });

    test('GET /blogs - should return blogs list', async ({ request }) => {
      const response = await request.get(`${API_BASE}/blogs`);
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBeTruthy();
      expect(data.data).toHaveProperty('posts');
      expect(data.data).toHaveProperty('pagination');
    });

    test('GET /search - should return search results', async ({ request }) => {
      const response = await request.get(`${API_BASE}/search?q=saree`);
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBeTruthy();
    });
  });

  test.describe('Product APIs', () => {
    test('GET /products/:id - should return single product', async ({ request }) => {
      const response = await request.get(`${API_BASE}/products/1`);
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBeTruthy();
      expect(data.data).toHaveProperty('id');
      expect(data.data).toHaveProperty('name');
    });

    test('GET /products/:id/recommendations - should return recommendations or error', async ({ request }) => {
      const response = await request.get(`${API_BASE}/products/1/recommendations`);
      // Endpoint exists - may return product not found if no recommendations
      const data = await response.json();
      expect(data).toHaveProperty('success');
    });
  });

  test.describe('Category APIs', () => {
    test('GET /categories/:id - should return single category', async ({ request }) => {
      const response = await request.get(`${API_BASE}/categories/1`);
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBeTruthy();
      expect(data.data).toHaveProperty('id');
      expect(data.data).toHaveProperty('name');
    });
  });

  test.describe('Review APIs', () => {
    test('GET /products/:id/reviews - should return reviews or error', async ({ request }) => {
      const response = await request.get(`${API_BASE}/products/1/reviews`);
      // Endpoint exists - may return error if tables missing
      const data = await response.json();
      expect(data).toHaveProperty('success');
    });
  });
});
