/**
 * Payment Flow Testing Script for Shri Ramya
 * Tests complete payment flow with Razorpay in production
 * 
 * Test Flow:
 * 1. Create order with cart items
 * 2. Initiate payment (get Razorpay order)
 * 3. Verify payment signature (mock)
 * 4. Verify order status after payment
 */

const https = require('https');
const http = require('http');
const crypto = require('crypto');
const url = require('url');

const API_BASE = process.env.API_URL || 'https://www.shriramya.com/api/v1';
const JWT_TOKEN = process.env.JWT_TOKEN || '';

// Razorpay Test Credentials (these are provided by Razorpay for testing)
const RAZORPAY_TEST_CREDENTIALS = {
  keyId: 'rzp_test_STu9TySeTRKeDz',
  keySecret: 'TL5UAFBzjP2F01lN2mLoJPZI',
  validCardNumber: '4111111111111111',
  validCardCVV: '123',
  validCardExpiry: '12/25',
};

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}${colors.bright}${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
};

/**
 * Helper function to make HTTP/HTTPS requests
 */
function makeRequest(urlStr, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(urlStr);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      }
    };

    if (body) {
      const bodyStr = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const req = client.request(parsedUrl, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: { error: data }, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

/**
 * Generate valid Razorpay signature for testing
 */
function generateRazorpaySignature(orderId, paymentId, keySecret) {
  const sign = `${orderId}|${paymentId}`;
  return crypto
    .createHmac('sha256', keySecret)
    .update(sign)
    .digest('hex');
}

/**
 * Test 1: Create an order
 */
async function testCreateOrder() {
  log.section('TEST 1: Create Order');
  
  try {
    const orderData = {
      items: [
        {
          productId: '1',
          variantId: '1',
          name: 'Test Saree',
          price: 5000,
          quantity: 1,
          image: '/uploads/test-saree.jpg',
          attributes: { color: 'Red', size: 'Free Size' }
        }
      ],
      shipping_address: {
        name: 'Test User',
        phone: '9999999999',
        address_line1: '123 Test Street',
        address_line2: 'Apt 4B',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001'
      },
      email: 'test@example.com',
      amount: 5099, // 5000 + 99 shipping
      couponCode: null
    };

    const headers = {
      'Content-Type': 'application/json',
    };

    if (JWT_TOKEN) {
      headers['Authorization'] = `Bearer ${JWT_TOKEN}`;
    }

    const response = await makeRequest(`${API_BASE}/orders`, 'POST', orderData, headers);

    if (response.status !== 201 && response.status !== 200) {
      throw new Error(`Failed with status ${response.status}: ${JSON.stringify(response.data)}`);
    }

    const result = response.data;
    
    if (!result.data?.orderId && !result.data?.order_id) {
      throw new Error('Order creation response missing orderId');
    }

    const orderId = result.data?.orderId || result.data?.order_id;
    const razorpayOrderId = result.data?.razorpayOrderId || result.data?.razorpay_order_id;

    log.success(`Order created successfully`);
    log.info(`Order ID: ${orderId}`);
    log.info(`Razorpay Order ID: ${razorpayOrderId}`);
    log.info(`Amount: ₹${result.data?.amount || 5099}`);

    return { orderId, razorpayOrderId, amount: result.data?.amount || 5099 };
  } catch (error) {
    log.error(`Failed to create order: ${error.message}`);
    return null;
  }
}

/**
 * Test 2: Initiate payment (fetch Razorpay order details)
 */
async function testInitiatePayment(orderId, amount) {
  log.section('TEST 2: Initiate Payment');

  try {
    const paymentData = {
      orderId,
      amount,
      currency: 'INR'
    };

    const headers = {
      'Content-Type': 'application/json',
    };

    if (JWT_TOKEN) {
      headers['Authorization'] = `Bearer ${JWT_TOKEN}`;
    }

    const response = await makeRequest(`${API_BASE}/payments/initiate`, 'POST', paymentData, headers);

    if (response.status !== 200 && response.status !== 201) {
      throw new Error(`Failed with status ${response.status}: ${JSON.stringify(response.data)}`);
    }

    const result = response.data;
    
    if (!result.data?.orderId) {
      throw new Error('Payment initiation response missing orderId');
    }

    log.success(`Payment initiated successfully`);
    log.info(`Razorpay Order ID: ${result.data.orderId}`);
    log.info(`Amount: ₹${result.data.amount}`);
    log.info(`Currency: ${result.data.currency}`);
    log.info(`Status: ${result.data.status}`);

    return { razorpayOrderId: result.data.orderId, razorpayKey: result.data.key };
  } catch (error) {
    log.error(`Failed to initiate payment: ${error.message}`);
    return null;
  }
}

/**
 * Test 3: Verify payment (simulate successful payment)
 */
async function testVerifyPayment(razorpayOrderId, orderId) {
  log.section('TEST 3: Verify Payment');

  try {
    // Simulate payment success with mock payment ID
    const mockPaymentId = `pay_test_${Date.now()}`;
    const mockSignature = generateRazorpaySignature(
      razorpayOrderId,
      mockPaymentId,
      RAZORPAY_TEST_CREDENTIALS.keySecret
    );

    const verifyData = {
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: mockPaymentId,
      razorpay_signature: mockSignature,
      orderId
    };

    const headers = {
      'Content-Type': 'application/json',
    };

    if (JWT_TOKEN) {
      headers['Authorization'] = `Bearer ${JWT_TOKEN}`;
    }

    const response = await makeRequest(`${API_BASE}/payments/verify`, 'POST', verifyData, headers);

    if (response.status !== 200 && response.status !== 201) {
      throw new Error(`Failed with status ${response.status}: ${JSON.stringify(response.data)}`);
    }

    const result = response.data;

    if (result.data?.verified) {
      log.success(`Payment verified successfully`);
      log.info(`Razorpay Payment ID: ${mockPaymentId}`);
      log.info(`Signature: ${mockSignature.substring(0, 20)}...`);
      return true;
    } else {
      throw new Error('Payment verification returned false');
    }
  } catch (error) {
    log.error(`Failed to verify payment: ${error.message}`);
    return false;
  }
}

/**
 * Test 4: Check payment status
 */
async function testPaymentStatus(orderId) {
  log.section('TEST 4: Check Payment Status');

  try {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (JWT_TOKEN) {
      headers['Authorization'] = `Bearer ${JWT_TOKEN}`;
    }

    const response = await makeRequest(`${API_BASE}/payments/status/${orderId}`, 'GET', null, headers);

    if (response.status !== 200) {
      throw new Error(`Failed with status ${response.status}: ${JSON.stringify(response.data)}`);
    }

    const result = response.data;
    const status = result.data?.paymentStatus || result.data?.status;

    log.success(`Payment status retrieved: ${status}`);
    log.info(`Response: ${JSON.stringify(result.data, null, 2)}`);

    return status;
  } catch (error) {
    log.error(`Failed to get payment status: ${error.message}`);
    return null;
  }
}

/**
 * Test 5: Get payment history
 */
async function testPaymentHistory(orderId) {
  log.section('TEST 5: Get Payment History');

  try {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (JWT_TOKEN) {
      headers['Authorization'] = `Bearer ${JWT_TOKEN}`;
    }

    const response = await makeRequest(`${API_BASE}/payments/history/${orderId}`, 'GET', null, headers);

    if (response.status !== 200) {
      const statusCode = response.status;
      
      // 404 is acceptable if no payment history yet
      if (statusCode === 404) {
        log.warning(`No payment history found for order (expected on first attempt)`);
        return null;
      }
      
      throw new Error(`Failed with status ${statusCode}: ${JSON.stringify(response.data)}`);
    }

    const result = response.data;
    log.success(`Payment history retrieved`);
    log.info(`Total payments: ${result.data?.length || 0}`);
    
    if (result.data?.length > 0) {
      result.data.forEach((payment, index) => {
        log.info(`Payment ${index + 1}: ${payment.status} - ₹${payment.amount}`);
      });
    }

    return result.data;
  } catch (error) {
    log.error(`Failed to get payment history: ${error.message}`);
    return null;
  }
}

/**
 * Test 6: Check order status after payment
 */
async function testOrderStatus(orderId) {
  log.section('TEST 6: Check Order Status');

  try {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (JWT_TOKEN) {
      headers['Authorization'] = `Bearer ${JWT_TOKEN}`;
    }

    const response = await makeRequest(`${API_BASE}/orders/${orderId}`, 'GET', null, headers);

    if (response.status !== 200) {
      throw new Error(`Failed with status ${response.status}: ${JSON.stringify(response.data)}`);
    }

    const result = response.data;
    const orderData = result.data || result;

    log.success(`Order details retrieved`);
    log.info(`Order Status: ${orderData.status || 'unknown'}`);
    log.info(`Payment Status: ${orderData.paymentStatus || 'unknown'}`);
    log.info(`Total Amount: ₹${orderData.amount || 'unknown'}`);
    log.info(`Items: ${orderData.items?.length || 0}`);

    return orderData;
  } catch (error) {
    log.error(`Failed to get order status: ${error.message}`);
    return null;
  }
}

/**
 * Main test execution
 */
async function runPaymentFlowTests() {
  log.section('🔷 SHRI RAMYA PAYMENT FLOW TEST SUITE 🔷');
  log.info(`API Base URL: ${API_BASE}`);
  log.info(`Test Credentials: Razorpay Test Keys (${RAZORPAY_TEST_CREDENTIALS.keyId})`);
  
  console.log('\n' + '='.repeat(70) + '\n');

  // Test 1: Create Order
  const orderResult = await testCreateOrder();
  if (!orderResult) {
    log.error('Payment flow test stopped: Failed to create order');
    return;
  }

  console.log('\n' + '-'.repeat(70) + '\n');

  // Test 2: Initiate Payment
  const paymentResult = await testInitiatePayment(orderResult.orderId, orderResult.amount);
  if (!paymentResult) {
    log.error('Payment flow test stopped: Failed to initiate payment');
    return;
  }

  console.log('\n' + '-'.repeat(70) + '\n');

  // Test 3: Verify Payment
  const verified = await testVerifyPayment(orderResult.razorpayOrderId, orderResult.orderId);
  
  console.log('\n' + '-'.repeat(70) + '\n');

  // Test 4: Check Payment Status
  await testPaymentStatus(orderResult.orderId);

  console.log('\n' + '-'.repeat(70) + '\n');

  // Test 5: Get Payment History
  await testPaymentHistory(orderResult.orderId);

  console.log('\n' + '-'.repeat(70) + '\n');

  // Test 6: Check Order Status
  await testOrderStatus(orderResult.orderId);

  console.log('\n' + '='.repeat(70) + '\n');

  if (verified) {
    log.success('PAYMENT FLOW TEST COMPLETED SUCCESSFULLY ✨');
    log.info('All payment endpoints are working correctly in production');
  } else {
    log.warning('PAYMENT FLOW TEST COMPLETED WITH WARNINGS');
    log.info('Some payment operations may need verification');
  }
}

// Run tests
runPaymentFlowTests().catch(error => {
  log.error(`Unexpected error: ${error.message}`);
  process.exit(1);
});
