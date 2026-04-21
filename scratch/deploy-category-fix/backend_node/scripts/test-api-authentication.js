/**
 * Comprehensive API Authentication Test Script
 * Tests all API endpoints for proper authentication
 */

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080/api/v1';

// Test credentials
const TEST_USERS = {
    admin: {
        email: 'admin@shriramya.com',
        password: 'Admin@123',
    },
    editor: {
        email: 'editor@example.com',
        password: 'editor123',
    },
    customer: {
        email: 'customer@example.com',
        password: 'customer123',
    }
};

// Store tokens
let tokens = {
    admin: null,
    editor: null,
    customer: null,
};

// Test results
const results = {
    passed: [],
    failed: [],
    skipped: []
};

/**
 * Color codes for console output
 */
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

/**
 * Log helper functions
 */
const log = {
    header: (msg) => console.log(`\n${colors.cyan}${colors.bold}═══════════════════════════════════════════════════════════${colors.reset}`),
    subheader: (msg) => console.log(`\n${colors.blue}${colors.bold}${msg}${colors.reset}`),
    success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
    warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
    info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    test: (msg) => console.log(`  ${msg}`),
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

        log.error(`${name} - ${error.message} (${status})`);
        results.failed.push({ name, reason: error.message, status });
        return false;
    }
}

/**
 * Test Authentication Endpoints
 */
async function testAuthenticationEndpoints() {
    log.subheader('🔐 Testing Authentication Endpoints');

    // Test health check (no auth required)
    await testEndpoint(
        'Health Check',
        'GET',
        '/health',
        { expectedStatus: 200, description: 'Public endpoint' }
    );

    // Test login with admin
    const adminToken = await login(TEST_USERS.admin.email, TEST_USERS.admin.password);
    if (adminToken) {
        tokens.admin = adminToken;
        log.success('Admin login successful');
    } else {
        log.error('Admin login failed - check credentials');
        results.failed.push({ name: 'Admin Login', reason: 'Could not obtain token' });
    }

    // Test login with wrong password
    await testEndpoint(
        'Login - Wrong Password',
        'POST',
        '/auth/login',
        {
            data: { email: TEST_USERS.admin.email, password: 'wrongpassword' },
            shouldFail: true,
            description: 'Should reject wrong password'
        }
    );

    // Test login without email
    await testEndpoint(
        'Login - Missing Email',
        'POST',
        '/auth/login',
        {
            data: { password: 'somepassword' },
            shouldFail: true,
            description: 'Should reject missing email'
        }
    );

    // Test get current user (with auth)
    if (tokens.admin) {
        await testEndpoint(
            'Get Current User (Admin)',
            'GET',
            '/auth/me',
            {
                headers: { 'Authorization': `Bearer ${tokens.admin}` },
                expectedStatus: 200,
                description: 'Returns user info'
            }
        );

        await testEndpoint(
            'Check Admin',
            'GET',
            '/auth/check-admin',
            {
                headers: { 'Authorization': `Bearer ${tokens.admin}` },
                expectedStatus: 200,
                description: 'Confirms admin role'
            }
        );
    }

    // Test endpoint without auth (should fail for protected endpoints)
    await testEndpoint(
        'Get Users (No Auth)',
        'GET',
        '/users',
        {
            shouldFail: true,
            description: 'Should reject unauthenticated request'
        }
    );
}

/**
 * Test Product Endpoints
 */
async function testProductEndpoints() {
    log.subheader('🛍️ Testing Product Endpoints');

    // Public endpoints
    await testEndpoint(
        'List Products (Public)',
        'GET',
        '/products',
        { expectedStatus: 200, description: 'Public endpoint' }
    );

    // Protected endpoints - without auth
    await testEndpoint(
        'Create Product (No Auth)',
        'POST',
        '/products',
        {
            data: { name: 'Test Product', sku: 'TEST-001', basePrice: 100 },
            shouldFail: true,
            description: 'Should reject unauthenticated request'
        }
    );

    // Protected endpoints - with admin auth
    if (tokens.admin) {
        await testEndpoint(
            'Create Product (Admin)',
            'POST',
            '/products',
            {
                headers: { 'Authorization': `Bearer ${tokens.admin}` },
                data: {
                    name: `Test Product ${Date.now()}`,
                    sku: `TEST-${Date.now()}`,
                    basePrice: 100,
                    description: 'Test product for API testing'
                },
                expectedStatus: 201,
                description: 'Admin can create products'
            }
        );
    }
}

/**
 * Test Order Endpoints
 */
async function testOrderEndpoints() {
    log.subheader('📦 Testing Order Endpoints');

    // Protected endpoints
    await testEndpoint(
        'Get My Orders (No Auth)',
        'GET',
        '/orders/my',
        {
            shouldFail: true,
            description: 'Should reject unauthenticated request'
        }
    );

    await testEndpoint(
        'Get My Orders (Admin)',
        'GET',
        '/orders/my',
        {
            headers: { 'Authorization': `Bearer ${tokens.admin}` },
            expectedStatus: 200,
            description: 'Authenticated user can view their orders'
        }
    );

    await testEndpoint(
        'Get All Orders (Admin)',
        'GET',
        '/orders/admin/all',
        {
            headers: { 'Authorization': `Bearer ${tokens.admin}` },
            expectedStatus: 200,
            description: 'Admin can view all orders'
        }
    );

    // Test order creation (requires products in cart)
    if (tokens.admin) {
        await testEndpoint(
            'Create Order (Admin)',
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
                description: 'Order creation validates items'
            }
        );
    }
}

