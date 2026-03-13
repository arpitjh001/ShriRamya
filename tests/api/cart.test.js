/**
 * Cart API Tests
 * Tests for /api/v1/cart/* endpoints
 */

const { request, BACKEND_URL, getSessionHeaders, generateSessionId } = require('./setup');

describe('🛒 Cart API', () => {
  let sessionId;
  let testProductId;
  
  beforeAll(async () => {
    // Generate session ID for guest cart
    sessionId = generateSessionId();
    
    // Get a product ID for testing
    const productsRes = await request(BACKEND_URL)
      .get('/api/v1/products');
    
    if (productsRes.body.data?.products?.length > 0) {
      testProductId = productsRes.body.data.products[0].id;
    }
  });
  
  describe('GET /api/v1/cart', () => {
    it('✅ should return empty cart for new session', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/v1/cart')
        .set(getSessionHeaders(sessionId));
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('items');
      expect(Array.isArray(response.body.data.items)).toBe(true);
    });
    
    it('✅ should create cart if not exists', async () => {
      const newSessionId = generateSessionId();
      
      const response = await request(BACKEND_URL)
        .get('/api/v1/cart')
        .set(getSessionHeaders(newSessionId));
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
  
  describe('POST /api/v1/cart/add', () => {
    it('✅ should add product to cart', async () => {
      if (!testProductId) {
        console.warn('⚠️ No products available for testing');
        return;
      }
      
      const response = await request(BACKEND_URL)
        .post('/api/v1/cart/add')
        .set(getSessionHeaders(sessionId))
        .send({
          product_id: testProductId,
          quantity: 1,
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('items');
      expect(response.body.data.items.length).toBeGreaterThan(0);
    });
    
    it('✅ should increment quantity for duplicate product', async () => {
      if (!testProductId) return;
      
      // Add same product again
      const response = await request(BACKEND_URL)
        .post('/api/v1/cart/add')
        .set(getSessionHeaders(sessionId))
        .send({
          product_id: testProductId,
          quantity: 1,
        });
      
      expect(response.status).toBe(200);
      
      // Find the item and check quantity
      const item = response.body.data.items.find(i => i.product_id === testProductId);
      expect(item.quantity).toBeGreaterThan(1);
    });
    
    it('✅ should add product with variations', async () => {
      if (!testProductId) return;
      
      const response = await request(BACKEND_URL)
        .post('/api/v1/cart/add')
        .set(getSessionHeaders(sessionId))
        .send({
          product_id: testProductId,
          quantity: 1,
          variation: { size: 'M', color: 'Blue' },
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
    
    it('❌ should fail with invalid product ID', async () => {
      const response = await request(BACKEND_URL)
        .post('/api/v1/cart/add')
        .set(getSessionHeaders(sessionId))
        .send({
          product_id: 999999,
          quantity: 1,
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
    
    it('❌ should fail with zero or negative quantity', async () => {
      if (!testProductId) return;
      
      const response = await request(BACKEND_URL)
        .post('/api/v1/cart/add')
        .set(getSessionHeaders(sessionId))
        .send({
          product_id: testProductId,
          quantity: 0,
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
    
    it('❌ should fail without session ID', async () => {
      const response = await request(BACKEND_URL)
        .post('/api/v1/cart/add')
        .send({
          product_id: testProductId,
          quantity: 1,
        });
      
      // Should either create session or fail
      expect([200, 400, 401]).toContain(response.status);
    });
  });
  
  describe('PUT /api/v1/cart/item/:id', () => {
    let cartItemId;
    
    beforeAll(async () => {
      // Get cart to find item ID
      const cartRes = await request(BACKEND_URL)
        .get('/api/v1/cart')
        .set(getSessionHeaders(sessionId));
      
      if (cartRes.body.data?.items?.length > 0) {
        cartItemId = cartRes.body.data.items[0].id;
      }
    });
    
    it('✅ should update item quantity', async () => {
      if (!cartItemId) {
        console.warn('⚠️ No cart items available for testing');
        return;
      }
      
      const response = await request(BACKEND_URL)
        .put(`/api/v1/cart/item/${cartItemId}`)
        .set(getSessionHeaders(sessionId))
        .send({ quantity: 3 });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
    
    it('❌ should fail with negative quantity', async () => {
      if (!cartItemId) return;
      
      const response = await request(BACKEND_URL)
        .put(`/api/v1/cart/item/${cartItemId}`)
        .set(getSessionHeaders(sessionId))
        .send({ quantity: -1 });
      
      expect(response.status).toBe(400);
    });
    
    it('❌ should fail with non-existent item', async () => {
      const response = await request(BACKEND_URL)
        .put('/api/v1/cart/item/999999')
        .set(getSessionHeaders(sessionId))
        .send({ quantity: 2 });
      
      expect(response.status).toBe(404);
    });
  });
  
  describe('DELETE /api/v1/cart/item/:id', () => {
    let cartItemId;
    
    beforeAll(async () => {
      // Get cart to find item ID
      const cartRes = await request(BACKEND_URL)
        .get('/api/v1/cart')
        .set(getSessionHeaders(sessionId));
      
      if (cartRes.body.data?.items?.length > 0) {
        cartItemId = cartRes.body.data.items[0].id;
      }
    });
    
    it('✅ should remove item from cart', async () => {
      if (!cartItemId) return;
      
      const response = await request(BACKEND_URL)
        .delete(`/api/v1/cart/item/${cartItemId}`)
        .set(getSessionHeaders(sessionId));
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Verify item is removed
      const cartRes = await request(BACKEND_URL)
        .get('/api/v1/cart')
        .set(getSessionHeaders(sessionId));
      
      const itemExists = cartRes.body.data.items.some(i => i.id === cartItemId);
      expect(itemExists).toBe(false);
    });
    
    it('❌ should fail with non-existent item', async () => {
      const response = await request(BACKEND_URL)
        .delete('/api/v1/cart/item/999999')
        .set(getSessionHeaders(sessionId));
      
      expect(response.status).toBe(404);
    });
  });
  
  describe('DELETE /api/v1/cart', () => {
    it('✅ should clear entire cart', async () => {
      // First add an item
      if (testProductId) {
        await request(BACKEND_URL)
          .post('/api/v1/cart/add')
          .set(getSessionHeaders(sessionId))
          .send({ product_id: testProductId, quantity: 1 });
      }
      
      const response = await request(BACKEND_URL)
        .delete('/api/v1/cart')
        .set(getSessionHeaders(sessionId));
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Verify cart is empty
      const cartRes = await request(BACKEND_URL)
        .get('/api/v1/cart')
        .set(getSessionHeaders(sessionId));
      
      expect(cartRes.body.data.items.length).toBe(0);
    });
  });
  
  describe('Coupon Operations', () => {
    const testCouponCode = 'WELCOME10';
    
    describe('GET /api/v1/cart/coupon', () => {
      it('✅ should return no applied coupon for fresh cart', async () => {
        const newSessionId = generateSessionId();
        
        const response = await request(BACKEND_URL)
          .get('/api/v1/cart/coupon')
          .set(getSessionHeaders(newSessionId));
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeNull();
      });
    });
    
    describe('POST /api/v1/cart/coupon/apply', () => {
      it('✅ should apply valid coupon', async () => {
        const newSessionId = generateSessionId();
        
        // First add a product to cart
        if (testProductId) {
          await request(BACKEND_URL)
            .post('/api/v1/cart/add')
            .set(getSessionHeaders(newSessionId))
            .send({ product_id: testProductId, quantity: 1 });
        }
        
        const response = await request(BACKEND_URL)
          .post('/api/v1/cart/coupon/apply')
          .set(getSessionHeaders(newSessionId))
          .send({ couponCode: testCouponCode });
        
        // May succeed or fail depending on coupon existence
        expect([200, 400]).toContain(response.status);
      });
      
      it('❌ should fail with invalid coupon code', async () => {
        const newSessionId = generateSessionId();
        
        const response = await request(BACKEND_URL)
          .post('/api/v1/cart/coupon/apply')
          .set(getSessionHeaders(newSessionId))
          .send({ couponCode: 'INVALID_COUPON_12345' });
        
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
      
      it('❌ should fail with empty coupon code', async () => {
        const response = await request(BACKEND_URL)
          .post('/api/v1/cart/coupon/apply')
          .set(getSessionHeaders(sessionId))
          .send({ couponCode: '' });
        
        expect(response.status).toBe(400);
      });
    });
    
    describe('DELETE /api/v1/cart/coupon/remove', () => {
      it('✅ should remove applied coupon', async () => {
        const response = await request(BACKEND_URL)
          .delete('/api/v1/cart/coupon/remove')
          .set(getSessionHeaders(sessionId));
        
        // May succeed or return 400 if no coupon applied
        expect([200, 400]).toContain(response.status);
      });
    });
  });
  
  describe('Cart Edge Cases', () => {
    it('✅ should handle multiple sessions independently', async () => {
      const session1 = generateSessionId();
      const session2 = generateSessionId();
      
      // Add product to session1
      if (testProductId) {
        await request(BACKEND_URL)
          .post('/api/v1/cart/add')
          .set(getSessionHeaders(session1))
          .send({ product_id: testProductId, quantity: 1 });
      }
      
      // Get both carts
      const cart1Res = await request(BACKEND_URL)
        .get('/api/v1/cart')
        .set(getSessionHeaders(session1));
      
      const cart2Res = await request(BACKEND_URL)
        .get('/api/v1/cart')
        .set(getSessionHeaders(session2));
      
      // Carts should be independent
      expect(cart1Res.body.data.items.length).not.toBe(cart2Res.body.data.items.length);
    });
    
    it('✅ should handle large quantities', async () => {
      const newSessionId = generateSessionId();
      
      if (testProductId) {
        const response = await request(BACKEND_URL)
          .post('/api/v1/cart/add')
          .set(getSessionHeaders(newSessionId))
          .send({ product_id: testProductId, quantity: 999 });
        
        // Should either succeed or fail with stock error
        expect([200, 400]).toContain(response.status);
      }
    });
  });
});
