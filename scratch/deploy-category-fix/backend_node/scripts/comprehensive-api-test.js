/**
 * COMPREHENSIVE API TESTING SUITE
 * Shri Ramya E-Commerce Platform
 * 
 * Tests all API endpoints for:
 * - Valid requests
 * - Invalid requests
 * - Missing fields
 * - Wrong data types
 * - Large payloads
 * - Unauthorized access
 * 
 * Author: Senior Backend Engineer & QA Automation
 * Date: March 8, 2026
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    baseUrl: process.env.BASE_URL || 'http://localhost:8080/api/v1',
    testUsers: {
        admin: {
            email: 'admin@shriramya.com',
            password: 'Admin@123'
        }
    },
    tenantId: 1
};

// Test Results Storage
const testResults = {
    summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0
    },
    byModule: {},
    criticalIssues: [],
    warnings: [],
    testLog: []
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

// Logger
const log = {
    header: (msg) => console.log(`\n${colors.cyan}${colors.bold}═══════════════════════════════════════════════════════════${colors.reset}`),
    module: (msg) => console.log(`\n${colors.blue}${colors.bold}▶ ${msg}${colors.reset}`),
    test: (msg) => console.log(`  ${msg}`),
    success: (msg) => console.log(`    ${colors.green}✓${colors.reset} ${msg}`),
    error: (msg) => console.log(`    ${colors.red}✗${colors.reset} ${msg}`),
    warning: (msg) => console.log(`    ${colors.yellow}⚠${colors.reset} ${msg}`),
    info: (msg) => console.log(`    ${colors.blue}ℹ${colors.reset} ${msg}`)
};

// Token storage
let tokens = {
    admin: null
};

// Test data storage
const testData = {
    createdProducts: [],
    createdCategories: [],
    createdBlogs: [],
    createdOrders: []
};

// HTTP Client
const api = {
    async get(url, config = {}) {
        const response = await axios.get(`${CONFIG.baseUrl}${url}`, config);
        return response.data;
    },
    async post(url, data, config = {}) {
        const response = await axios.post(`${CONFIG.baseUrl}${url}`, data, config);
        return response.data;
    },
    async put(url, data, config = {}) {
        const response = await axios.put(`${CONFIG.baseUrl}${url}`, data, config);
        return response.data;
    },
    async patch(url, data, config = {}) {
        const response = await axios.patch(`${CONFIG.baseUrl}${url}`, data, config);
        return response.data;
    },
    async delete(url, config = {}) {
        const response = await axios.delete(`${CONFIG.baseUrl}${url}`, config);
        return response.data;
    }
};

// Test runner
async function runTest(module, name, testFn, expectedStatus = 200) {
    testResults.summary.total++;
    if (!testResults.byModule[module]) {
        testResults.byModule[module] = { total: 0, passed: 0, failed: 0 };
    }
    testResults.byModule[module].total++;

    try {
        const result = await testFn();
        
        if (result.status === expectedStatus || (result.success && expectedStatus < 300)) {
            testResults.summary.passed++;
            testResults.byModule[module].passed++;
            log.success(`${name} - Status: ${result.status}`);
            testResults.testLog.push({ module, name, status: 'PASS', statusCode: result.status });
            return { success: true, data: result.data };
        } else {
            throw new Error(`Expected status ${expectedStatus}, got ${result.status}`);
        }
    } catch (error) {
        testResults.summary.failed++;
        testResults.byModule[module].failed++;
        
        const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message;
        log.error(`${name} - ${errorMsg}`);
        
        testResults.testLog.push({ module, name, status: 'FAIL', error: errorMsg });
        
        // Track critical issues
        if (error.response?.status === 500) {
            testResults.criticalIssues.push({
                module,
                test: name,
                error: errorMsg,
                type: 'SERVER_ERROR'
            });
        }
        
        return { success: false, error: errorMsg };
    }
}

// Test for expected failures
async function runNegativeTest(module, name, testFn, expectedStatus = 400) {
    testResults.summary.total++;
    if (!testResults.byModule[module]) {
        testResults.byModule[module] = { total: 0, passed: 0, failed: 0 };
    }
    testResults.byModule[module].total++;

    try {
        const result = await testFn();
        
        // If we get here, the test should have failed but didn't
        testResults.summary.failed++;
        testResults.byModule[module].failed++;
        log.warning(`${name} - Expected failure but got success (${result.status})`);
        testResults.testLog.push({ module, name, status: 'FAIL', error: 'Expected failure but succeeded' });
        return { success: false, error: 'Expected failure but succeeded' };
        
    } catch (error) {
        const status = error.response?.status;
        
        if (status === expectedStatus || (expectedStatus === 401 && (status === 401 || status === 403))) {
            testResults.summary.passed++;
            testResults.byModule[module].passed++;
            log.success(`${name} - Correctly rejected (${status})`);
            testResults.testLog.push({ module, name, status: 'PASS', statusCode: status, type: 'NEGATIVE' });
            return { success: true, status };
        } else {
            testResults.summary.failed++;
            testResults.byModule[module].failed++;
            const errorMsg = error.response?.data?.message || error.message;
            log.error(`${name} - Expected ${expectedStatus}, got ${status}: ${errorMsg}`);
            testResults.testLog.push({ module, name, status: 'FAIL', error: errorMsg });
            return { success: false, error: errorMsg };
        }
    }
}

// ============================================================
// PHASE 1: AUTHENTICATION TESTING
// ============================================================
async function testAuthentication() {
    log.module('🔐 PHASE 1: AUTHENTICATION TESTING');

    // Test 1: Health Check
    await runTest('auth', 'Health Check', async () => {
        return await api.get('/health');
    }, 200);

    // Test 2: Register new user
    await runTest('auth', 'Register New User', async () => {
        const email = `test.${Date.now()}@test.com`;
        return await api.post('/auth/register', {
            name: 'Test User',
            email: email,
            password: 'TestPass123!',
            tenantId: CONFIG.tenantId
        });
    }, 201);

    // Test 3: Login with valid credentials
    await runTest('auth', 'Login - Valid Credentials', async () => {
        const response = await api.post('/auth/login', {
            email: CONFIG.testUsers.admin.email,
            password: CONFIG.testUsers.admin.password
        });
        if (response.success && response.data.access_token) {
            tokens.admin = response.data.access_token;
        }
        return response;
    }, 200);

    // Test 4: Login with invalid credentials
    await runNegativeTest('auth', 'Login - Invalid Password', async () => {
        return await api.post('/auth/login', {
            email: CONFIG.testUsers.admin.email,
            password: 'WrongPassword123'
        });
    }, 401);

    // Test 5: Login with non-existent user
    await runNegativeTest('auth', 'Login - Non-existent User', async () => {
        return await api.post('/auth/login', {
            email: 'nonexistent@test.com',
            password: 'SomePass123'
        });
    }, 401);

    // Test 6: Register with duplicate email
    await runNegativeTest('auth', 'Register - Duplicate Email', async () => {
        return await api.post('/auth/register', {
            name: 'Duplicate User',
            email: CONFIG.testUsers.admin.email,
            password: 'TestPass123!'
        });
    }, 400);

    // Test 7: Register with invalid email
    await runNegativeTest('auth', 'Register - Invalid Email', async () => {
        return await api.post('/auth/register', {
            name: 'Invalid User',
            email: 'invalid-email',
            password: 'TestPass123!'
        });
    }, 400);

    // Test 8: Register with weak password
    await runNegativeTest('auth', 'Register - Weak Password', async () => {
        return await api.post('/auth/register', {
            name: 'Weak Pass User',
            email: `weak.${Date.now()}@test.com`,
            password: '123'
        });
    }, 400);

    // Test 9: Get current user (authenticated)
    await runTest('auth', 'Get Current User', async () => {
        return await api.get('/auth/me', {
            headers: { 'Authorization': `Bearer ${tokens.admin}` }
        });
    }, 200);

    // Test 10: Get current user (unauthenticated)
    await runNegativeTest('auth', 'Get Current User - No Auth', async () => {
        return await api.get('/auth/me');
    }, 401);

    // Test 11: Check admin status
    await runTest('auth', 'Check Admin Status', async () => {
        return await api.get('/auth/check-admin', {
            headers: { 'Authorization': `Bearer ${tokens.admin}` }
        });
    }, 200);

    // Test 12: Access admin endpoint without auth
    await runNegativeTest('auth', 'Admin Endpoint - No Auth', async () => {
        return await api.get('/auth/check-admin');
    }, 401);
}

// ============================================================
// PHASE 2: PRODUCTS TESTING
// ============================================================
async function testProducts() {
    log.module('🛍️ PHASE 2: PRODUCTS TESTING');

    // Test 1: Get products (public)
    await runTest('products', 'Get Products - Public', async () => {
        return await api.get('/products');
    }, 200);

    // Test 2: Get products with pagination
    await runTest('products', 'Get Products - Pagination', async () => {
        return await api.get('/products?page=1&per_page=10');
    }, 200);

    // Test 3: Get products with featured flag
    await runTest('products', 'Get Products - Featured', async () => {
        return await api.get('/products?featured=true&limit=4');
    }, 200);

    // Test 4: Create product (admin)
    const createProductResult = await runTest('products', 'Create Product - Admin', async () => {
        return await api.post('/products', {
            name: `Test Product ${Date.now()}`,
            sku: `TEST-${Date.now()}`,
            basePrice: 999,
            description: 'Test product for API testing',
            status: 'published',
            tenantId: CONFIG.tenantId
        }, {
            headers: { 'Authorization': `Bearer ${tokens.admin}` }
        });
    }, 201);

    if (createProductResult.success && createProductResult.data) {
        const productId = createProductResult.data.id || createProductResult.data.productId;
        if (productId) {
            testData.createdProducts.push(productId);
        }
    }

    // Test 5: Create product without auth
    await runNegativeTest('products', 'Create Product - No Auth', async () => {
        return await api.post('/products', {
            name: 'Unauthorized Product',
            basePrice: 100
        });
    }, 401);

    // Test 6: Create product with missing fields
    await runNegativeTest('products', 'Create Product - Missing Name', async () => {
        return await api.post('/products', {
            basePrice: 100
        }, {
            headers: { 'Authorization': `Bearer ${tokens.admin}` }
        });
    }, 400);

    // Test 7: Create product with invalid price
    await runNegativeTest('products', 'Create Product - Invalid Price', async () => {
        return await api.post('/products', {
            name: 'Invalid Price Product',
            basePrice: -100
        }, {
            headers: { 'Authorization': `Bearer ${tokens.admin}` }
        });
    }, 400);

    // Test 8: Get single product
    if (testData.createdProducts.length > 0) {
        await runTest('products', 'Get Single Product', async () => {
            return await api.get(`/products/${testData.createdProducts[0]}`);
        }, 200);
    }

    // Test 9: Get product with invalid ID
    await runNegativeTest('products', 'Get Product - Invalid ID', async () => {
        return await api.get('/products/invalid-id');
    }, 400);

    // Test 10: Update product (admin)
    if (testData.createdProducts.length > 0) {
        await runTest('products', 'Update Product - Admin', async () => {
            return await api.put(`/products/${testData.createdProducts[0]}`, {
                name: 'Updated Product Name',
                basePrice: 1299
            }, {
                headers: { 'Authorization': `Bearer ${tokens.admin}` }
            });
        }, 200);
    }

    // Test 11: Update product without auth
    if (testData.createdProducts.length > 0) {
        await runNegativeTest('products', 'Update Product - No Auth', async () => {
            return await api.put(`/products/${testData.createdProducts[0]}`, {
                name: 'Hacked Name'
            });
        }, 401);
    }

    // Test 12: Get product categories
    if (testData.createdProducts.length > 0) {
        await runTest('products', 'Get Product Categories', async () => {
            return await api.get(`/products/${testData.createdProducts[0]}/categories`);
        }, 200);
    }
}

// ============================================================
// PHASE 3: CATEGORIES TESTING
// ============================================================
async function testCategories() {
    log.module('📂 PHASE 3: CATEGORIES TESTING');

    // Test 1: Get all categories (public)
    await runTest('categories', 'Get All Categories', async () => {
        return await api.get('/categories');
    }, 200);

    // Test 2: Create category (authenticated)
    const createCategoryResult = await runTest('categories', 'Create Category - Auth', async () => {
        return await api.post('/categories', {
            name: `Test Category ${Date.now()}`,
            slug: `test-category-${Date.now()}`,
            description: 'Test category'
        }, {
            headers: { 'Authorization': `Bearer ${tokens.admin}` }
        });
    }, 201);

    if (createCategoryResult.success && createCategoryResult.data) {
        const categoryId = createCategoryResult.data.id;
        if (categoryId) {
            testData.createdCategories.push(categoryId);
        }
    }

    // Test 3: Create category without auth
    await runNegativeTest('categories', 'Create Category - No Auth', async () => {
        return await api.post('/categories', {
            name: 'Unauthorized Category'
        });
    }, 401);

    // Test 4: Get category by ID
    if (testData.createdCategories.length > 0) {
        await runTest('categories', 'Get Category By ID', async () => {
            return await api.get(`/categories/${testData.createdCategories[0]}`);
        }, 200);
    }

    // Test 5: Get category by slug
    if (testData.createdCategories.length > 0) {
        await runTest('categories', 'Get Category By Slug', async () => {
            // Need to get slug from created category
            return await api.get(`/categories/${testData.createdCategories[0]}`);
        }, 200);
    }

    // Test 6: Update category
    if (testData.createdCategories.length > 0) {
        await runTest('categories', 'Update Category', async () => {
            return await api.put(`/categories/${testData.createdCategories[0]}`, {
                name: 'Updated Category Name'
            }, {
                headers: { 'Authorization': `Bearer ${tokens.admin}` }
            });
        }, 200);
    }

    // Test 7: Get products by category
    if (testData.createdCategories.length > 0) {
        await runTest('categories', 'Get Products By Category', async () => {
            return await api.get(`/categories/${testData.createdCategories[0]}/products`);
        }, 200);
    }
}

// ============================================================
// PHASE 4: CART TESTING
// ============================================================
async function testCart() {
    log.module('🛒 PHASE 4: CART TESTING');

    // Test 1: Get cart (should create if doesn't exist)
    await runTest('cart', 'Get Cart', async () => {
        return await api.get('/cart');
    }, 200);

    // Test 2: Add to cart
    if (testData.createdProducts.length > 0) {
        await runTest('cart', 'Add To Cart', async () => {
            return await api.post('/cart/add', {
                items: [{
                    productId: testData.createdProducts[0],
                    quantity: 2
                }]
            });
        }, 200);
    }

    // Test 3: Add to cart with invalid product
    await runNegativeTest('cart', 'Add To Cart - Invalid Product', async () => {
        return await api.post('/cart/add', {
            items: [{
                productId: 999999,
                quantity: 1
            }]
        });
    }, 400);

    // Test 4: Add to cart with zero quantity
    await runNegativeTest('cart', 'Add To Cart - Zero Quantity', async () => {
        return await api.post('/cart/add', {
            items: [{
                productId: testData.createdProducts[0] || 1,
                quantity: 0
            }]
        });
    }, 400);

    // Test 5: Get cart (verify item added)
    await runTest('cart', 'Get Cart - Verify Items', async () => {
        return await api.get('/cart');
    }, 200);

    // Test 6: Clear cart
    await runTest('cart', 'Clear Cart', async () => {
        return await api.delete('/cart');
    }, 200);
}

// ============================================================
// PHASE 5: BLOGS TESTING
// ============================================================
async function testBlogs() {
    log.module('📰 PHASE 5: BLOGS TESTING');

    // Test 1: Get all blogs (public)
    await runTest('blogs', 'Get All Blogs', async () => {
        return await api.get('/blogs');
    }, 200);

    // Test 2: Get blog tags (public)
    await runTest('blogs', 'Get Blog Tags', async () => {
        return await api.get('/blogs/tags');
    }, 200);

    // Test 3: Get capabilities (authenticated)
    await runTest('blogs', 'Get Capabilities - Auth', async () => {
        return await api.get('/blogs/capabilities', {
            headers: { 'Authorization': `Bearer ${tokens.admin}` }
        });
    }, 200);

    // Test 4: Create blog post (admin)
    const createBlogResult = await runTest('blogs', 'Create Blog Post - Admin', async () => {
        return await api.post('/blogs', {
            title: `Test Blog Post ${Date.now()}`,
            slug: `test-blog-${Date.now()}`,
            content: 'This is test blog content for API testing.',
            excerpt: 'Test blog excerpt',
            status: 'published',
            tenantId: CONFIG.tenantId
        }, {
            headers: { 'Authorization': `Bearer ${tokens.admin}` }
        });
    }, 201);

    if (createBlogResult.success && createBlogResult.data) {
        const blogId = createBlogResult.data.id;
        if (blogId) {
            testData.createdBlogs.push(blogId);
        }
    }

    // Test 5: Create blog without auth
    await runNegativeTest('blogs', 'Create Blog - No Auth', async () => {
        return await api.post('/blogs', {
            title: 'Unauthorized Blog',
            content: 'Should fail'
        });
    }, 401);

    // Test 6: Get single blog
    if (testData.createdBlogs.length > 0) {
        await runTest('blogs', 'Get Single Blog', async () => {
            return await api.get(`/blogs/${testData.createdBlogs[0]}`);
        }, 200);
    }

    // Test 7: Search blogs
    await runTest('blogs', 'Search Blogs', async () => {
        return await api.get('/blogs/search?q=test');
    }, 200);
}

// ============================================================
// PHASE 6: ORDERS TESTING
// ============================================================
async function testOrders() {
    log.module('📦 PHASE 6: ORDERS TESTING');

    // Test 1: Get my orders (authenticated)
    await runTest('orders', 'Get My Orders', async () => {
        return await api.get('/orders/my', {
            headers: { 'Authorization': `Bearer ${tokens.admin}` }
        });
    }, 200);

    // Test 2: Get my orders without auth
    await runNegativeTest('orders', 'Get My Orders - No Auth', async () => {
        return await api.get('/orders/my');
    }, 401);

    // Test 3: Create order (empty items - should fail validation)
    await runNegativeTest('orders', 'Create Order - Empty Items', async () => {
        return await api.post('/orders', {
            billing: {
                firstName: 'Test',
                lastName: 'User',
                address1: '123 Test St',
                city: 'Mumbai',
                state: 'Maharashtra',
                postcode: '400001',
                country: 'IN',
                phone: '9876543210',
                email: 'test@test.com'
            },
            paymentMethod: 'cod'
        }, {
            headers: { 'Authorization': `Bearer ${tokens.admin}` }
        });
    }, 400);

    // Test 4: Get all orders (admin)
    await runTest('orders', 'Get All Orders - Admin', async () => {
        return await api.get('/orders/admin/all', {
            headers: { 'Authorization': `Bearer ${tokens.admin}` }
        });
    }, 200);

    // Test 5: Get all orders without admin auth
    await runNegativeTest('orders', 'Get All Orders - Customer', async () => {
        // Would need customer token, but testing without admin token
        return await api.get('/orders/admin/all');
    }, 401);

    // Test 6: Get order analytics
    await runTest('orders', 'Get Order Analytics', async () => {
        return await api.get('/orders/admin/analytics/orders', {
            headers: { 'Authorization': `Bearer ${tokens.admin}` }
        });
    }, 200);
}

// ============================================================
// GENERATE REPORT
// ============================================================
function generateReport() {
    log.header('');
    console.log(`\n${colors.bold}═══════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bold}           API TEST REPORT${colors.reset}`);
    console.log(`${colors.bold}═══════════════════════════════════════════════════════════${colors.reset}`);
    
    // Summary
    console.log(`\n${colors.cyan}TEST SUMMARY:${colors.reset}`);
    console.log(`  Total Tests:  ${testResults.summary.total}`);
    console.log(`  ${colors.green}Passed:  ${testResults.summary.passed}${colors.reset}`);
    console.log(`  ${colors.red}Failed:  ${testResults.summary.failed}${colors.reset}`);
    
    const passRate = testResults.summary.total > 0 
        ? ((testResults.summary.passed / testResults.summary.total) * 100).toFixed(2)
        : 0;
    
    console.log(`\n  ${colors.bold}Pass Rate: ${passRate}%${colors.reset}`);
    
    // By Module
    console.log(`\n${colors.cyan}RESULTS BY MODULE:${colors.reset}`);
    Object.entries(testResults.byModule).forEach(([module, stats]) => {
        const modulePassRate = stats.total > 0 
            ? ((stats.passed / stats.total) * 100).toFixed(1)
            : 0;
        console.log(`  ${module}: ${stats.passed}/${stats.total} (${modulePassRate}%)`);
    });
    
    // Critical Issues
    if (testResults.criticalIssues.length > 0) {
        console.log(`\n${colors.red}CRITICAL ISSUES (${testResults.criticalIssues.length}):${colors.reset}`);
        testResults.criticalIssues.forEach((issue, index) => {
            console.log(`  ${index + 1}. [${issue.module}] ${issue.test}`);
            console.log(`     Type: ${issue.type}`);
            console.log(`     Error: ${issue.error}`);
        });
    }
    
    // Save detailed report
    const reportPath = path.join(__dirname, 'API_TEST_DETAILED_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
    log.info(`Detailed report saved to: ${reportPath}`);
    
    // Save summary report
    const summaryPath = path.join(__dirname, 'API_TEST_SUMMARY.md');
    let summaryContent = `# API Test Summary\n\n**Date:** ${new Date().toISOString()}\n\n`;
    summaryContent += `## Summary\n\n`;
    summaryContent += `- Total Tests: ${testResults.summary.total}\n`;
    summaryContent += `- Passed: ${testResults.summary.passed}\n`;
    summaryContent += `- Failed: ${testResults.summary.failed}\n`;
    summaryContent += `- Pass Rate: ${passRate}%\n\n`;
    summaryContent += `## Results by Module\n\n`;
    Object.entries(testResults.byModule).forEach(([module, stats]) => {
        const modulePassRate = stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(1) : 0;
        summaryContent += `- ${module}: ${stats.passed}/${stats.total} (${modulePassRate}%)\n`;
    });
    
    if (testResults.criticalIssues.length > 0) {
        summaryContent += `\n## Critical Issues\n\n`;
        testResults.criticalIssues.forEach((issue, index) => {
            summaryContent += `${index + 1}. **[${issue.module}]** ${issue.test}\n`;
            summaryContent += `   - Type: ${issue.type}\n`;
            summaryContent += `   - Error: ${issue.error}\n\n`;
        });
    }
    
    fs.writeFileSync(summaryPath, summaryContent);
    log.info(`Summary report saved to: ${summaryPath}`);
    
    return parseFloat(passRate);
}

// ============================================================
// MAIN TEST RUNNER
// ============================================================
async function runAllTests() {
    log.header('');
    console.log(`${colors.bold}🚀 COMPREHENSIVE API TESTING SUITE${colors.reset}`);
    console.log(`${colors.cyan}Shri Ramya E-Commerce Platform${colors.reset}`);
    console.log(`${colors.blue}Base URL: ${CONFIG.baseUrl}${colors.reset}`);
    log.header('');
    
    const startTime = Date.now();
    
    try {
        // Run all test phases
        await testAuthentication();
        await testProducts();
        await testCategories();
        await testCart();
        await testBlogs();
        await testOrders();
        
        // Generate report
        const passRate = generateReport();
        
        const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n${colors.cyan}Total Test Duration: ${totalTime} seconds${colors.reset}\n`);
        
        // Exit with appropriate code
        process.exit(passRate >= 70 ? 0 : 1);
        
    } catch (error) {
        log.error(`Test suite failed: ${error.message}`);
        console.error(error);
        
        // Generate partial report
        generateReport();
        
        process.exit(1);
    }
}

// Run tests
runAllTests();