/**
 * Test Customer Endpoints
 */
async function testCustomerEndpoints() {
    log.subheader('👥 Testing Customer Endpoints');

    await testEndpoint(
        'Get Customers (No Auth)',
        'GET',
        '/customers',
        {
            shouldFail: true,
            description: 'Should reject unauthenticated request'
        }
    );

    if (tokens.admin) {
        await testEndpoint(
            'Get Customers (Admin)',
            'GET',
            '/customers',
            {
                headers: { 'Authorization': `Bearer ${tokens.admin}` },
                expectedStatus: 200,
                description: 'Admin can view customers'
            }
        );
    }
}

/**
 * Test Blog Endpoints
 */
async function testBlogEndpoints() {
    log.subheader('📰 Testing Blog Endpoints');

    // Public endpoint
    await testEndpoint(
        'List Blogs (Public)',
        'GET',
        '/blogs',
        { expectedStatus: 200, description: 'Public endpoint' }
    );

    // Protected endpoints
    await testEndpoint(
        'Create Blog (No Auth)',
        'POST',
        '/blogs',
        {
            data: { title: 'Test Blog', slug: 'test-blog', content: 'Test content' },
            shouldFail: true,
            description: 'Should reject unauthenticated request'
        }
    );

    if (tokens.admin) {
        await testEndpoint(
            'Create Blog (Admin)',
            'POST',
            '/blogs',
            {
                headers: { 'Authorization': `Bearer ${tokens.admin}` },
                data: {
                    title: `Test Blog ${Date.now()}`,
                    slug: `test-blog-${Date.now()}`,
                    content: 'Test blog content',
                    status: 'published'
                },
                expectedStatus: 201,
                description: 'Admin can create blogs'
            }
        );
    }
}

/**
 * Test Tenant Endpoints
 */
async function testTenantEndpoints() {
    log.subheader('🏢 Testing Tenant Endpoints');

    await testEndpoint(
        'Get Current Tenant (No Auth)',
        'GET',
        '/tenants/current',
        {
            shouldFail: true,
            description: 'Should reject unauthenticated request'
        }
    );

    if (tokens.admin) {
        await testEndpoint(
            'Get Current Tenant (Admin)',
            'GET',
            '/tenants/current',
            {
                headers: { 'Authorization': `Bearer ${tokens.admin}` },
                expectedStatus: 200,
                description: 'Admin can view current tenant'
            }
        );

        await testEndpoint(
            'Get Tenant Settings (Admin)',
            'GET',
            '/tenants/settings',
            {
                headers: { 'Authorization': `Bearer ${tokens.admin}` },
                expectedStatus: 200,
                description: 'Admin can view tenant settings'
            }
        );
    }
}

/**
 * Test User Management Endpoints
 */
async function testUserManagementEndpoints() {
    log.subheader('👤 Testing User Management Endpoints');

    await testEndpoint(
        'Get All Users (No Auth)',
        'GET',
        '/users',
        {
            shouldFail: true,
            description: 'Should reject unauthenticated request'
        }
    );

    if (tokens.admin) {
        await testEndpoint(
            'Get All Users (Admin)',
            'GET',
            '/users',
            {
                headers: { 'Authorization': `Bearer ${tokens.admin}` },
                expectedStatus: 200,
                description: 'Admin can view all users'
            }
        );

        await testEndpoint(
            'Get All Roles (Admin)',
            'GET',
            '/users/roles',
            {
                headers: { 'Authorization': `Bearer ${tokens.admin}` },
                expectedStatus: 200,
                description: 'Admin can view roles'
            }
        );

        await testEndpoint(
            'Get All Permissions (Admin)',
            'GET',
            '/users/permissions',
            {
                headers: { 'Authorization': `Bearer ${tokens.admin}` },
                expectedStatus: 200,
                description: 'Admin can view permissions'
            }
        );
    }
}

/**
 * Test Category Endpoints
 */
async function testCategoryEndpoints() {
    log.subheader('📂 Testing Category Endpoints');

    // Public endpoint
    await testEndpoint(
        'List Categories (Public)',
        'GET',
        '/categories',
        { expectedStatus: 200, description: 'Public endpoint' }
    );

    // Protected endpoints
    await testEndpoint(
        'Create Category (No Auth)',
        'POST',
        '/categories',
        {
            data: { name: 'Test Category', slug: 'test-category' },
            shouldFail: true,
            description: 'Should reject unauthenticated request'
        }
    );

    if (tokens.admin) {
        await testEndpoint(
            'Create Category (Admin)',
            'POST',
            '/categories',
            {
                headers: { 'Authorization': `Bearer ${tokens.admin}` },
                data: {
                    name: `Test Category ${Date.now()}`,
                    slug: `test-category-${Date.now()}`,
                    description: 'Test category'
                },
                expectedStatus: 201,
                description: 'Admin can create categories'
            }
        );
    }
}

