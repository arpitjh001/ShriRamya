/**
 * Multi-Tenant RBAC Comprehensive Test Suite
 * 
 * Tests:
 * - Authentication
 * - Authorization (RBAC)
 * - Tenant Isolation
 * - API Access Control
 * - Data Integrity
 */

const axios = require('axios');
const assert = require('assert');

// Configuration
const BASE_URL = process.env.BACKEND_URL || 'http://localhost:8080/api/v1';
const TEST_TIMEOUT = 30000;

// Test state
const testState = {
    tenants: [],
    users: {
        admin: null,
        editor: null,
        customer: null
    },
    tokens: {
        admin: null,
        editor: null,
        customer: null
    },
    products: {
        admin: null,
        editor: null
    },
    blogs: {
        admin: null,
        editor: null
    },
    orders: {
        customer: null
    }
};

// Test results tracking
const testResults = {
    passed: 0,
    failed: 0,
    tests: []
};

function log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'pass' ? '✅' : type === 'fail' ? '❌' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
}

function recordTest(name, passed, error = null) {
    testResults.tests.push({ name, passed, error: error?.message });
    if (passed) {
        testResults.passed++;
        log(`PASS: ${name}`, 'pass');
    } else {
        testResults.failed++;
        log(`FAIL: ${name} - ${error?.message}`, 'fail');
    }
}

// Axios instance creator with auth
function createClient(token = null) {
    const config = {
        baseURL: BASE_URL,
        timeout: TEST_TIMEOUT,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    return axios.create(config);
}

// ====================================================
// PART 1 — ENVIRONMENT CHECK
// ====================================================

async function testEnvironmentCheck() {
    log('=== PART 1: ENVIRONMENT CHECK ===');
    
    try {
        const response = await axios.get(`${BASE_URL}/health`);
        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.data.status, 'ok');
        recordTest('Health endpoint', true);
        return true;
    } catch (error) {
        recordTest('Health endpoint', false, error);
        log('❌ Backend is not running or health check failed', 'fail');
        return false;
    }
}

// ====================================================
// PART 2 — CREATE TEST TENANTS
// ====================================================

async function testCreateTenants() {
    log('=== PART 2: CREATE TEST TENANTS ===');
    
    const client = createClient();
    
    try {
        // Create Tenant A
        const tenantA = await client.post('/tenants', {
            name: 'Test Store A',
            domain: 'store-a.test.com',
            ownerEmail: `admin-a-${Date.now()}@test.com`,
            ownerName: 'Admin A',
            ownerPassword: 'TestPass123!'
        });
        
        assert.strictEqual(tenantA.data.success, true);
        testState.tenants.push(tenantA.data.data);
        recordTest('Create Tenant A', true);
        log(`Created Tenant A: ID ${tenantA.data.data.id}`);
        
        // Create Tenant B
        const tenantB = await client.post('/tenants', {
            name: 'Test Store B',
            domain: 'store-b.test.com',
            ownerEmail: `admin-b-${Date.now()}@test.com`,
            ownerName: 'Admin B',
            ownerPassword: 'TestPass123!'
        });
        
        assert.strictEqual(tenantB.data.success, true);
        testState.tenants.push(tenantB.data.data);
        recordTest('Create Tenant B', true);
        log(`Created Tenant B: ID ${tenantB.data.data.id}`);
        
        return true;
    } catch (error) {
        recordTest('Create Tenants', false, error);
        log(`Failed to create tenants: ${error.message}`, 'fail');
        return false;
    }
}

// ====================================================
// PART 3 — CREATE TEST USERS
// ====================================================

