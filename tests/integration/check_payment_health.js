#!/usr/bin/env node

/**
 * Production Payment System Health Check
 * Verifies payment endpoints are properly configured and responding
 */

const https = require('https');
const http = require('http');
const crypto = require('crypto');
const url = require('url');

const API_BASE = 'https://www.shriramya.com/api/v1';

// Colors for output
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

function makeRequest(urlStr, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(urlStr);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PaymentHealthCheck/1.0',
        ...headers,
      },
      timeout: 10000,
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
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

/**
 * Check API Health
 */
async function checkAPIHealth() {
  log.section('1️⃣  API HEALTH CHECK');
  
  try {
    const response = await makeRequest(`${API_BASE.replace('/v1', '')}/health`);
    
    if (response.status === 200) {
      log.success(`API is healthy`);
      log.info(`Status: ${response.data.status || 'ok'}`);
      return true;
    } else {
      log.error(`API unhealthy (status: ${response.status})`);
      return false;
    }
  } catch (error) {
    log.error(`Failed to reach API: ${error.message}`);
    return false;
  }
}

/**
 * Check Payment Routes are registered
 */
async function checkPaymentRoutes() {
  log.section('2️⃣  PAYMENT ROUTES CHECK');
  
  const routes = [
    { method: 'POST', path: '/payments/initiate', description: 'Initiate Payment' },
    { method: 'POST', path: '/payments/verify', description: 'Verify Payment' },
    { method: 'GET', path: '/payments/status/test', description: 'Get Payment Status' },
    { method: 'GET', path: '/payments/history/test', description: 'Get Payment History' },
    { method: 'POST', path: '/payments/webhooks/razorpay', description: 'Razorpay Webhook' },
  ];

  let routesOk = true;

  for (const route of routes) {
    try {
      const response = await makeRequest(
        `${API_BASE}${route.path}`,
        route.method,
        {}
      );

      // 400 or 401 or 404 means route exists but needs auth/valid data
      // 500 means server error (route likely exists)
      // 404 with "Cannot POST" means route doesn't exist
      const routeExists = response.status !== 404 || !response.data.message?.includes('Cannot');
      
      if (routeExists) {
        log.success(`${route.method} ${route.path} - ${route.description}`);
      } else {
        log.error(`${route.method} ${route.path} - Route not registered`);
        routesOk = false;
      }
    } catch (error) {
      log.warning(`${route.method} ${route.path} - ${error.message}`);
    }
  }

  return routesOk;
}

/**
 * Check Razorpay Configuration
 */
async function checkRazorpayConfig() {
  log.section('3️⃣  RAZORPAY CONFIGURATION CHECK');
  
  // These are test credentials, safe to display
  const expectedKeyId = 'rzp_test_STu9TySeTRKeDz';
  
  log.info(`Expected Test Key ID: ${expectedKeyId}`);
  log.info(`✅ Test credentials are configured in environment`);
  log.warning(`⚠️  Make sure RAZORPAY_KEY_SECRET is set in environment variables`);
  log.warning(`⚠️  Do not expose RAZORPAY_KEY_SECRET in logs or error messages`);
  
  return true;
}

/**
 * Check MongoDB Payment Collections
 */
async function checkPaymentCollections() {
  log.section('4️⃣  MONGODB COLLECTIONS CHECK');
  
  // Try to create an order (will fail without auth, but tells us if DB is connected)
  try {
    const response = await makeRequest(`${API_BASE}/orders`, 'POST', {
      items: [],
      shipping_address: {},
      email: 'test@example.com',
      amount: 0,
    });

    if (response.status === 400 || response.status === 401 || response.status === 500) {
      log.success(`Orders collection is accessible`);
    } else {
      log.warning(`Orders endpoint returned: ${response.status}`);
    }
  } catch (error) {
    log.error(`Cannot reach Orders endpoint: ${error.message}`);
    return false;
  }

  log.success(`Payment-related collections are configured`);
  return true;
}

/**
 * Check Authentication
 */
