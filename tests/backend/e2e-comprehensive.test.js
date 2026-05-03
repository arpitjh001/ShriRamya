/**
 * ShriRamya E-Commerce Platform - Comprehensive End-to-End API Test Suite
 * 
 * This script performs complete automated testing of all backend APIs
 * including authentication, product management, cart, orders, blogs, and more.
 * 
 * Run: node tests/e2e-comprehensive.test.js
 */

const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');
const config = require('../src/config/config');
const User = require('../src/models/user.model');

// Note: Product, Category, Blog, Order are MySQL models accessed via services
// We don't import them directly for testing

// Test Configuration
const TEST_CONFIG = {
  baseUrl: '/api/v1',
  timeout: 30000,
};

// Test Users
const TEST_USERS = {
  admin: {
    email: 'admin@shriramya.com',
    password: 'Admin@123',
    name: 'Admin User',
    role: 'admin'
  },
  editor: {
    email: 'editor@shriramya.com',
    password: 'Editor@123',
    name: 'Editor User',
    role: 'editor'
  },
  customer: {
    email: 'customer@shriramya.com',
    password: 'Customer@123',
    name: 'Customer User',
    role: 'customer'
  }
};

// Test Data
const TEST_DATA = {
  category: {
    name: 'Bagru Hand Block Prints',
    slug: 'bagru-hand-block-prints',
    description: 'Traditional Bagru block printed textile collection from Rajasthan',
    menu_order: 0
  },
  product: {
    name: 'Indigo Bagru Hand Block Printed Cotton Saree',
    sku: 'SR-BAGRU-001',
    description: 'Authentic Bagru hand block printed cotton saree made using natural dyes and traditional techniques',
    base_price: 3499,
    status: 'published',
    variants: [{
      sku: 'SR-BAGRU-001',
      price: 3499,
      discountPrice: 2999,
      stock: 20,
      attributes: {
        "Color": "Indigo",
        "Fabric": "Cotton",
        "Technique": "Hand Block Print"
      },
      lowStockThreshold: 5
    }]
  },
  blog: {
    title: 'The Heritage of Bagru Prints',
    slug: 'heritage-of-bagru-prints',
    excerpt: 'Discover the centuries-old tradition of Bagru hand block printing from Rajasthan',
    content: `
      <h2>Introduction to Bagru Printing</h2>
      <p>Bagru is a small town in Rajasthan, India, renowned for its traditional hand block printing techniques. 
      This ancient craft has been passed down through generations of artisans, known as Chhipas.</p>
      
      <h2>History</h2>
      <p>The art of Bagru printing dates back over 400 years. It originated in the village of Bagru, 
      located about 30 kilometers from Jaipur. The craft flourished under the patronage of royal families.</p>
      
      <h2>Traditional Techniques</h2>
      <p>Bagru printing uses natural dyes extracted from vegetables, minerals, and metals. The process involves:</p>
      <ul>
        <li>Preparing the fabric with a base treatment</li>
        <li>Carving intricate designs on wooden blocks</li>
        <li>Applying natural dyes using hand-carved blocks</li>
        <li>Drying and fixing the colors</li>
      </ul>
      
      <h2>Natural Dyes</h2>
      <p>The signature colors of Bagru prints come from natural sources:</p>
      <ul>
        <li>Indigo - Deep blue from indigo plants</li>
        <li>Alizarin - Red from madder roots</li>
        <li>Black - From iron rust and jaggery</li>
        <li>Yellow - From pomegranate seeds and turmeric</li>
      </ul>
      
      <h2>The Artisans</h2>
      <p>The Chhipa community has preserved this craft for centuries. Each artisan specializes in a particular 
      stage of the printing process, ensuring the highest quality and authenticity.</p>
    `,
    status: 'published',
    tags: ['Bagru', 'Hand Block Print', 'Rajasthan', 'Traditional Craft', 'Natural Dyes']
  }
};

// Test Results Tracking
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  details: []
};

// Authentication Tokens
let tokens = {
  admin: null,
  editor: null,
  customer: null
};