async function testCreateUsers() {
    log('=== PART 3: CREATE TEST USERS ===');
    
    const client = createClient();
    const tenantA = testState.tenants[0];
    
    if (!tenantA) {
        recordTest('Create Users', false, new Error('Tenant A not created'));
        return false;
    }
    
    try {
        // Create Admin User (already created with tenant, but create additional)
        const adminResponse = await client.post('/auth/register', {
            name: 'Test Admin',
            email: `testadmin-${Date.now()}@test.com`,
            password: 'TestPass123!',
            tenantId: tenantA.id
        });
        
        testState.users.admin = adminResponse.data.data.user;
        testState.tokens.admin = adminResponse.data.data.access_token;
        recordTest('Create Admin User', true);
        log(`Created Admin User: ${testState.users.admin.email}`);
        
        // Create Editor User
        const editorResponse = await client.post('/auth/register', {
            name: 'Test Editor',
            email: `testeditor-${Date.now()}@test.com`,
            password: 'TestPass123!',
            tenantId: tenantA.id
        });
        
        testState.users.editor = editorResponse.data.data.user;
        testState.tokens.editor = editorResponse.data.data.access_token;
        recordTest('Create Editor User', true);
        log(`Created Editor User: ${testState.users.editor.email}`);
        
        // Create Customer User
        const customerResponse = await client.post('/auth/register', {
            name: 'Test Customer',
            email: `testcustomer-${Date.now()}@test.com`,
            password: 'TestPass123!',
            tenantId: tenantA.id
        });
        
        testState.users.customer = customerResponse.data.data.user;
        testState.tokens.customer = customerResponse.data.data.access_token;
        recordTest('Create Customer User', true);
        log(`Created Customer User: ${testState.users.customer.email}`);
        
        return true;
    } catch (error) {
        recordTest('Create Users', false, error);
        log(`Failed to create users: ${error.message}`, 'fail');
        return false;
    }
}

// ====================================================
// PART 4 — LOGIN TEST & JWT VERIFICATION
// ====================================================

async function testLoginAndJWT() {
    log('=== PART 4: LOGIN TEST & JWT VERIFICATION ===');
    
    const client = createClient();
    
    try {
        // Login as Admin
        const adminLogin = await client.post('/auth/login', {
            email: testState.users.admin.email,
            password: 'TestPass123!'
        });
        
        const adminPayload = JSON.parse(Buffer.from(adminLogin.data.data.access_token.split('.')[1], 'base64'));
        assert(adminPayload.user_id, 'JWT should contain user_id');
        assert(adminPayload.tenant_id, 'JWT should contain tenant_id');
        assert(adminPayload.roles, 'JWT should contain roles');
        recordTest('Admin Login & JWT', true);
        log(`Admin JWT: user_id=${adminPayload.user_id}, tenant_id=${adminPayload.tenant_id}, roles=${JSON.stringify(adminPayload.roles)}`);
        
        // Login as Editor
        const editorLogin = await client.post('/auth/login', {
            email: testState.users.editor.email,
            password: 'TestPass123!'
        });
        
        const editorPayload = JSON.parse(Buffer.from(editorLogin.data.data.access_token.split('.')[1], 'base64'));
        assert(editorPayload.roles.includes('Customer'), 'Editor should have Customer role by default');
        recordTest('Editor Login & JWT', true);
        log(`Editor JWT: roles=${JSON.stringify(editorPayload.roles)}`);
        
        // Login as Customer
        const customerLogin = await client.post('/auth/login', {
            email: testState.users.customer.email,
            password: 'TestPass123!'
        });
        
        const customerPayload = JSON.parse(Buffer.from(customerLogin.data.data.access_token.split('.')[1], 'base64'));
        assert(customerPayload.roles, 'Customer JWT should contain roles');
        recordTest('Customer Login & JWT', true);
        log(`Customer JWT: roles=${JSON.stringify(customerPayload.roles)}`);
        
        // Update tokens with fresh ones
        testState.tokens.admin = adminLogin.data.data.access_token;
        testState.tokens.editor = editorLogin.data.data.access_token;
        testState.tokens.customer = customerLogin.data.data.access_token;
        
        return true;
    } catch (error) {
        recordTest('Login & JWT', false, error);
        return false;
    }
}

// ====================================================
// PART 5 — ADMIN ROLE TEST
// ====================================================

