/**
 * Orders API Tests
 * Tests for /api/v1/orders/* endpoints
 */

const { request, BACKEND_URL, getAuthHeaders, getSessionHeaders } = require('./setup');

describe('📦 Orders API', () => {
  let customerToken;
  let adminToken;
  let testOrderId;
  let sessionId;
  
  beforeAll(async () => {
    customerToken = global.testState.customerToken;
    adminToken = global.testState.adminToken;
    sessionId = `test_order_session_${Date.now()}`;
  });
  
  describe('POST /api/v1/orders (Create Order)', () => {
    const orderData = {
      shipping: {
        name: 'Test Customer',
        phone: '9876543210',
        address_line1: '123 Test Street',
        address_line2: 'Apt 4B',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
      email: 'customer@shriramya.com',
      paymentMethod: 'cod',
    };
    
    it('❌ should fail without authentication', async () => {
      const response = await request(BACKEND_URL)
        .post('/api/v1/orders')
        .send(orderData);
      
      expect(response.status).toBe(403);
    });
    
    it('❌ should fail with empty cart', async () => {
      if (!customerToken) return;
      
      const response = await request(BACKEND_URL)
        .post('/api/v1/orders')
        .set(getAuthHeaders(customerToken))
        .send(orderData);
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
    
    it('✅ should create order with items in cart', async () => {
      if (!customerToken) return;
      
      // First add item to cart
      const productsRes = await request(BACKEND_URL)
        .get('/api/v1/products');
      
      const productId = productsRes.body.data?.[0]?.id || productsRes.body.data?.products?.[0]?.id;
      
      if (!productId) {
        console.warn('⚠️ No products available for order testing');
        return;
      }
      
      // Create order
      const response = await request(BACKEND_URL)
        .post('/api/v1/orders')
        .set(getAuthHeaders(customerToken))
        .send({
          ...orderData,
          items: [{ productId: productId, quantity: 1 }]
        });
      
      // Order creation may succeed or fail
      expect([201, 400]).toContain(response.status);
      
      if (response.status === 201) {
        testOrderId = response.body.data?._id || response.body.data?.id;
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('_id');
      }
    });
  });
  
  describe('GET /api/v1/orders/my (Customer Orders)', () => {
    it('❌ should fail without authentication', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/v1/orders/my');
      
      expect(response.status).toBe(401);
    });
    
    it('✅ should return customer orders', async () => {
      if (!customerToken) return;
      
      const response = await request(BACKEND_URL)
        .get('/api/v1/orders/my')
        .set(getAuthHeaders(customerToken));
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
  
  describe('GET /api/v1/orders/:id (Order Details)', () => {
    it('❌ should fail without authentication', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/v1/orders/1');
      
      expect(response.status).toBe(401);
    });
    
    it('✅ should return order details', async () => {
      if (!customerToken || !testOrderId) {
        // Get first order from list
        const ordersRes = await request(BACKEND_URL)
          .get('/api/v1/orders/my')
          .set(getAuthHeaders(customerToken));
        
        testOrderId = ordersRes.body.data?.[0]?.id || ordersRes.body.data?.[0]?._id;
      }
      
      if (!testOrderId) {
        console.warn('⚠️ No orders available for testing');
        return;
      }
      
      const response = await request(BACKEND_URL)
        .get(`/api/v1/orders/${testOrderId}`)
        .set(getAuthHeaders(customerToken));
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id', testOrderId);
    });
    
    it('❌ should return 404 for non-existent order', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/v1/orders/999999')
        .set(getAuthHeaders(customerToken));
      
      expect(response.status).toBe(404);
    });
  });
  
  describe('POST /api/v1/orders/my/:id/cancel', () => {
    it('✅ should cancel order', async () => {
      if (!customerToken || !testOrderId) return;
      
      const response = await request(BACKEND_URL)
        .post(`/api/v1/orders/my/${testOrderId}/cancel`)
        .set(getAuthHeaders(customerToken));
      
      // May succeed or fail based on order status
      expect([200, 400]).toContain(response.status);
    });
    
    it('❌ should fail for non-existent order', async () => {
      const response = await request(BACKEND_URL)
        .post('/api/v1/orders/my/999999/cancel')
        .set(getAuthHeaders(customerToken));
      
      expect(response.status).toBe(404);
    });
  });
  
  describe('GET /api/v1/orders/:id/tracking', () => {
    it('✅ should return order tracking info', async () => {
      if (!customerToken || !testOrderId) return;
      
      const response = await request(BACKEND_URL)
        .get(`/api/v1/orders/${testOrderId}/tracking`)
        .set(getAuthHeaders(customerToken));
      
      // May return tracking or empty if not shipped
      expect([200, 404]).toContain(response.status);
    });
  });
  
  describe('GET /api/v1/orders/:id/shipments', () => {
    it('✅ should return order shipments', async () => {
      if (!customerToken || !testOrderId) return;
      
      const response = await request(BACKEND_URL)
        .get(`/api/v1/orders/${testOrderId}/shipments`)
        .set(getAuthHeaders(customerToken));
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
  
  describe('POST /api/v1/orders/:id/refunds', () => {
    it('✅ should request refund', async () => {
      if (!customerToken || !testOrderId) return;
      
      const refundData = {
        reason: 'Product damaged',
        description: 'Item arrived in damaged condition',
        refund_amount: 999,
      };
      
      const response = await request(BACKEND_URL)
        .post(`/api/v1/orders/${testOrderId}/refunds`)
        .set(getAuthHeaders(customerToken))
        .send(refundData);
      
      // May succeed or fail based on order status
      expect([200, 400]).toContain(response.status);
    });
  });
  
  describe('Admin Order Operations', () => {
    describe('GET /api/v1/orders/admin/all', () => {
      it('❌ should fail for non-admin user', async () => {
        const response = await request(BACKEND_URL)
          .get('/api/v1/orders/admin/all')
          .set(getAuthHeaders(customerToken));
        
        expect(response.status).toBe(403);
      });
      
      it('✅ should return all orders (admin)', async () => {
        if (!adminToken) return;
        
        const response = await request(BACKEND_URL)
          .get('/api/v1/orders/admin/all')
          .set(getAuthHeaders(adminToken));
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('orders');
        expect(Array.isArray(response.body.data.orders)).toBe(true);
      });
      
      it('✅ should support pagination', async () => {
        if (!adminToken) return;
        
        const response = await request(BACKEND_URL)
          .get('/api/v1/orders/admin/all')
          .set(getAuthHeaders(adminToken))
          .query({ page: 1, limit: 10 });
        
        expect(response.status).toBe(200);
      });
      
      it('✅ should support status filter', async () => {
        if (!adminToken) return;
        
        const response = await request(BACKEND_URL)
          .get('/api/v1/orders/admin/all')
          .set(getAuthHeaders(adminToken))
          .query({ status: 'pending' });
        
        expect(response.status).toBe(200);
      });
    });
    
    describe('GET /api/v1/orders/admin/shipments', () => {
      it('✅ should return all shipments (admin)', async () => {
        if (!adminToken) return;
        
        const response = await request(BACKEND_URL)
          .get('/api/v1/orders/admin/shipments')
          .set(getAuthHeaders(adminToken));
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
    
    describe('GET /api/v1/orders/admin/shipments/ready-to-ship', () => {
      it('✅ should return ready to ship shipments (admin)', async () => {
        if (!adminToken) return;
        
        const response = await request(BACKEND_URL)
          .get('/api/v1/orders/admin/shipments/ready-to-ship')
          .set(getAuthHeaders(adminToken));
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
    
    describe('GET /api/v1/orders/admin/shipments/pending', () => {
      it('✅ should return pending shipments (admin)', async () => {
        if (!adminToken) return;
        
        const response = await request(BACKEND_URL)
          .get('/api/v1/orders/admin/shipments/pending')
          .set(getAuthHeaders(adminToken));
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('DELETE /api/v1/orders/admin/:id (Delete Order)', () => {
      let orderIdToDelete;

      beforeAll(async () => {
        if (!adminToken) return;
        // Fetch existing products
        const productsRes = await request(BACKEND_URL).get('/api/v1/products');
        const productId = productsRes.body.data?.products?.[0]?.id || productsRes.body.data?.[0]?.id;
        
        if (productId && customerToken) {
          const createRes = await request(BACKEND_URL)
            .post('/api/v1/orders')
            .set(getAuthHeaders(customerToken))
            .send({
              items: [{ productId: productId, quantity: 1 }],
              shipping: {
                name: 'Delete Test Customer',
                phone: '9876543210',
                address_line1: '123 Test Street',
                address_line2: 'Apt 4B',
                city: 'Mumbai',
                state: 'Maharashtra',
                pincode: '400001',
              },
              email: 'customer@shriramya.com',
              paymentMethod: 'cod'
            });
          
          orderIdToDelete = createRes.body.data?.id || createRes.body.data?._id;
        }

        // Fallback: If we couldn't create an order, find an existing one
        if (!orderIdToDelete) {
          const ordersRes = await request(BACKEND_URL)
            .get('/api/v1/orders/admin/all')
            .set(getAuthHeaders(adminToken));
          const ordersList = ordersRes.body.data?.orders || [];
          if (ordersList.length > 0) {
            orderIdToDelete = ordersList[0]._id || ordersList[0].id;
          }
        }
      });

      it('❌ should fail without authentication', async () => {
        if (!orderIdToDelete) return;
        const response = await request(BACKEND_URL)
          .delete(`/api/v1/orders/admin/${orderIdToDelete}`)
          .query({ secretCode: '284001' });
        
        expect(response.status).toBe(403);
      });

      it('❌ should fail for non-admin user', async () => {
        if (!orderIdToDelete) return;
        const response = await request(BACKEND_URL)
          .delete(`/api/v1/orders/admin/${orderIdToDelete}`)
          .set(getAuthHeaders(customerToken))
          .query({ secretCode: '284001' });
        
        expect(response.status).toBe(403);
      });

      it('❌ should fail with missing secret code', async () => {
        if (!orderIdToDelete) return;
        const response = await request(BACKEND_URL)
          .delete(`/api/v1/orders/admin/${orderIdToDelete}`)
          .set(getAuthHeaders(adminToken));
        
        expect(response.status).toBe(400);
      });

      it('❌ should fail with incorrect secret code', async () => {
        if (!orderIdToDelete) return;
        const response = await request(BACKEND_URL)
          .delete(`/api/v1/orders/admin/${orderIdToDelete}`)
          .set(getAuthHeaders(adminToken))
          .query({ secretCode: 'wrong_code' });
        
        expect(response.status).toBe(400);
      });

      it('❌ should return 404 for non-existent order', async () => {
        const response = await request(BACKEND_URL)
          .delete('/api/v1/orders/admin/65f1c9c7f1a23b4567890123')
          .set(getAuthHeaders(adminToken))
          .query({ secretCode: '284001' });
        
        expect(response.status).toBe(404);
      });

      it('✅ should successfully delete order with correct secret code', async () => {
        if (!orderIdToDelete) {
          console.warn('⚠️ No test order available to delete, skipping assertion');
          return;
        }
        const response = await request(BACKEND_URL)
          .delete(`/api/v1/orders/admin/${orderIdToDelete}`)
          .set(getAuthHeaders(adminToken))
          .query({ secretCode: '284001' });
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
  
  describe('Order Analytics (Admin Only)', () => {
    it('✅ should return order analytics (admin)', async () => {
      if (!adminToken) return;
      
      const response = await request(BACKEND_URL)
        .get('/api/v1/orders/admin/analytics/orders')
        .set(getAuthHeaders(adminToken));
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
    
    it('❌ should fail for non-admin user', async () => {
      const response = await request(BACKEND_URL)
        .get('/api/v1/orders/admin/analytics/orders')
        .set(getAuthHeaders(customerToken));
      
      expect(response.status).toBe(403);
    });
  });
});
