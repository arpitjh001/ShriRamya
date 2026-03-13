/**
 * API Test Configuration
 * Jest + Supertest setup for API testing
 */

const request = require('supertest');

// Backend URL for testing
const BACKEND_URL = process.env.TEST_BACKEND_URL || 'http://localhost:8080';

// Test credentials
const TEST_CREDENTIALS = {
  admin: {
    email: 'admin@shriramya.com',
    password: 'Admin@123',
  },
  customer: {
    email: 'customer@shriramya.com',
    password: 'Customer@123',
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
  
  // Authenticate as admin
  try {
    const adminRes = await request(BACKEND_URL)
      .post('/api/v1/auth/login')
      .send(TEST_CREDENTIALS.admin);
    
    if (adminRes.body.success) {
      global.testState.adminToken = adminRes.body.data.token;
      console.log('✅ Admin authentication successful');
    }
  } catch (error) {
    console.warn('⚠️ Admin authentication failed - some tests will be skipped');
  }
  
  // Authenticate as customer
  try {
    const customerRes = await request(BACKEND_URL)
      .post('/api/v1/auth/login')
      .send(TEST_CREDENTIALS.customer);
    
    if (customerRes.body.success) {
      global.testState.customerToken = customerRes.body.data.token;
      console.log('✅ Customer authentication successful');
    }
  } catch (error) {
    console.warn('⚠️ Customer authentication failed - some tests will be skipped');
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