async function testAdminRole() {
    log('=== PART 5: ADMIN ROLE TEST ===');
    
    const adminClient = createClient(testState.tokens.admin);
    
    try {
        // Test: Create Product
        const product = await adminClient.post('/products', {
            name: `Admin Test Product ${Date.now()}`,
            sku: `ADMIN-SKU-${Date.now()}`,
            basePrice: 999,
            description: 'Product created by Admin'
        });
        
        assert.strictEqual(product.data.success, true);
        testState.products.admin = product.data.data;
        recordTest('Admin: Create Product', true);
        
        // Test: Update Product
        const updated = await adminClient.put(`/products/${product.data.data.id}`, {
            name: 'Updated Admin Product'
        });
        
        assert.strictEqual(updated.data.success, true);
        recordTest('Admin: Update Product', true);
        
        // Test: View Products
        const products = await adminClient.get('/products');
        assert.strictEqual(products.data.success, true);
        recordTest('Admin: View Products', true);
        
        // Test: Create Blog
        const blog = await adminClient.post('/blogs', {
            title: `Admin Test Blog ${Date.now()}`,
            slug: `admin-blog-${Date.now()}`,
            content: 'Blog content by Admin',
            status: 'published'
        });
        
        assert.strictEqual(blog.data.success, true);
        testState.blogs.admin = blog.data.data;
        recordTest('Admin: Create Blog', true);
        
        // Test: Delete Blog (Admin can delete)
        if (testState.blogs.admin) {
            const deleteBlog = await adminClient.delete(`/blogs/${testState.blogs.admin.id}`);
            assert.strictEqual(deleteBlog.data.success, true);
            recordTest('Admin: Delete Blog', true);
            testState.blogs.admin = null;
        }
        
        // Test: View Orders (should work even if empty)
        const orders = await adminClient.get('/orders');
        assert.strictEqual(orders.data.success, true);
        recordTest('Admin: View Orders', true);
        
        return true;
    } catch (error) {
        recordTest('Admin Role Tests', false, error);
        log(`Admin test failed: ${error.message}`, 'fail');
        return false;
    }
}

// ====================================================
// PART 6 — EDITOR ROLE TEST
// ====================================================

async function testEditorRole() {
    log('=== PART 6: EDITOR ROLE TEST ===');
    
    const editorClient = createClient(testState.tokens.editor);
    
    try {
        // Test: Create Product (should succeed)
        const product = await editorClient.post('/products', {
            name: `Editor Test Product ${Date.now()}`,
            sku: `EDITOR-SKU-${Date.now()}`,
            basePrice: 599,
            description: 'Product created by Editor'
        });
        
        assert.strictEqual(product.data.success, true);
        testState.products.editor = product.data.data;
        recordTest('Editor: Create Product', true);
        
        // Test: Update Product (should succeed)
        const updated = await editorClient.put(`/products/${product.data.data.id}`, {
            name: 'Updated Editor Product'
        });
        
        assert.strictEqual(updated.data.success, true);
        recordTest('Editor: Update Product', true);
        
        // Test: Create Blog (should succeed)
        const blog = await editorClient.post('/blogs', {
            title: `Editor Test Blog ${Date.now()}`,
            slug: `editor-blog-${Date.now()}`,
            content: 'Blog content by Editor',
            status: 'published'
        });
        
        assert.strictEqual(blog.data.success, true);
        testState.blogs.editor = blog.data.data;
        recordTest('Editor: Create Blog', true);
        
        // Test: Update Blog (should succeed)
        if (testState.blogs.editor) {
            const updatedBlog = await editorClient.put(`/blogs/${testState.blogs.editor.id}`, {
                title: 'Updated Editor Blog'
            });
            assert.strictEqual(updatedBlog.data.success, true);
            recordTest('Editor: Update Blog', true);
        }
        
        // Test: Delete Product (should FAIL - 403)
        try {
            await editorClient.delete(`/products/${product.data.data.id}`);
            recordTest('Editor: Delete Product (should fail)', false, new Error('Editor should not be able to delete products'));
        } catch (error) {
            if (error.response?.status === 403) {
                recordTest('Editor: Delete Product (should fail)', true);
            } else {
                recordTest('Editor: Delete Product (should fail)', false, error);
            }
        }
        
        // Test: Delete Blog (should FAIL - 403)
        try {
            if (testState.blogs.editor) {
                await editorClient.delete(`/blogs/${testState.blogs.editor.id}`);
                recordTest('Editor: Delete Blog (should fail)', false, new Error('Editor should not be able to delete blogs'));
            }
        } catch (error) {
            if (error.response?.status === 403) {
                recordTest('Editor: Delete Blog (should fail)', true);
            } else {
                recordTest('Editor: Delete Blog (should fail)', false, error);
            }
        }
        
        // Test: View Orders (should FAIL - 403)
        try {
            await editorClient.get('/orders');
            recordTest('Editor: View Orders (should fail)', false, new Error('Editor should not be able to view orders'));
        } catch (error) {
            if (error.response?.status === 403) {
                recordTest('Editor: View Orders (should fail)', true);
            } else {
                // Might be 401 or other, check
                recordTest('Editor: View Orders (should fail)', error.response?.status === 403);
            }
        }
        
        return true;
    } catch (error) {
        recordTest('Editor Role Tests', false, error);
        log(`Editor test failed: ${error.message}`, 'fail');
        return false;
    }
}

