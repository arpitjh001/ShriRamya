/**
 * Order Processing Engine API Test Script
 * Tests all order-related endpoints per the ORDER_PROCESSING_ENGINE.md documentation
 */

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080/api/v1';

// Test credentials
const ADMIN_CREDENTIALS = {
    email: 'admin@shriramya.com',
    password: 'Admin@123',
};

// Store tokens
let tokens = {
    admin: null,
};

// Test results
const results = {
    passed: [],
    failed: [],
};

// Color codes
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

// Log helpers
const log = {
    header: (msg) => console.log(`\n${colors.cyan}${colors.bold}═══════════════════════════════════════════════════════════${colors.reset}`),
    subheader: (msg) => console.log(`\n${colors.blue}${colors.bold}${msg}${colors.reset}`),
    success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
    warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
    info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
};

/**
 * Login and get token
 */
async function login(email, password) {
    try {
        const response = await axios.post(`${BASE_URL}/auth/login`, {
            email,
            password
        });

        if (response.data.success) {
            return response.data.data.access_token;
        }
        return null;
    } catch (error) {
        console.log(`${colors.red}Login failed: ${error.response?.data?.message || error.message}${colors.reset}`);
        return null;
    }
}

/**
 * Test an endpoint
 */
async function testEndpoint(name, method, url, options = {}) {
    const {
        headers = {},
        data = null,
        expectedStatus = 200,
        shouldFail = false,
        description = ''
    } = options;

    const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;

    try {
        const config = {
            method,
            url: fullUrl,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        if (data) {
            config.data = data;
        }

        const response = await axios(config);
        const statusOk = response.status === expectedStatus;

        if (shouldFail) {
            log.error(`${name} - Expected failure but got success (${response.status})`);
            results.failed.push({ name, reason: `Expected failure but got status ${response.status}` });
            return false;
        }

        if (statusOk) {
            log.success(`${name} - ${description || `Status: ${response.status}`}`);
            results.passed.push({ name, status: response.status });
            return true;
        } else {
            log.error(`${name} - Expected ${expectedStatus} but got ${response.status}`);
            results.failed.push({ name, reason: `Expected ${expectedStatus} but got ${response.status}` });
            return false;
        }
    } catch (error) {
        const status = error.response?.status || 0;
        const message = error.response?.data?.message || error.message;

        if (shouldFail && (status === 401 || status === 403)) {
            log.success(`${name} - Correctly rejected (${status})`);
            results.passed.push({ name, status, rejected: true });
            return true;
        }

        if (status === expectedStatus) {
            log.success(`${name} - ${description || `Status: ${status}`}`);
            results.passed.push({ name, status });
            return true;
        }

        log.error(`${name} - ${message} (${status})`);
        results.failed.push({ name, reason: message, status });
        return false;
    }
}

/**
 * Test Authentication for Order APIs
 */
async function testAuthentication() {
    log.subheader('🔐 Testing Authentication for Order APIs');

    // Try to login with admin credentials
    const adminToken = await login(ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
    
    if (adminToken) {
        tokens.admin = adminToken;
        log.success('Admin login successful');
    } else {
        log.error('Admin login failed - check if admin user is seeded');
        log.info('Run: npm run seed:admin in backend_node directory');
        results.failed.push({ name: 'Admin Login', reason: 'Could not obtain token' });
        return false;
    }

    // Test unauthenticated access rejection
    await testEndpoint(
        'Get My Orders (No Auth)',
        'GET',
        '/orders/my',
        {
            shouldFail: true,
            description: 'Should reject unauthenticated request'
        }
    );

    return true;
}

/**
 * Test Customer Order APIs
 */
async function testCustomerAPIs() {
    log.subheader('👤 Testing Customer Order APIs');

    if (!tokens.admin) {
        log.warning('Skipping customer tests - no admin token');
        return;
    }

    // Get customer's orders
    await testEndpoint(
        'Get My Orders',
        'GET',
        '/orders/my',
        {
            headers: { 'Authorization': `Bearer ${tokens.admin}` },
            expectedStatus: 200,
            description: 'Get customer orders'
        }
    );

    // Create order - empty items (should fail validation)
    await testEndpoint(
        'Create Order (Empty Items)',
        'POST',
        '/orders',
        {
            headers: { 'Authorization': `Bearer ${tokens.admin}` },
            data: {
                items: [],
                billing: {
                    firstName: 'Test',
                    lastName: 'User',
                    address1: '123 Test St',
                    city: 'Mumbai',
                    state: 'Maharashtra',
                    postcode: '400001',
                    country: 'IN',
                    phone: '9876543210'
                },
                paymentMethod: 'cod'
            },
            expectedStatus: 400,
            description: 'Should reject empty items'
        }
    );

    // Create order - missing payment method (should fail validation)
    await testEndpoint(
        'Create Order (Missing Payment)',
        'POST',
        '/orders',
        {
            headers: { 'Authorization': `Bearer ${tokens.admin}` },
            data: {
                items: [{ productId: 1, quantity: 1 }],
                billing: {
                    firstName: 'Test',
                    lastName: 'User',
                    address1: '123 Test St',
                    city: 'Mumbai',
                    state: 'Maharashtra',
                    postcode: '400001',
                    country: 'IN',
                    phone: '9876543210'
                }
            },
            expectedStatus: 400,
            description: 'Should reject missing payment method'
        }
    );
}

/**
 * Test Admin Order APIs
 */
async function testAdminAPIs() {
    log.subheader('👑 Testing Admin Order APIs');

    if (!tokens.admin) {
        log.warning('Skipping admin tests - no admin token');
        return;
    }

    // Get all orders
    await testEndpoint(
        'Get All Orders',
        'GET',
        '/orders/admin/all',
        {
            headers: { 'Authorization': `Bearer ${tokens.admin}` },
            expectedStatus: 200,
            description: 'Admin can view all orders'
        }
    );

    // Get order analytics
    await testEndpoint(
        'Get Order Analytics',
        'GET',
        '/orders/admin/analytics/orders',
        {
            headers: { 'Authorization': `Bearer ${tokens.admin}` },
            expectedStatus: 200,
            description: 'Admin can view order analytics'
        }
    );

    // Get pending shipments
    await testEndpoint(
        'Get Pending Shipments',
        'GET',
        '/orders/admin/shipments/pending',
        {
            headers: { 'Authorization': `Bearer ${tokens.admin}` },
            expectedStatus: 200,
            description: 'Admin can view pending shipments'
        }
    );

    // Get ready to ship
    await testEndpoint(
        'Get Ready To Ship',
        'GET',
        '/orders/admin/shipments/ready-to-ship',
        {
            headers: { 'Authorization': `Bearer ${tokens.admin}` },
            expectedStatus: 200,
            description: 'Admin can view ready to ship orders'
        }
    );

    // Get all shipments
    await testEndpoint(
        'Get All Shipments',
        'GET',
        '/orders/admin/shipments',
        {
            headers: { 'Authorization': `Bearer ${tokens.admin}` },
            expectedStatus: 200,
            description: 'Admin can view all shipments'
        }
    );
}

/**
 * Test Order State Machine
 */
async function testStateMachine() {
    log.subheader('🔄 Testing Order State Machine');

    if (!tokens.admin) {
        log.warning('Skipping state machine tests - no admin token');
        return;
    }

    // Test updating order status without order ID (should fail)
    await testEndpoint(
        'Update Order Status (No ID)',
        'PATCH',
        '/orders/admin/invalid-id/status',
        {
            headers: { 'Authorization': `Bearer ${tokens.admin}` },
            data: { status: 'processing' },
            expectedStatus: 400,
            description: 'Should reject invalid order ID'
        }
    );
}

/**
 * Test Webhook Endpoints
 */
async function testWebhooks() {
    log.subheader('🔗 Testing Webhook Endpoints');

    // Razorpay webhook (should accept POST without signature for testing)
    await testEndpoint(
        'Razorpay Webhook',
        'POST',
        '/orders/webhooks/payment/razorpay',
        {
            data: { event: 'payment.captured' },
            expectedStatus: 400,
            description: 'Webhook endpoint exists'
        }
    );

    // Stripe webhook
    await testEndpoint(
        'Stripe Webhook',
        'POST',
        '/orders/webhooks/payment/stripe',
        {
            data: { type: 'payment_intent.succeeded' },
            expectedStatus: 400,
            description: 'Webhook endpoint exists'
        }
    );
}

/**
 * Test Refund APIs
 */
async function testRefundAPIs() {
    log.subheader('💰 Testing Refund APIs');

    if (!tokens.admin) {
        log.warning('Skipping refund tests - no admin token');
        return;
    }

    // Get refund details (invalid ID - should fail gracefully)
    await testEndpoint(
        'Get Refund (Invalid ID)',
        'GET',
        '/orders/admin/refunds/invalid-id',
        {
            headers: { 'Authorization': `Bearer ${tokens.admin}` },
            expectedStatus: 400,
            description: 'Should handle invalid refund ID'
        }
    );
}

/**
 * Print Summary
 */
function printSummary() {
    log.header('');
    console.log(`\n${colors.bold}ORDER PROCESSING ENGINE TEST SUMMARY${colors.reset}`);
    console.log(`${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
    log.success(`Passed: ${results.passed.length}`);
    log.error(`Failed: ${results.failed.length}`);

    if (results.failed.length > 0) {
        console.log(`\n${colors.red}${colors.bold}Failed Tests:${colors.reset}`);
        results.failed.forEach(test => {
            console.log(`  ${colors.red}✗${colors.reset} ${test.name}: ${test.reason}`);
        });
    }

    const total = results.passed.length + results.failed.length;
    const passRate = total > 0 ? ((results.passed.length / total) * 100).toFixed(2) : 0;

    console.log(`\n${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bold}Total Tests: ${total} | Pass Rate: ${passRate}%${colors.reset}`);
    console.log(`${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}\n`);

    return results.failed.length === 0;
}

/**
 * Main Test Runner
 */
async function runAllTests() {
    log.header('');
    console.log(`${colors.bold}🚀 ORDER PROCESSING ENGINE API TEST${colors.reset}`);
    console.log(`${colors.cyan}Base URL: ${BASE_URL}${colors.reset}`);
    console.log(`${colors.cyan}Documentation: docs/backend/ORDER_PROCESSING_ENGINE.md${colors.reset}`);
    log.header('');

    try {
        // Run test suites
        const authOk = await testAuthentication();
        
        if (authOk) {
            await testCustomerAPIs();
            await testAdminAPIs();
            await testStateMachine();
            await testWebhooks();
            await testRefundAPIs();
        }

        // Print summary
        const allPassed = printSummary();

        // Exit with appropriate code
        process.exit(allPassed ? 0 : 1);
    } catch (error) {
        log.error(`Test suite failed: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
}

// Run tests
runAllTests();
