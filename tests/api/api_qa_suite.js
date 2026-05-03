const axios = require('axios');

const BASE_URL = 'http://localhost:8000/api/v1';
const TIMEOUT = 15000;

const results = [];

const logResult = (endpoint, method, description, payload, expected, actual, status, observations = '') => {
    results.push({
        endpoint,
        method,
        description,
        payload: JSON.stringify(payload, null, 2),
        expected: JSON.stringify(expected, null, 2),
        actual: JSON.stringify(actual, null, 2),
        status,
        observations
    });
};

const axiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: TIMEOUT,
    validateStatus: () => true, // Don't throw for 4xx/5xx
});

const runTests = async () => {
    let adminToken = '';

    // 🔐 1. Authentication Tests
    console.log('--- Running Authentication Tests ---');

    // Positive: Valid Login
    const validLogin = { email: 'admin-user@example.com', password: 'AdminPassword123!' };
    let resp = await axiosInstance.post('/auth/login', validLogin);
    if (resp.status === 200 && resp.data.success) {
        adminToken = resp.data.data.access_token;
        logResult('/auth/login', 'POST', 'Valid admin login', validLogin, { success: true, token: 'JWT' }, { status: resp.status, data: resp.data }, 'PASS');
    } else {
        logResult('/auth/login', 'POST', 'Valid admin login', validLogin, { success: true }, { status: resp.status, data: resp.data }, 'FAIL', 'Login failed for provided credentials');
    }

    // Negative: Invalid password
    resp = await axiosInstance.post('/auth/login', { email: 'admin-user@example.com', password: 'WrongPassword' });
    if (resp.status === 401 || resp.data.success === false) {
        logResult('/auth/login', 'POST', 'Invalid password login', { email: 'admin-user@example.com', password: '***' }, 'Status 401 or success: false', { status: resp.status, data: resp.data }, 'PASS');
    } else {
        logResult('/auth/login', 'POST', 'Invalid password login', { email: 'admin-user@example.com', password: '***' }, '401 Unauthorized', { status: resp.status, data: resp.data }, 'FAIL');
    }

    // Edge Case: Empty fields
    resp = await axiosInstance.post('/auth/login', { email: '', password: '' });
    logResult('/auth/login', 'POST', 'Empty credentials login', { email: '', password: '' }, 'Status 400', { status: resp.status, data: resp.data }, resp.status === 400 ? 'PASS' : 'FAIL');

    // 🛍️ 2. Product Tests
    console.log('--- Running Product Tests ---');

    // Positive: List products
    resp = await axiosInstance.get('/products');
    logResult('/products', 'GET', 'List all products', {}, 'Status 200', { status: resp.status, count: resp.data.data?.length }, resp.status === 200 ? 'PASS' : 'FAIL');

    // Positive: Get Categories
    resp = await axiosInstance.get('/products/categories');
    logResult('/products/categories', 'GET', 'List categories', {}, 'Status 200', { status: resp.status }, resp.status === 200 ? 'PASS' : 'FAIL');

    // Requirement 3: POST /product API (specifically requested by user as /product)
    console.log('--- Testing Product Creation (Requirement 3) ---');

    const productPayload = {
        name: 'Luxurious Silk Saree',
        description: 'Traditional designer silk saree with gold zari work',
        price: 15999.50,
        category: 'Sarees',
        color: 'Royal Blue',
        size: 'Standard',
        stock: 10
    };

    // Note: Code review showed this endpoint is MISSING in node backend.
    resp = await axiosInstance.post('/products', productPayload, { headers: { Authorization: `Bearer ${adminToken}` } });
    logResult('/products', 'POST', 'Create new product (Valid input)', productPayload, 'Status 201 Created', { status: resp.status, data: resp.data }, resp.status === 201 ? 'PASS' : 'FAIL', 'Endpoint appears to be missing or not implemented in current Node backend (returns 404)');

    // Missing required fields (category, price)
    const incompleteProduct = { name: 'Broken Product', color: 'Red', size: 'M' };
    resp = await axiosInstance.post('/products', incompleteProduct, { headers: { Authorization: `Bearer ${adminToken}` } });
    logResult('/products', 'POST', 'Create product (Missing fields)', incompleteProduct, 'Status 400 Bad Request', { status: resp.status, data: resp.data }, resp.status === 400 ? 'PASS' : 'FAIL', 'Expected validation error for missing price/description/stock');

    // Invalid: Negative Price
    const negativePriceProduct = { ...productPayload, price: -100 };
    resp = await axiosInstance.post('/products', negativePriceProduct, { headers: { Authorization: `Bearer ${adminToken}` } });
    logResult('/products', 'POST', 'Create product (Negative price)', negativePriceProduct, 'Status 400 Bad Request', { status: resp.status, data: resp.data }, resp.status === 400 ? 'PASS' : 'FAIL', 'Expected validation error for negative price');

    // 📦 3. Order Tests
    console.log('--- Running Order Tests ---');

    resp = await axiosInstance.get('/orders', { headers: { Authorization: `Bearer ${adminToken}` } });
    logResult('/orders', 'GET', 'List orders (Admin)', {}, 'Status 200', { status: resp.status }, resp.status === 200 ? 'PASS' : 'FAIL');

    // 👥 4. Customer Tests
    console.log('--- Running Customer Tests ---');

    resp = await axiosInstance.get('/customers', { headers: { Authorization: `Bearer ${adminToken}` } });
    logResult('/customers', 'GET', 'List customers (Admin)', {}, 'Status 200', { status: resp.status }, resp.status === 200 ? 'PASS' : 'FAIL');

    // 🗞️ 5. Blog Tests
    console.log('--- Running Blog Tests ---');

    resp = await axiosInstance.get('/blog/posts');
    logResult('/blog/posts', 'GET', 'List blog posts', {}, 'Status 200', { status: resp.status }, resp.status === 200 ? 'PASS' : 'FAIL');

    // 🩺 6. Health Check (if exists)
    console.log('--- Running Health Check ---');
    resp = await axiosInstance.get('/health').catch(() => ({ status: 404, data: 'Not found' }));
    logResult('/health', 'GET', 'API Health Check', {}, 'Status 200', { status: resp.status }, resp.status === 200 ? 'PASS' : 'FAIL');

};