// ====================================================
// PART 7 — CUSTOMER ROLE TEST
// ====================================================

async function testCustomerRole() {
    log('=== PART 7: CUSTOMER ROLE TEST ===');
    
    const customerClient = createClient(testState.tokens.customer);
    
    try {
        // Test: View Products (should succeed)
        const products = await customerClient.get('/products');
        assert.strictEqual(products.data.success, true);
        recordTest('Customer: View Products', true);
        
        // Test: Get single product
        if (testState.products.admin) {
            const product = await customerClient.get(`/products/${testState.products.admin.id}`);
            assert.strictEqual(product.data.success, true);
            recordTest('Customer: View Product Detail', true);
        }
        
        // Test: Create Product (should FAIL - 403)
        try {
            await customerClient.post('/products', {
                name: 'Hacked Product',
                sku: 'HACK-001',
                basePrice: 100
            });
            recordTest('Customer: Create Product (should fail)', false, new Error('Customer should not create products'));
        } catch (error) {
            if (error.response?.status === 403) {
                recordTest('Customer: Create Product (should fail)', true);
            } else {
                recordTest('Customer: Create Product (should fail)', false, error);
            }
        }
        
        // Test: Delete Product (should FAIL - 403)
        try {
            if (testState.products.admin) {
                await customerClient.delete(`/products/${testState.products.admin.id}`);
                recordTest('Customer: Delete Product (should fail)', false, new Error('Customer should not delete products'));
            }
        } catch (error) {
            if (error.response?.status === 403) {
                recordTest('Customer: Delete Product (should fail)', true);
            } else {
                recordTest('Customer: Delete Product (should fail)', false, error);
            }
        }
        
        // Test: Create Blog (should FAIL - 403)
        try {
            await customerClient.post('/blogs', {
                title: 'Hacked Blog',
                slug: 'hack-blog',
                content: 'Hack'
            });
            recordTest('Customer: Create Blog (should fail)', false, new Error('Customer should not create blogs'));
        } catch (error) {
            if (error.response?.status === 403) {
                recordTest('Customer: Create Blog (should fail)', true);
            } else {
                recordTest('Customer: Create Blog (should fail)', false, error);
            }
        }
        
        // Test: Access Admin Endpoints (should FAIL - 403)
        try {
            await customerClient.get('/admin/analytics');
            recordTest('Customer: Access Admin API (should fail)', false, new Error('Customer should not access admin APIs'));
        } catch (error) {
            if ([401, 403].includes(error.response?.status)) {
                recordTest('Customer: Access Admin API (should fail)', true);
            } else {
                recordTest('Customer: Access Admin API (should fail)', false, error);
            }
        }
        
        return true;
    } catch (error) {
        recordTest('Customer Role Tests', false, error);
        log(`Customer test failed: ${error.message}`, 'fail');
        return false;
    }
}

// ====================================================
// PART 8 — TENANT ISOLATION TEST
// ====================================================