// Created Resources IDs
const createdResources = {
  categoryId: null,
  productId: null,
  blogId: null,
  orderId: null,
  cartId: null
};

/**
 * Utility Functions
 */

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: 'ℹ',
    success: '✅',
    error: '❌',
    warning: '⚠️'
  }[type] || 'ℹ';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function trackResult(testName, passed, error = null) {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    log(`PASS: ${testName}`, 'success');
  } else {
    testResults.failed++;
    log(`FAIL: ${testName} - ${error?.message || 'Unknown error'}`, 'error');
  }
  
  testResults.details.push({
    testName,
    passed,
    error: error?.message || null,
    timestamp: new Date().toISOString()
  });
}

/**
 * Test Suite
 */

describe('ShriRamya E-Commerce Platform - Comprehensive E2E Tests', () => {
  
  beforeAll(async () => {
    log('Starting comprehensive E2E test suite...', 'info');
    
    // Connect to test database
    try {
      await mongoose.connect(config.mongoose.url);
      log('Connected to MongoDB', 'success');
    } catch (error) {
      log(`MongoDB connection failed: ${error.message}`, 'error');
      throw error;
    }
  }, TEST_CONFIG.timeout);

  afterAll(async () => {
    log('Cleaning up test resources...', 'info');
    
    // Close database connection
    await mongoose.connection.close();
    log('Database connection closed', 'success');
    
    // Print test summary
    log('\n========== TEST SUMMARY ==========', 'info');
    log(`Total Tests: ${testResults.total}`, 'info');
    log(`Passed: ${testResults.passed}`, 'success');
    log(`Failed: ${testResults.failed}`, testResults.failed > 0 ? 'error' : 'info');
    log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`, 'info');
    log('==================================\n', 'info');
  });

  /**
   * PHASE 1 - Health Check
   */
  describe('Phase 1: System Health Check', () => {
    test('GET /health - should return system health status', async () => {
      try {
        const res = await request(app)
          .get(`${TEST_CONFIG.baseUrl}/health`)
          .expect(200);
        
        trackResult('Health check endpoint', res.body.status === 'ok');
      } catch (error) {
        trackResult('Health check endpoint', false, error);
      }
    });
  });

  /**
   * PHASE 2 - Authentication
   */
  describe('Phase 2: Authentication & User Management', () => {
    
    test('POST /auth/login - Admin login', async () => {
      try {
        const res = await request(app)
          .post(`${TEST_CONFIG.baseUrl}/auth/login`)
          .send({
            email: TEST_USERS.admin.email,
            password: TEST_USERS.admin.password
          })
          .expect(200);
        
        tokens.admin = res.body.data.access_token;
        trackResult('Admin login', !!tokens.admin);
      } catch (error) {
        trackResult('Admin login', false, error);
      }
    });

    test('POST /auth/login - Editor login', async () => {
      try {
        const res = await request(app)
          .post(`${TEST_CONFIG.baseUrl}/auth/login`)
          .send({
            email: TEST_USERS.editor.email,
            password: TEST_USERS.editor.password
          })
          .expect(200);
        
        tokens.editor = res.body.data.access_token;
        trackResult('Editor login', !!tokens.editor);
      } catch (error) {
        trackResult('Editor login', false, error);
      }
    });

    test('POST /auth/login - Customer login', async () => {
      try {
        const res = await request(app)
          .post(`${TEST_CONFIG.baseUrl}/auth/login`)
          .send({
            email: TEST_USERS.customer.email,
            password: TEST_USERS.customer.password
          })
          .expect(200);
        
        tokens.customer = res.body.data.access_token;
        trackResult('Customer login', !!tokens.customer);
      } catch (error) {
        trackResult('Customer login', false, error);
      }
    });

    test('POST /auth/login - Invalid credentials', async () => {
      try {
        const res = await request(app)
          .post(`${TEST_CONFIG.baseUrl}/auth/login`)
          .send({
            email: 'invalid@example.com',
            password: 'wrongpassword'
          })
          .expect(401);
        
        trackResult('Invalid login rejected', res.body.success === false);
      } catch (error) {
        trackResult('Invalid login rejected', false, error);
      }
    });

    test('GET /auth/me - Get current user', async () => {
      try {
        const res = await request(app)
          .get(`${TEST_CONFIG.baseUrl}/auth/me`)
          .set('Authorization', `Bearer ${tokens.admin}`)
          .expect(200);
        
        trackResult('Get current user', res.body.data.email === TEST_USERS.admin.email);
      } catch (error) {
        trackResult('Get current user', false, error);
      }
    });
  });

  /**
   * PHASE 3 - Category Management
   */
  describe('Phase 3: Category Management', () => {
    
    test('POST /categories - Create category (Admin)', async () => {
      try {
        const res = await request(app)
          .post(`${TEST_CONFIG.baseUrl}/categories`)
          .set('Authorization', `Bearer ${tokens.admin}`)
          .send(TEST_DATA.category)
          .expect(201);
        
        createdResources.categoryId = res.body.data.id;
        trackResult('Create category', !!createdResources.categoryId);
      } catch (error) {
        trackResult('Create category', false, error);
      }
    });

    test('GET /categories - Get all categories', async () => {
      try {
        const res = await request(app)
          .get(`${TEST_CONFIG.baseUrl}/categories`)
          .expect(200);
        
        const categories = res.body.data || [];
        trackResult('Get categories', categories.length > 0);
      } catch (error) {
        trackResult('Get categories', false, error);
      }
    });

    test('GET /categories/slug/:slug - Get category by slug', async () => {
      try {
        const res = await request(app)
          .get(`${TEST_CONFIG.baseUrl}/categories/slug/${TEST_DATA.category.slug}`)
          .expect(200);
        
        trackResult('Get category by slug', res.body.data.slug === TEST_DATA.category.slug);
      } catch (error) {
        trackResult('Get category by slug', false, error);
      }
    });
  });

  /**
   * PHASE 4 - Product Management
   */
  describe('Phase 4: Product Management', () => {
    
    test('POST /products - Create product (Admin)', async () => {
      try {
        const productData = {
          ...TEST_DATA.product,
          categoryId: createdResources.categoryId
        };
        
        const res = await request(app)
          .post(`${TEST_CONFIG.baseUrl}/products`)
          .set('Authorization', `Bearer ${tokens.admin}`)
          .send(productData)
          .expect(201);
        
        createdResources.productId = res.body.data.id;
        trackResult('Create product', !!createdResources.productId);
      } catch (error) {
        trackResult('Create product', false, error);
      }
    });

    test('GET /products - Get all products', async () => {
      try {
        const res = await request(app)
          .get(`${TEST_CONFIG.baseUrl}/products`)
          .expect(200);
        
        const products = res.body.data.products || [];
        trackResult('Get products', products.length > 0);
      } catch (error) {
        trackResult('Get products', false, error);
      }
    });

    test('GET /products/:id - Get single product', async () => {
      try {
        const res = await request(app)
          .get(`${TEST_CONFIG.baseUrl}/products/${createdResources.productId}`)
          .expect(200);
        
        trackResult('Get single product', res.body.data.id === createdResources.productId);
      } catch (error) {
        trackResult('Get single product', false, error);
      }
    });

    test('GET /products?search=bagru - Search products', async () => {
      try {
        const res = await request(app)
          .get(`${TEST_CONFIG.baseUrl}/products?search=bagru`)
          .expect(200);
        
        trackResult('Search products', res.body.success === true);
      } catch (error) {
        trackResult('Search products', false, error);
      }
    });
  });

  /**
   * PHASE 5 - Cart Management
   */
  describe('Phase 5: Cart Management', () => {
    
    test('GET /cart - Get cart (Customer)', async () => {
      try {
        const res = await request(app)
          .get(`${TEST_CONFIG.baseUrl}/cart`)
          .set('Authorization', `Bearer ${tokens.customer}`)
          .expect(200);
        
        if (res.body.data && res.body.data.id) {
          createdResources.cartId = res.body.data.id;
        }
        trackResult('Get cart', res.body.success === true);
      } catch (error) {
        trackResult('Get cart', false, error);
      }
    });

    test('POST /cart/add - Add product to cart', async () => {
      try {
        const res = await request(app)
          .post(`${TEST_CONFIG.baseUrl}/cart/add`)
          .set('Authorization', `Bearer ${tokens.customer}`)
          .send({
            productId: createdResources.productId,
            quantity: 1,
            variantId: 1
          })
          .expect(200);
        
        trackResult('Add to cart', res.body.success === true);
      } catch (error) {
        trackResult('Add to cart', false, error);
      }
    });

    test('GET /cart - Verify cart contents', async () => {
      try {
        const res = await request(app)
          .get(`${TEST_CONFIG.baseUrl}/cart`)
          .set('Authorization', `Bearer ${tokens.customer}`)
          .expect(200);
        
        const cart = res.body.data;
        const hasProduct = cart.items && cart.items.some(
          item => item.product_id === createdResources.productId
        );
        trackResult('Verify cart contents', hasProduct);
      } catch (error) {
        trackResult('Verify cart contents', false, error);
      }
    });
  });

  /**
   * PHASE 6 - Order Management
   */
  describe('Phase 6: Order Management', () => {
    
    test('POST /orders - Create order (Customer)', async () => {
      try {
        const res = await request(app)
          .post(`${TEST_CONFIG.baseUrl}/orders`)
          .set('Authorization', `Bearer ${tokens.customer}`)
          .send({
            items: [{
              productId: createdResources.productId,
              quantity: 1,
              price: 3499
            }],
            shippingAddress: {
              name: 'Test Customer',
              address: '123 Test Street',
              city: 'Jaipur',
              state: 'Rajasthan',
              pincode: '302001',
              phone: '9876543210'
            },
            paymentMethod: 'cod'
          })
          .expect(201);
        
        createdResources.orderId = res.body.data.id;
        trackResult('Create order', !!createdResources.orderId);
      } catch (error) {
        trackResult('Create order', false, error);
      }
    });

    test('GET /orders/my - Get customer orders', async () => {
      try {
        const res = await request(app)
          .get(`${TEST_CONFIG.baseUrl}/orders/my`)
          .set('Authorization', `Bearer ${tokens.customer}`)
          .expect(200);
        
        const orders = res.body.data || [];
        trackResult('Get customer orders', orders.length > 0);
      } catch (error) {
        trackResult('Get customer orders', false, error);
      }
    });

    test('GET /orders/:id - Get order details', async () => {
      try {
        const res = await request(app)
          .get(`${TEST_CONFIG.baseUrl}/orders/${createdResources.orderId}`)
          .set('Authorization', `Bearer ${tokens.customer}`)
          .expect(200);
        
        trackResult('Get order details', res.body.data.id === createdResources.orderId);
      } catch (error) {
        trackResult('Get order details', false, error);
      }
    });
  });

  /**
   * PHASE 7 - Blog Management
   */
  describe('Phase 7: Blog Management (Editor)', () => {
    
    test('POST /blogs - Create blog post (Editor)', async () => {
      try {
        const res = await request(app)
          .post(`${TEST_CONFIG.baseUrl}/blogs`)
          .set('Authorization', `Bearer ${tokens.editor}`)
          .send(TEST_DATA.blog)
          .expect(201);
        
        createdResources.blogId = res.body.data.id;
        trackResult('Create blog post', !!createdResources.blogId);
      } catch (error) {
        trackResult('Create blog post', false, error);
      }
    });

    test('GET /blogs - Get all blogs', async () => {
      try {
        const res = await request(app)
          .get(`${TEST_CONFIG.baseUrl}/blogs`)
          .expect(200);
        
        const blogs = res.body.data.posts || [];
        trackResult('Get blogs', blogs.length > 0);
      } catch (error) {
        trackResult('Get blogs', false, error);
      }
    });

    test('GET /blogs/slug/:slug - Get blog by slug', async () => {
      try {
        const res = await request(app)
          .get(`${TEST_CONFIG.baseUrl}/blogs/slug/${TEST_DATA.blog.slug}`)
          .expect(200);
        
        trackResult('Get blog by slug', res.body.data.slug === TEST_DATA.blog.slug);
      } catch (error) {
        trackResult('Get blog by slug', false, error);
      }
    });
  });

  /**
   * PHASE 8 - Inventory Validation
   */
  describe('Phase 8: Inventory Validation', () => {
    
    test('GET /products/:id - Verify inventory after order', async () => {
      try {
        const res = await request(app)
          .get(`${TEST_CONFIG.baseUrl}/products/${createdResources.productId}`)
          .expect(200);
        
        const product = res.body.data;
        const variant = product.variants && product.variants[0];
        
        // Initial stock was 20, order quantity was 1, expected: 19
        const expectedStock = 19;
        const actualStock = variant ? variant.stock : 0;
        
        trackResult(
          'Inventory deduction',
          actualStock === expectedStock,
          new Error(`Expected ${expectedStock}, got ${actualStock}`)
        );
      } catch (error) {
        trackResult('Inventory deduction', false, error);
      }
    });
  });

  /**
   * PHASE 9 - Edge Cases
   */
  describe('Phase 9: Edge Cases & Error Handling', () => {
    
    test('POST /categories - Duplicate category should fail', async () => {
      try {
        const res = await request(app)
          .post(`${TEST_CONFIG.baseUrl}/categories`)
          .set('Authorization', `Bearer ${tokens.admin}`)
          .send(TEST_DATA.category)
          .expect(400);
        
        trackResult('Duplicate category rejected', res.body.success === false);
      } catch (error) {
        trackResult('Duplicate category rejected', false, error);
      }
    });

    test('POST /products - Unauthorized access should fail', async () => {
      try {
        const res = await request(app)
          .post(`${TEST_CONFIG.baseUrl}/products`)
          .send(TEST_DATA.product)
          .expect(401);
        
        trackResult('Unauthorized access rejected', res.body.success === false);
      } catch (error) {
        trackResult('Unauthorized access rejected', false, error);
      }
    });

    test('GET /admin/analytics/overview - Customer should not access', async () => {
      try {
        const res = await request(app)
          .get(`${TEST_CONFIG.baseUrl}/admin/analytics/overview`)
          .set('Authorization', `Bearer ${tokens.customer}`)
          .expect(403);
        
        trackResult('Admin endpoint protected', res.body.success === false);
      } catch (error) {
        trackResult('Admin endpoint protected', false, error);
      }
    });
  });

  /**
   * PHASE 10 - Admin Operations
   */
  describe('Phase 10: Admin Operations', () => {
    
    test('GET /admin/analytics/overview - Get analytics', async () => {
      try {
        const res = await request(app)
          .get(`${TEST_CONFIG.baseUrl}/admin/analytics/overview`)
          .set('Authorization', `Bearer ${tokens.admin}`)
          .expect(200);
        
        trackResult('Get analytics', res.body.success === true);
      } catch (error) {
        trackResult('Get analytics', false, error);
      }
    });

    test('GET /coupons - Get all coupons', async () => {
      try {
        const res = await request(app)
          .get(`${TEST_CONFIG.baseUrl}/coupons`)
          .set('Authorization', `Bearer ${tokens.admin}`)
          .expect(200);
        
        trackResult('Get coupons', res.body.success === true);
      } catch (error) {
        trackResult('Get coupons', false, error);
      }
    });

    test('POST /coupons - Create coupon', async () => {
      try {
        const couponData = {
          code: 'TEST10',
          type: 'percentage',
          value: 10,
          min_cart_value: 1000,
          usage_limit: 100,
          starts_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active'
        };
        
        const res = await request(app)
          .post(`${TEST_CONFIG.baseUrl}/coupons`)
          .set('Authorization', `Bearer ${tokens.admin}`)
          .send(couponData)
          .expect(201);
        
        trackResult('Create coupon', res.body.success === true);
      } catch (error) {
        trackResult('Create coupon', false, error);
      }
    });
  });

});
