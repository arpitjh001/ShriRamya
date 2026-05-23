/**
 * API Test Configuration
 * Jest + Supertest setup for API testing
 */

const request = require('supertest');

// Backend URL for testing
const BACKEND_URL = process.env.TEST_BACKEND_URL || 'http://localhost:8000';

// Test credentials
const TEST_CREDENTIALS = {
  admin: {
    email: 'admin@shriramya.com',
    password: 'Admin@123',
  },
  customer: {
    email: 'customer@test.com',
    password: 'Test@123',
  },
};

// Global test state
global.testState = {
  adminToken: null,
  customerToken: null,
  sessionId: null,
  testProductId: null,
  testOrderId: null,
  testCouponId: null,
};

// Generate unique session ID for guest cart
const generateSessionId = () => {
  return `test_session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
};

// Setup before all tests
beforeAll(async () => {
  console.log('🧪 Starting API Test Suite...');
  console.log(`📍 Backend URL: ${BACKEND_URL}`);
  
  // Initialize session ID for guest operations
  global.testState.sessionId = generateSessionId();
  
  // Fetch CSRF token first
  let csrfToken = null;
  let csrfCookie = null;
  try {
    const csrfRes = await request(BACKEND_URL).get('/api/v1/csrf-token');
    if (csrfRes.body.success) {
      csrfToken = csrfRes.body.data.csrf_token;
      const setCookie = csrfRes.headers['set-cookie'];
      if (setCookie && setCookie.length > 0) {
        csrfCookie = setCookie[0].split(';')[0];
      }
    }
  } catch (error) {
    console.warn('⚠️ Failed to fetch CSRF token:', error.message);
  }

  // Authenticate as admin
  try {
    const loginReq = request(BACKEND_URL)
      .post('/api/v1/auth/login');
    
    if (csrfToken && csrfCookie) {
      loginReq.set('x-csrf-token', csrfToken).set('Cookie', csrfCookie);
    }
    
    const adminRes = await loginReq.send(TEST_CREDENTIALS.admin);
    
    if (adminRes.body.success) {
      global.testState.adminToken = adminRes.body.data.token;
      console.log('✅ Admin authentication successful');
    } else {
      console.warn('⚠️ Admin authentication failed:', adminRes.body.message || adminRes.status);
    }
  } catch (error) {
    console.warn('⚠️ Admin authentication failed - some tests will be skipped:', error.message);
  }
  
  // Authenticate as customer
  try {
    const loginReq = request(BACKEND_URL)
      .post('/api/v1/auth/login');
      
    if (csrfToken && csrfCookie) {
      loginReq.set('x-csrf-token', csrfToken).set('Cookie', csrfCookie);
    }
    
    const customerRes = await loginReq.send(TEST_CREDENTIALS.customer);
    
    if (customerRes.body.success) {
      global.testState.customerToken = customerRes.body.data.token;
      console.log('✅ Customer authentication successful');
    } else {
      console.warn('⚠️ Customer authentication failed:', customerRes.body.message || customerRes.status);
    }
  } catch (error) {
    console.warn('⚠️ Customer authentication failed - some tests will be skipped:', error.message);
  }
});

// Cleanup after all tests
afterAll(async () => {
  console.log('\n📊 Test Suite Completed');
  console.log('🧹 Cleaning up test data...');
  
  // Cleanup logic can be added here
  global.testState = {};
});

// Helper function to get auth headers
const getAuthHeaders = (token) => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
});

// Helper function to get session headers
const getSessionHeaders = (sessionId) => ({
  'x-session-id': sessionId,
  'Content-Type': 'application/json',
});

module.exports = {
  request,
  BACKEND_URL,
  TEST_CREDENTIALS,
  generateSessionId,
  getAuthHeaders,
  getSessionHeaders,
};