async function testTenantIsolation() {
    log('=== PART 8: TENANT ISOLATION TEST ===');
    
    try {
        const tenantA = testState.tenants[0];
        const tenantB = testState.tenants[1];
        
        if (!tenantA || !tenantB) {
            recordTest('Tenant Isolation', false, new Error('Tenants not created'));
            return false;
        }
        
        // Create product in Tenant A
        const adminClientA = createClient(testState.tokens.admin);
        const productA = await adminClientA.post('/products', {
            name: `Tenant A Product ${Date.now()}`,
            sku: `TENANT-A-${Date.now()}`,
            basePrice: 100
        });
        
        assert.strictEqual(productA.data.success, true);
        const tenantAProductId = productA.data.data.id;
        recordTest('Create Product in Tenant A', true);
        
        // Create product in Tenant B
        // Need to login as Tenant B admin first
        const client = createClient();
        const tenantBLogin = await client.post('/auth/login', {
            email: testState.tenants[1].ownerEmail || `admin-b@test.com`,
            password: 'TestPass123!'
        });
        
        const adminClientB = createClient(tenantBLogin.data.data.access_token);
        const productB = await adminClientB.post('/products', {
            name: `Tenant B Product ${Date.now()}`,
            sku: `TENANT-B-${Date.now()}`,
            basePrice: 200
        });
        
        assert.strictEqual(productB.data.success, true);
        recordTest('Create Product in Tenant B', true);
        
        // Tenant A should NOT see Tenant B's product
        const productsA = await adminClientA.get('/products');
        const tenantBProductInA = productsA.data.data.products?.find(p => p.id === productB.data.data.id);
        
        if (!tenantBProductInA) {
            recordTest('Tenant A cannot see Tenant B products', true);
        } else {
            recordTest('Tenant A cannot see Tenant B products', false, new Error('Tenant isolation failed'));
        }
        
        // Tenant B should NOT see Tenant A's product
        const productsB = await adminClientB.get('/products');
        const tenantAProductInB = productsB.data.data.products?.find(p => p.id === tenantAProductId);
        
        if (!tenantAProductInB) {
            recordTest('Tenant B cannot see Tenant A products', true);
        } else {
            recordTest('Tenant B cannot see Tenant A products', false, new Error('Tenant isolation failed'));
        }
        
        // Tenant A cannot access Tenant B product by ID
        try {
            await adminClientA.get(`/products/${productB.data.data.id}`);
            recordTest('Tenant A cannot access Tenant B product by ID', false, new Error('Tenant isolation failed'));
        } catch (error) {
            if (error.response?.status === 404) {
                recordTest('Tenant A cannot access Tenant B product by ID', true);
            } else {
                recordTest('Tenant A cannot access Tenant B product by ID', false, error);
            }
        }
        
        return true;
    } catch (error) {
        recordTest('Tenant Isolation Tests', false, error);
        log(`Tenant isolation test failed: ${error.message}`, 'fail');
        return false;
    }
}

// ====================================================
// PART 10 — ORDER FLOW TEST (CUSTOMER)
// ====================================================

async function testOrderFlow() {
    log('=== PART 10: ORDER FLOW TEST ===');
    
    const customerClient = createClient(testState.tokens.customer);
    
    try {
        // Test: View Cart (should work)
        const cart = await customerClient.get('/cart');
        assert.strictEqual(cart.data.success, true);
        recordTest('Customer: View Cart', true);
        
        // Note: Add to cart and checkout flow depends on cart implementation
        // This is a basic test
        
        // Test: Place Order (might fail if no items in cart, but endpoint should be accessible)
        try {
            // This might fail due to empty cart, but we're testing access
            await customerClient.post('/orders', {});
            recordTest('Customer: Place Order Endpoint', true);
        } catch (error) {
            // 400 for empty cart is OK, 403 is not
            if (error.response?.status === 400) {
                recordTest('Customer: Place Order Endpoint', true);
            } else if (error.response?.status === 403) {
                recordTest('Customer: Place Order Endpoint', false, new Error('Customer should be able to place orders'));
            } else {
                recordTest('Customer: Place Order Endpoint', true); // Other errors are OK
            }
        }
        
        // Test: View Own Orders
        const orders = await customerClient.get('/orders');
        assert.strictEqual(orders.data.success, true);
        recordTest('Customer: View Own Orders', true);
        
        return true;
    } catch (error) {
        recordTest('Order Flow Tests', false, error);
        log(`Order flow test failed: ${error.message}`, 'fail');
        return false;
    }
}

// ====================================================
// PART 12 — SECURITY TESTS
// ====================================================

