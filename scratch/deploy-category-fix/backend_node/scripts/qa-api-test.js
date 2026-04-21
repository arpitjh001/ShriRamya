const http = require('http');

const test = (path, method = 'GET', data = null) => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 8000,
      path: '/api/v1' + path,
      method: method,
      headers: {}
    };
    
    if (data) {
      options.headers['Content-Type'] = 'application/json';
    }
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            body: JSON.parse(body),
            path: path
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            body: body,
            path: path
          });
        }
      });
    });
    
    req.on('error', (e) => {
      resolve({ error: e.message, path: path });
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
};

async function runTests() {
  console.log('=== API Endpoint Tests ===\n');
  
  const tests = [
    // Health check
    { path: '/health', method: 'GET', desc: 'Health Check' },
    
    // Products
    { path: '/products', method: 'GET', desc: 'Get All Products' },
    { path: '/products?page=1&per_page=10', method: 'GET', desc: 'Get Products (paginated)' },
    { path: '/categories', method: 'GET', desc: 'Redirect to Categories' },
    
    // Categories  
    { path: '/categories', method: 'GET', desc: 'Get All Categories' },
    
    // Search
    { path: '/search?q=test', method: 'GET', desc: 'Search Products' },
    { path: '/search/suggestions?q=test', method: 'GET', desc: 'Search Suggestions' },
    
    // Cart
    { path: '/cart', method: 'GET', desc: 'Get Cart' },
    
    // Auth (will fail without token, but tests endpoint exists)
    { path: '/auth/me', method: 'GET', desc: 'Get Current User (no auth)' },
    
    // Blog
    { path: '/blog/posts', method: 'GET', desc: 'Get Blog Posts' },
    { path: '/blog/capabilities', method: 'GET', desc: 'Get Blog Capabilities (no auth)' },
    
    // Recommendations
    { path: '/recommendations/1', method: 'GET', desc: 'Get Product Recommendations' },
  ];
  
  const results = [];
  
  for (const t of tests) {
    const result = await test(t.path, t.method);
    results.push({
      desc: t.desc,
      path: t.path,
      status: result.status || 'ERROR',
      success: result.status === 200 || result.status === 301 || result.status === 401
    });
  }
  
  console.log('Test Results:\n');
  results.forEach((r, i) => {
    const icon = r.success ? '✅' : '❌';
    console.log(`${icon} ${i+1}. ${r.desc}`);
    console.log(`   ${r.path} -> HTTP ${r.status}`);
  });
  
  const passed = results.filter(r => r.success).length;
  console.log(`\n=== Summary: ${passed}/${results.length} tests passed ===`);
}

runTests();