const generateReport = () => {
    let md = '# 📊 Shri Ramya API Test Automation Report\n\n';
    md += `**Date:** ${new Date().toLocaleString()}\n`;
    md += `**Base URL:** ${BASE_URL}\n`;
    md += `**Environment:** Local/Node.js\n\n`;

    md += '## 📈 Summary\n';
    const total = results.length;
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    md += `- **Total Tests:** ${total}\n`;
    md += `- **Passed:** ${passed} ✅\n`;
    md += `- **Failed:** ${failed} ❌\n`;
    md += `- **Success Rate:** ${((passed / total) * 100).toFixed(2)}%\n\n`;

    md += '## 📝 Detailed Test Results\n\n';
    md += '| Endpoint | Method | Test Case | Status | observations |\n';
    md += '| :--- | :--- | :--- | :--- | :--- |\n';
    results.forEach(r => {
        md += `| \`${r.endpoint}\` | ${r.method} | ${r.description} | **${r.status}** | ${r.observations} |\n`;
    });

    md += '\n## 🔍 Top Observations & Issues\n';
    results.filter(r => r.status === 'FAIL').forEach(r => {
        md += `- **${r.endpoint} [${r.method}]**: ${r.description} failed. Actual status: ${JSON.parse(r.actual).status}. ${r.observations}\n`;
    });

    console.log('\n\n' + md);
    require('fs').writeFileSync('API_QA_REPORT.md', md);
};

const main = async () => {
    try {
        await runTests();
        generateReport();
        console.log('\n✅ Report generated: API_QA_REPORT.md');
        process.exit(0);
    } catch (err) {
        console.error('Fatal error in test suite:', err);
        process.exit(1);
    }
};

main();
