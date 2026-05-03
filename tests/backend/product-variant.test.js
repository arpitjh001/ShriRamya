/**
 * Product and Variant Integration Tests
 * Comprehensive tests for product/variant management, inventory, and API endpoints
 */

const request = require('supertest');
const { mysqlPool } = require('../src/config/db');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

// Test utilities
const testUtils = {
  async getAdminToken() {
    const res = await request(BACKEND_URL)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@shriramya.com', password: 'Admin@123' });
    return res.body.data?.token;
  },

  async cleanupTestProducts(adminToken) {
    // Get all test products
    const listRes = await request(BACKEND_URL)
      .get('/api/v1/products')
      .query({ search: 'TEST_PRODUCT_' });

    if (listRes.body.data?.products) {
      for (const product of listRes.body.data.products) {
        await request(BACKEND_URL)
          .delete(`/api/v1/products/${product.id}`)
          .set('Authorization', `Bearer ${adminToken}`);
      }
    }
  },
};

describe('🛍️ Product & Variant System - Integration Tests', () => {
  let adminToken;
  let testProductId;
  let testVariantId;

  beforeAll(async () => {
    adminToken = await testUtils.getAdminToken();
  });

  afterAll(async () => {
    // Cleanup test data
    if (adminToken) {
      await testUtils.cleanupTestProducts(adminToken);
    }
  });

  describe('📦 Product CRUD Operations', () => {
    const testProduct = {
      name: `TEST_PRODUCT_Classic Cotton T-Shirt_${Date.now()}`,
      description: 'Premium quality cotton t-shirt for everyday wear',
      fabric: '100% Cotton',
      occasion: 'Casual',
      basePrice: 999,
      status: 'published',
      images: [
        'https://example.com/images/tshirt-front.jpg',
        'https://example.com/images/tshirt-back.jpg'
      ],
      metaTitle: 'Classic Cotton T-Shirt - Comfortable & Stylish',
      metaDescription: 'Shop our premium cotton t-shirt for ultimate comfort',
      metaKeywords: 'cotton, t-shirt, casual, comfortable'
    };

    it('✅ should create product with auto-generated slug', async () => {
      const response = await request(BACKEND_URL)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testProduct);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(testProduct.name);
      expect(response.body.data).toHaveProperty('slug');
      expect(response.body.data.slug).toMatch(/classic-cotton-t-shirt/);

      testProductId = response.body.data.id;
    });

    it('✅ should create product with custom slug', async () => {
      const customSlugProduct = {
        name: `TEST_PRODUCT_Custom Slug_${Date.now()}`,
        slug: 'my-custom-product-slug',
        basePrice: 1499,
        status: 'draft'
      };

      const response = await request(BACKEND_URL)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(customSlugProduct);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.slug).toBe('my-custom-product-slug');
    });

    it('✅ should update product and regenerate slug when name changes', async () => {
      const updateData = {
        name: `TEST_PRODUCT_Updated Name_${Date.now()}`,
        description: 'Updated description'
      };

      const response = await request(BACKEND_URL)
        .put(`/api/v1/products/${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.description).toBe(updateData.description);
    });

    it('✅ should update product SEO fields', async () => {
      const seoData = {
        metaTitle: 'Updated SEO Title',
        metaDescription: 'Updated SEO description for better search ranking',
        metaKeywords: 'updated, keywords, seo'
      };

      const response = await request(BACKEND_URL)
        .put(`/api/v1/products/${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(seoData);

      expect(response.status).toBe(200);
      expect(response.body.data.metaTitle).toBe(seoData.metaTitle);
    });

    it('✅ should soft delete product', async () => {
      // First create a product to delete
      const productToDelete = {
        name: `TEST_PRODUCT_To Delete_${Date.now()}`,
        basePrice: 599,
        status: 'draft'
      };

      const createRes = await request(BACKEND_URL)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(productToDelete);

      const deleteProductId = createRes.body.data.id;

      // Soft delete
      const deleteRes = await request(BACKEND_URL)
        .delete(`/api/v1/products/${deleteProductId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);

      // Verify product is not in public listing
      const listRes = await request(BACKEND_URL)
        .get('/api/v1/products')
        .query({ search: productToDelete.name });

      expect(listRes.body.data.products).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ id: deleteProductId })])
      );
    });
  });

  describe('🎨 Variant Management', () => {
    let localProductId;

    beforeAll(async () => {
      // Create a product for variant testing
      const product = {
        name: `TEST_PRODUCT_Variant Test Product_${Date.now()}`,
        description: 'Product for variant testing',
        basePrice: 1299,
        status: 'published'
      };

      const res = await request(BACKEND_URL)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(product);

      localProductId = res.body.data.id;
    });

    it('✅ should add single variant to product', async () => {
      const variant = {
        sku: `TEST-SKU-M-BLUE-${Date.now()}`,
        color: 'Blue',
        size: 'M',
        price: 1299,
        stock: 50,
        attributes: { color: 'Blue', size: 'M' }
      };

      const response = await request(BACKEND_URL)
        .post(`/api/v1/products/${localProductId}/variants`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(variant);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.sku).toBe(variant.sku);
      expect(response.body.data.color).toBe(variant.color);
      expect(response.body.data.size).toBe(variant.size);

      testVariantId = response.body.data.id;
    });

    it('✅ should auto-generate SKU if not provided', async () => {
      const variant = {
        color: 'Red',
        size: 'L',
        price: 1299,
        stock: 30,
        attributes: { color: 'Red', size: 'L' }
      };

      const response = await request(BACKEND_URL)
        .post(`/api/v1/products/${localProductId}/variants`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(variant);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('sku');
      expect(response.body.data.sku).toMatch(/^SR-/);
    });

    it('✅ should reject duplicate SKU', async () => {
      const duplicateVariant = {
        sku: `TEST-SKU-M-BLUE-${Date.now()}`,
        color: 'Green',
        size: 'S',
        price: 1299,
        stock: 20
      };

      // First creation should succeed
      await request(BACKEND_URL)
        .post(`/api/v1/products/${localProductId}/variants`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(duplicateVariant);

      // Second creation with same SKU should fail
      const response = await request(BACKEND_URL)
        .post(`/api/v1/products/${localProductId}/variants`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(duplicateVariant);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('SKU');
    });

    it('✅ should update variant', async () => {
      const updateData = {
        price: 1499,
        stock: 45,
        discountPrice: 1299,
        discountStart: new Date().toISOString(),
        discountEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };

      const response = await request(BACKEND_URL)
        .put(`/api/v1/products/${localProductId}/variants/${testVariantId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.data.price).toBe(updateData.price);
      expect(response.body.data.stock).toBe(updateData.stock);
      expect(response.body.data.discountPrice).toBe(updateData.discountPrice);
    });

    it('✅ should delete variant', async () => {
      // Create a variant to delete
      const variantToDelete = {
        sku: `TEST-SKU-DELETE-${Date.now()}`,
        color: 'Yellow',
        size: 'XL',
        stock: 10
      };

      const createRes = await request(BACKEND_URL)
        .post(`/api/v1/products/${localProductId}/variants`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(variantToDelete);

      const variantIdToDelete = createRes.body.data.id;

      // Delete
      const deleteRes = await request(BACKEND_URL)
        .delete(`/api/v1/products/${localProductId}/variants/${variantIdToDelete}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);
    });
  });

  describe('🔢 Variant Matrix Operations', () => {
    let matrixProductId;

    beforeAll(async () => {
      const product = {
        name: `TEST_PRODUCT_Matrix Test_${Date.now()}`,
        description: 'Product for matrix testing',
        basePrice: 1999,
        status: 'published'
      };

      const res = await request(BACKEND_URL)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(product);

      matrixProductId = res.body.data.id;
    });

    it('✅ should sync variant matrix (bulk create)', async () => {
      const variants = [
        { color: 'Black', size: 'S', stock: 20, price: 1999 },
        { color: 'Black', size: 'M', stock: 30, price: 1999 },
        { color: 'Black', size: 'L', stock: 25, price: 1999 },
        { color: 'White', size: 'S', stock: 15, price: 1999 },
        { color: 'White', size: 'M', stock: 35, price: 1999 },
        { color: 'White', size: 'L', stock: 20, price: 1999 },
      ];

      const response = await request(BACKEND_URL)
        .put(`/api/v1/products/${matrixProductId}/variants/matrix`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ variants });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.variants).toHaveLength(6);
    });

    it('✅ should get variant matrix', async () => {
      const response = await request(BACKEND_URL)
        .get(`/api/v1/products/${matrixProductId}/variants/matrix`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('productId');
      expect(response.body.data).toHaveProperty('variants');
      expect(response.body.data.variants.length).toBeGreaterThan(0);
    });

    it('✅ should get available colors', async () => {
      const response = await request(BACKEND_URL)
        .get(`/api/v1/products/${matrixProductId}/variants/colors`);

      expect(response.status).toBe(200);
      expect(response.body.data.colors).toEqual(
        expect.arrayContaining(['Black', 'White'])
      );
    });

    it('✅ should get available sizes filtered by color', async () => {
      const response = await request(BACKEND_URL)
        .get(`/api/v1/products/${matrixProductId}/variants/sizes?color=Black`);

      expect(response.status).toBe(200);
      expect(response.body.data.sizes).toEqual(
        expect.arrayContaining(['S', 'M', 'L'])
      );
    });

    it('✅ should get variant stock by color and size', async () => {
      const response = await request(BACKEND_URL)
        .get(`/api/v1/products/${matrixProductId}/variants/stock?color=Black&size=M`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('stock');
      expect(response.body.data.stock).toBe(30);
      expect(response.body.data.found).toBe(true);
    });

    it('✅ should validate stock availability', async () => {
      const response = await request(BACKEND_URL)
        .get(`/api/v1/products/${matrixProductId}/variants/validate-stock?color=Black&size=M&quantity=5`);

      expect(response.status).toBe(200);
      expect(response.body.data.valid).toBe(true);
      expect(response.body.data.available).toBe(30);
    });

    it('✅ should reject invalid stock validation (quantity > stock)', async () => {
      const response = await request(BACKEND_URL)
        .get(`/api/v1/products/${matrixProductId}/variants/validate-stock?color=Black&size=M&quantity=100`);

      expect(response.status).toBe(200);
      expect(response.body.data.valid).toBe(false);
      expect(response.body.data.available).toBe(30);
      expect(response.body.data.requested).toBe(100);
    });

    it('✅ should update variant stock level', async () => {
      // Get a variant ID first
      const matrixRes = await request(BACKEND_URL)
        .get(`/api/v1/products/${matrixProductId}/variants/matrix`);

      const variantId = matrixRes.body.data.variants[0].id;

      const response = await request(BACKEND_URL)
        .put(`/api/v1/products/${matrixProductId}/variants/${variantId}/stock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ stockLevel: 100 });

      expect(response.status).toBe(200);
      expect(response.body.data.stock).toBe(100);
    });

    it('✅ should get low stock variants', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/v1/products/variants/low-stock?threshold=25')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('📊 Product Listing & Filtering', () => {
    it('✅ should list products with pagination', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/v1/products')
        .query({ page: 1, per_page: 10 });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('products');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('page');
      expect(response.body.data).toHaveProperty('perPage');
      expect(response.body.data.products.length).toBeLessThanOrEqual(10);
    });

    it('✅ should filter products by status', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/v1/products')
        .query({ status: 'published' });

      expect(response.status).toBe(200);
      expect(response.body.data.products.every(p => p.status === 'published')).toBe(true);
    });

    it('✅ should filter products by category', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/v1/products')
        .query({ category: 'sarees' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('✅ should search products', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/v1/products')
        .query({ search: 'cotton' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('✅ should filter by price range', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/v1/products')
        .query({ min_price: 500, max_price: 5000 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('✅ should include variants in product details', async () => {
      const response = await request(BACKEND_URL)
        .get(`/api/v1/products/${testProductId}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('variants');
      expect(Array.isArray(response.body.data.variants)).toBe(true);
    });

    it('✅ should include categories in product details', async () => {
      const response = await request(BACKEND_URL)
        .get(`/api/v1/products/${testProductId}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('categories');
      expect(Array.isArray(response.body.data.categories)).toBe(true);
    });
  });

  describe('🔒 Authorization & RBAC', () => {
    it('❌ should reject product creation without auth', async () => {
      const response = await request(BACKEND_URL)
        .post('/api/v1/products')
        .send({ name: 'Unauthorized Product', basePrice: 999 });

      expect(response.status).toBe(401);
    });

    it('❌ should reject product update without auth', async () => {
      const response = await request(BACKEND_URL)
        .put(`/api/v1/products/${testProductId}`)
        .send({ name: 'Unauthorized Update' });

      expect(response.status).toBe(401);
    });

    it('❌ should reject product deletion without auth', async () => {
      const response = await request(BACKEND_URL)
        .delete(`/api/v1/products/${testProductId}`);

      expect(response.status).toBe(401);
    });

    it('❌ should reject variant creation without auth', async () => {
      const response = await request(BACKEND_URL)
        .post(`/api/v1/products/${testProductId}/variants`)
        .send({ sku: 'UNAUTH-SKU', stock: 10 });

      expect(response.status).toBe(401);
    });

    it('✅ should allow public product listing', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/v1/products');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('✅ should allow public product details', async () => {
      const response = await request(BACKEND_URL)
        .get(`/api/v1/products/${testProductId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('📝 Input Validation', () => {
    it('❌ should reject product with missing name', async () => {
      const response = await request(BACKEND_URL)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ basePrice: 999 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('❌ should reject variant with invalid stock (negative)', async () => {
      const response = await request(BACKEND_URL)
        .post(`/api/v1/products/${testProductId}/variants`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ sku: 'INVALID-STOCK', stock: -5 });

      expect(response.status).toBe(400);
    });

    it('❌ should reject variant with invalid price (negative)', async () => {
      const response = await request(BACKEND_URL)
        .post(`/api/v1/products/${testProductId}/variants`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ sku: 'INVALID-PRICE', price: -100, stock: 10 });

      expect(response.status).toBe(400);
    });

    it('❌ should reject stock update with negative value', async () => {
      const response = await request(BACKEND_URL)
        .put(`/api/v1/products/${testProductId}/variants/1/stock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ stockLevel: -10 });

      expect(response.status).toBe(400);
    });
  });

  describe('🏷️ Product-Category Management', () => {
    it('✅ should assign categories to product', async () => {
      // Get a category ID first
      const categoriesRes = await request(BACKEND_URL)
        .get('/api/v1/categories');

      const categoryId = categoriesRes.body.data?.categories?.[0]?.id;

      if (categoryId) {
        const response = await request(BACKEND_URL)
          .post(`/api/v1/products/${testProductId}/categories`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ categoryIds: [categoryId] });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      }
    });

    it('✅ should get product categories', async () => {
      const response = await request(BACKEND_URL)
        .get(`/api/v1/products/${testProductId}/categories`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('✅ should remove category from product', async () => {
      const categoriesRes = await request(BACKEND_URL)
        .get(`/api/v1/products/${testProductId}/categories`);

      const categoryId = categoriesRes.body.data?.[0]?.id;

      if (categoryId) {
        const response = await request(BACKEND_URL)
          .delete(`/api/v1/products/${testProductId}/categories/${categoryId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      }
    });
  });
});

describe('📦 Product Repository Unit Tests', () => {
  const ProductRepository = require('../src/repositories/product.sql.repository');

  describe('Slug Generation', () => {
    it('should generate slug from name', () => {
      const slug = ProductRepository.generateSlug('Classic Cotton T-Shirt');
      expect(slug).toBe('classic-cotton-t-shirt');
    });

    it('should handle special characters', () => {
      const slug = ProductRepository.generateSlug('Men\'s T-Shirt (Premium)');
      expect(slug).toBe('men-s-t-shirt-premium');
    });

    it('should handle multiple spaces', () => {
      const slug = ProductRepository.generateSlug('Hand   Block   Printed   Saree');
      expect(slug).toBe('hand-block-printed-saree');
    });

    it('should handle empty input', () => {
      const slug = ProductRepository.generateSlug('');
      expect(slug).toBe('');
    });

    it('should handle null input', () => {
      const slug = ProductRepository.generateSlug(null);
      expect(slug).toBe('');
    });
  });
});
