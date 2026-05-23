/**
 * Category Filters API Tests
 * Tests for /api/v1/storefront/categories/:categorySlug/filters
 */

const { request, BACKEND_URL } = require('./setup');

describe('🏷️ Category Filters API', () => {
  describe('GET /api/v1/storefront/categories/:categorySlug/filters', () => {
    
    it('✅ should return category-specific fabrics list and counts', async () => {
      // Use 'women-wear' or 'jewellery' since they exist from our database audit
      const response = await request(BACKEND_URL)
        .get('/api/v1/storefront/categories/women-wear/filters');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('category');
      expect(response.body.data.category).toHaveProperty('slug', 'women-wear');
      expect(response.body.data.category).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('filters');
      expect(response.body.data.filters).toHaveProperty('fabrics');
      expect(Array.isArray(response.body.data.filters.fabrics)).toBe(true);
      
      if (response.body.data.filters.fabrics.length > 0) {
        const fabric = response.body.data.filters.fabrics[0];
        expect(fabric).toHaveProperty('label');
        expect(fabric).toHaveProperty('value');
        expect(fabric).toHaveProperty('count');
        expect(typeof fabric.count).toBe('number');
      }
    });

    it('❌ should return 404 for a non-existent category', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/v1/storefront/categories/non-existent-category-slug/filters');
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('✅ should return normalized fabric values in lowercase and hyphenated', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/v1/storefront/categories/women-wear/filters');
      
      expect(response.status).toBe(200);
      const fabrics = response.body.data.filters.fabrics;
      
      fabrics.forEach(f => {
        expect(f.value).toBe(f.value.toLowerCase().replace(/\s+/g, '-'));
      });
    });

    it('✅ should handle different casings and group them under the same normalized value', async () => {
      // In the database, we have "Pure Banarasi Silk" and "Banarasi" or similar.
      // The test ensures the service performs grouping correctly.
      const response = await request(BACKEND_URL)
        .get('/api/v1/storefront/categories/women-wear/filters');
      
      expect(response.status).toBe(200);
      const fabrics = response.body.data.filters.fabrics;
      
      const values = fabrics.map(f => f.value);
      const uniqueValues = [...new Set(values)];
      
      // Ensure all values are unique (grouped correctly)
      expect(values.length).toBe(uniqueValues.length);
    });

    it('✅ should not return null, undefined, or empty string fabrics', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/v1/storefront/categories/women-wear/filters');
      
      expect(response.status).toBe(200);
      const fabrics = response.body.data.filters.fabrics;
      
      fabrics.forEach(f => {
        expect(f.value).not.toBe('');
        expect(f.value).not.toBe('null');
        expect(f.value).not.toBe('undefined');
        expect(f.value).not.toBe('unknown');
        expect(f.value).not.toBe('n/a');
      });
    });
  });
});