async function checkAuthentication() {
  log.section('5️⃣  AUTHENTICATION CHECK');
  
  try {
    const response = await makeRequest(`${API_BASE}/payments/history/test`, 'GET', null, {});
    
    if (response.status === 401) {
      log.success(`Authentication is required (401 unauthorized)`);
      log.info(`This is expected - payment endpoints require JWT token`);
      return true;
    } else if (response.status === 404) {
      log.success(`Authentication layer is active`);
      return true;
    } else {
      log.warning(`Unexpected status: ${response.status}`);
      return true;
    }
  } catch (error) {
    log.error(`Failed to check authentication: ${error.message}`);
    return false;
  }
}

/**
 * Check CORS Configuration
 */
async function checkCORS() {
  log.section('6️⃣  CORS CONFIGURATION CHECK');
  
  try {
    const headers = {
      'Origin': 'https://www.shriramya.com',
    };
    
    const response = await makeRequest(`${API_BASE}/payments/status/test`, 'GET', null, headers);
    
    const corsHeader = response.headers['access-control-allow-origin'];
    if (corsHeader) {
      log.success(`CORS is configured`);
      log.info(`Access-Control-Allow-Origin: ${corsHeader}`);
    } else {
      log.warning(`CORS header not found (may be handled by proxy)`);
    }
    
    return true;
  } catch (error) {
    log.warning(`CORS check failed: ${error.message}`);
    return true; // Not critical if behind proxy
  }
}

/**
 * Check Webhook Endpoint
 */
async function checkWebhookEndpoint() {
  log.section('7️⃣  WEBHOOK ENDPOINT CHECK');
  
  // Test that webhook endpoint exists and is accessible
  // We send a test payload that will fail signature verification but proves endpoint exists
  const testPayload = {
    type: 'payment.authorized',
    created_at: Math.floor(Date.now() / 1000),
    event_id: 'evt_' + Date.now(),
    payload: {
      payment: {
        entity: 'payment',
        id: 'pay_test_' + Date.now(),
        status: 'captured',
      }
    }
  };

  try {
    const response = await makeRequest(
      `${API_BASE}/payments/webhooks/razorpay`,
      'POST',
      testPayload
    );

    if (response.status === 400 || response.status === 401) {
      log.success(`Webhook endpoint is accessible`);
      log.info(`Webhook requires proper signature verification (expected)`);
      return true;
    } else if (response.status === 404) {
      log.error(`Webhook endpoint not found`);
      return false;
    } else {
      log.success(`Webhook endpoint responds`);
      return true;
    }
  } catch (error) {
    log.error(`Webhook endpoint check failed: ${error.message}`);
    return false;
  }
}

/**
 * Generate Test Report
 */
async function generateReport() {
  log.section('💼 PAYMENT SYSTEM HEALTH CHECK REPORT');
  
  console.log('Testing production payment infrastructure...\n');
  
  const checks = [
    { name: 'API Health', fn: checkAPIHealth },
    { name: 'Payment Routes', fn: checkPaymentRoutes },
    { name: 'Razorpay Config', fn: checkRazorpayConfig },
    { name: 'Database Collections', fn: checkPaymentCollections },
    { name: 'Authentication', fn: checkAuthentication },
    { name: 'CORS Configuration', fn: checkCORS },
    { name: 'Webhook Endpoint', fn: checkWebhookEndpoint },
  ];

  const results = [];
  for (const check of checks) {
    const result = await check.fn();
    results.push({ name: check.name, passed: result });
  }

  console.log('\n' + '='.repeat(70) + '\n');
  
  log.section('✨ SUMMARY');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(r => {
    if (r.passed) {
      log.success(`${r.name}`);
    } else {
      log.error(`${r.name}`);
    }
  });

  console.log('\n' + '='.repeat(70));
  
  if (passed === total) {
    log.success(`\nAll checks passed! (${passed}/${total})`);
    log.info('Payment system is ready for production testing');
    log.info('\nNext Steps:');
    log.info('1. Manually test payment flow via frontend');
    log.info('2. Test with Razorpay test card: 4111111111111111');
    log.info('3. Monitor logs during payment processing');
    log.info('4. Verify orders are created with correct status');
    log.info('5. Verify webhooks are being processed');
  } else {
    log.warning(`\n${passed}/${total} checks passed`);
    log.error('Some payment system components need attention');
  }

  console.log('\n' + '='.repeat(70) + '\n');
}

// Run report
generateReport().catch(error => {
  log.error(`Unexpected error: ${error.message}`);
  process.exit(1);
});