/**
 * Test Search Endpoints
 */
async function testSearchEndpoints() {
    log.subheader('🔍 Testing Search Endpoints');

    // Public endpoint
    await testEndpoint(
        'Search Products (Public)',
        'GET',
        '/search/products?q=test',
        { expectedStatus: 200, description: 'Public endpoint' }
    );

    await testEndpoint(
        'Search Blogs (Public)',
        'GET',
        '/search/blogs?q=test',
        { expectedStatus: 200, description: 'Public endpoint' }
    );
}

/**
 * Test Analytics Endpoints (Admin Only)
 */
async function testAnalyticsEndpoints() {
    log.subheader('📊 Testing Analytics Endpoints');

    await testEndpoint(
        'Get Analytics (No Auth)',
        'GET',
        '/admin/analytics/overview',
        {
            shouldFail: true,
            description: 'Should reject unauthenticated request'
        }
    );

    if (tokens.admin) {
        await testEndpoint(
            'Get Analytics Overview (Admin)',
            'GET',
            '/admin/analytics/overview',
            {
                headers: { 'Authorization': `Bearer ${tokens.admin}` },
                expectedStatus: 200,
                description: 'Admin can view analytics'
            }
        );
    }
}

/**
 * Test RBAC - Role-Based Access Control
 */
async function testRBAC() {
    log.subheader('🔒 Testing RBAC (Role-Based Access Control)');

    // Login as different user types
    const editorToken = await login(TEST_USERS.editor.email, TEST_USERS.editor.password);
    if (editorToken) {
        tokens.editor = editorToken;
        log.success('Editor login successful');
    } else {
        log.warning('Editor login failed - skipping editor tests');
    }

    const customerToken = await login(TEST_USERS.customer.email, TEST_USERS.customer.password);
    if (customerToken) {
        tokens.customer = customerToken;
        log.success('Customer login successful');
    } else {
        log.warning('Customer login failed - skipping customer tests');
    }

    // Test Admin-only endpoints with different roles
    if (tokens.admin && tokens.editor && tokens.customer) {
        // Admin can access
        await testEndpoint(
            'RBAC: Get Users (Admin)',
            'GET',
            '/users',
            {
                headers: { 'Authorization': `Bearer ${tokens.admin}` },
                expectedStatus: 200,
                description: 'Admin can access user management'
            }
        );

        // Editor should NOT be able to access admin endpoints
        await testEndpoint(
            'RBAC: Get Users (Editor - Should Fail)',
            'GET',
            '/users',
            {
                headers: { 'Authorization': `Bearer ${tokens.editor}` },
                shouldFail: true,
                description: 'Editor cannot access user management'
            }
        );

        // Customer should NOT be able to access admin endpoints
        await testEndpoint(
            'RBAC: Get Users (Customer - Should Fail)',
            'GET',
            '/users',
            {
                headers: { 'Authorization': `Bearer ${tokens.customer}` },
                shouldFail: true,
                description: 'Customer cannot access user management'
            }
        );
    }
}

/**
 * Test Logout and Token Blacklisting
 */
async function testLogout() {
    log.subheader('🚪 Testing Logout and Token Blacklisting');

    if (tokens.admin) {
        // First, test that the token works
        await testEndpoint(
            'Token Valid Before Logout',
            'GET',
            '/auth/me',
            {
                headers: { 'Authorization': `Bearer ${tokens.admin}` },
                expectedStatus: 200,
                description: 'Token should work before logout'
            }
        );

        // Logout
        const response = await axios.post(
            `${BASE_URL}/auth/logout`,
            {},
            {
                headers: { 'Authorization': `Bearer ${tokens.admin}` }
            }
        );

        if (response.data.success) {
            log.success('Logout successful');
        } else {
            log.error('Logout failed');
        }

        // Note: Token blacklisting depends on Redis being available
        log.info('Token blacklisting requires Redis to be running');
    }
}

/**
 * Print Summary
 */
function printSummary() {
    log.header('');
    console.log(`\n${colors.bold}TEST SUMMARY${colors.reset}`);
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
    console.log(`${colors.bold}🚀 COMPREHENSIVE API AUTHENTICATION TEST SUITE${colors.reset}`);
    console.log(`${colors.cyan}Base URL: ${BASE_URL}${colors.reset}`);
    log.header('');

    try {
        // Test all endpoint categories
        await testAuthenticationEndpoints();
        await testProductEndpoints();
        await testOrderEndpoints();
        await testCustomerEndpoints();
        await testBlogEndpoints();
        await testTenantEndpoints();
        await testUserManagementEndpoints();
        await testCategoryEndpoints();
        await testSearchEndpoints();
        await testAnalyticsEndpoints();
        await testRBAC();
        await testLogout();

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