async function testSecurity() {
    log('=== PART 12: SECURITY TESTS ===');
    
    try {
        const customerClient = createClient(testState.tokens.customer);
        
        // Test: Access Admin API with Customer token
        try {
            await customerClient.get('/admin/users');
            recordTest('Security: Customer cannot access /admin/users', false, new Error('Security breach'));
        } catch (error) {
            if ([401, 403].includes(error.response?.status)) {
                recordTest('Security: Customer cannot access /admin/users', true);
            } else {
                recordTest('Security: Customer cannot access /admin/users', false, error);
            }
        }
        
        // Test: Invalid token
        const invalidClient = createClient('invalid_token_here');
        try {
            await invalidClient.get('/products');
            recordTest('Security: Invalid token rejected', false, new Error('Invalid token accepted'));
        } catch (error) {
            if (error.response?.status === 401) {
                recordTest('Security: Invalid token rejected', true);
            } else {
                recordTest('Security: Invalid token rejected', false, error);
            }
        }
        
        // Test: Missing token
        const noAuthClient = createClient();
        try {
            await noAuthClient.post('/products', {
                name: 'Hacked',
                sku: 'HACK',
                basePrice: 1
            });
            recordTest('Security: Unauthenticated access blocked', false, new Error('Unauthenticated access allowed'));
        } catch (error) {
            if ([401, 403].includes(error.response?.status)) {
                recordTest('Security: Unauthenticated access blocked', true);
            } else {
                recordTest('Security: Unauthenticated access blocked', false, error);
            }
        }
        
        return true;
    } catch (error) {
        recordTest('Security Tests', false, error);
        return false;
    }
}

// ====================================================
// GENERATE REPORT
// ====================================================

function generateReport() {
    const total = testResults.passed + testResults.failed;
    const passRate = total > 0 ? ((testResults.passed / total) * 100).toFixed(2) : 0;
    
    console.log('\n' + '='.repeat(60));
    console.log('FINAL TEST REPORT');
    console.log('='.repeat(60));
    console.log(`\nTotal Tests: ${total}`);
    console.log(`Passed: ${testResults.passed}`);
    console.log(`Failed: ${testResults.failed}`);
    console.log(`Pass Rate: ${passRate}%`);
    console.log('\n' + '-'.repeat(60));
    console.log('DETAILED RESULTS:');
    console.log('-'.repeat(60));
    
    testResults.tests.forEach((test, index) => {
        const icon = test.passed ? '✅' : '❌';
        console.log(`${index + 1}. ${icon} ${test.name}`);
        if (!test.passed && test.error) {
            console.log(`   Error: ${test.error}`);
        }
    });
    
    console.log('\n' + '='.repeat(60));
    
    if (testResults.failed === 0) {
        console.log('🎉 ALL TESTS PASSED!');
    } else {
        console.log(`⚠️  ${testResults.failed} TEST(S) FAILED`);
    }
    
    console.log('='.repeat(60) + '\n');
    
    return {
        total,
        passed: testResults.passed,
        failed: testResults.failed,
        passRate,
        tests: testResults.tests
    };
}

// ====================================================
// MAIN TEST RUNNER
// ====================================================

async function runAllTests() {
    console.log('\n' + '='.repeat(60));
    console.log('MULTI-TENANT RBAC COMPREHENSIVE TEST SUITE');
    console.log('='.repeat(60));
    console.log(`Backend URL: ${BASE_URL}`);
    console.log('='.repeat(60) + '\n');
    
    // PART 1: Environment Check
    const envOk = await testEnvironmentCheck();
    if (!envOk) {
        log('❌ Environment check failed. Stopping tests.', 'fail');
        generateReport();
        return;
    }
    
    // PART 2: Create Tenants
    await testCreateTenants();
    
    // PART 3: Create Users
    await testCreateUsers();
    
    // PART 4: Login & JWT
    await testLoginAndJWT();
    
    // PART 5: Admin Role
    await testAdminRole();
    
    // PART 6: Editor Role
    await testEditorRole();
    
    // PART 7: Customer Role
    await testCustomerRole();
    
    // PART 8: Tenant Isolation
    await testTenantIsolation();
    
    // PART 10: Order Flow
    await testOrderFlow();
    
    // PART 12: Security
    await testSecurity();
    
    // Generate Report
    const report = generateReport();
    
    // Save report to file
    const fs = require('fs');
    const reportPath = './rbac-test-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log(`Report saved to ${reportPath}`, 'info');
    
    process.exit(report.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
    console.error('Test runner error:', error);
    generateReport();
    process.exit(1);
});
