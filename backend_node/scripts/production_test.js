/**
 * Comprehensive Production API Test Suite v2
 * Tests all major functionalities against https://www.shriramya.com
 * 
 * Fixes from v1:
 * - Product creation: removed disallowed fields (color, work, thumbnail)
 * - Image upload path: /upload/image not /images/image  
 * - Order creation: pass items[] array directly (not sessionId-based)
 */

const BASE_URL = 'https://www.shriramya.com/api/v1';
let ADMIN_TOKEN = '';
let CUSTOMER_TOKEN = '';
let CUSTOMER_USER_ID = '';
let TEST_PRODUCT_ID_WITH_VARIANTS = '';
let TEST_PRODUCT_ID_NO_VARIANTS = '';
let TEST_ORDER_ID = '';
let TEST_BLOG_ID = '';
let SESSION_ID = 'test-session-' + Date.now();
let EXISTING_PRODUCT_ID = '';
let EXISTING_VARIANT_ID = '';

const results = [];
let testNumber = 0;

function log(testName, passed, details = '') {
  testNumber++;
  const status = passed ? '✅ PASS' : '❌ FAIL';
  const line = `${testNumber.toString().padStart(2, '0')}. ${status} | ${testName}${details ? ' | ' + details : ''}`;
  console.log(line);
  results.push({ testNumber, testName, passed, details });
}

async function apiCall(method, path, body = null, token = null, extraHeaders = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text.substring(0, 300) }; }
    return { status: response.status, data, ok: response.ok, headers: response.headers };
  } catch (error) {
    return { status: 0, data: { error: error.message }, ok: false };
  }
}

// ==========================================
// TEST GROUPS
// ==========================================

async function testHealthCheck() {
  console.log('\n══════════════════════════════════════════');
  console.log('  1. HEALTH CHECK');
  console.log('══════════════════════════════════════════');

  const res = await apiCall('GET', '/health');
  log('Health check', res.ok && res.data?.status === 'ok', `Status: ${res.status}`);
}

async function testAuth() {
  console.log('\n══════════════════════════════════════════');
  console.log('  2. AUTHENTICATION');
  console.log('══════════════════════════════════════════');

  // Admin login
  const adminRes = await apiCall('POST', '/auth/login', {
    email: 'admin@shriramya.com',
    password: 'Admin@123',
  });
  const adminOk = adminRes.ok && adminRes.data?.data?.token;
  if (adminOk) ADMIN_TOKEN = adminRes.data.data.token;
  log('Admin login', !!adminOk, `Token: ${adminOk ? 'received' : 'MISSING'}`);

  // Customer login
  const custRes = await apiCall('POST', '/auth/login', {
    email: 'customer@test.com',
    password: 'Test@123',
  });
  const custOk = custRes.ok && custRes.data?.data?.token;
  if (custOk) {
    CUSTOMER_TOKEN = custRes.data.data.token;
    CUSTOMER_USER_ID = custRes.data.data.user?.id || custRes.data.data.user?.userId || '';
  }
  log('Customer login', !!custOk, `Token: ${custOk ? 'received' : 'MISSING'}`);

  // Admin check
  const checkRes = await apiCall('GET', '/auth/check-admin', null, ADMIN_TOKEN);
  log('Admin role check', checkRes.ok && checkRes.data?.data?.is_admin === true, `is_admin: ${checkRes.data?.data?.is_admin}`);
}

async function testProductCRUD() {
  console.log('\n══════════════════════════════════════════');
  console.log('  3. PRODUCT CRUD');
  console.log('══════════════════════════════════════════');

  // List products
  const listRes = await apiCall('GET', '/products?per_page=5');
  const hasProducts = listRes.ok && Array.isArray(listRes.data?.data?.products);
  log('List products', hasProducts, `Count: ${listRes.data?.data?.products?.length || 0}, Total: ${listRes.data?.data?.total || 0}`);

  // Save a published product for cart/order tests
  if (hasProducts && listRes.data.data.products.length > 0) {
    const firstProduct = listRes.data.data.products[0];
    EXISTING_PRODUCT_ID = firstProduct._id || firstProduct.id;
    if (firstProduct.variants && firstProduct.variants.length > 0) {
      EXISTING_VARIANT_ID = firstProduct.variants[0].id || firstProduct.variants[0]._id;
    }
  }

  // Get single product
  if (EXISTING_PRODUCT_ID) {
    const getRes = await apiCall('GET', `/products/${EXISTING_PRODUCT_ID}`);
    log('Get single product', getRes.ok && getRes.data?.data, `Product: ${getRes.data?.data?.name || 'N/A'}`);
  }

  // Create product WITH variants (only allowed fields per validation schema)
  const productWithVariants = {
    name: 'TEST Zari Silk Saree (with variants)',
    description: 'A test product with variants for QA testing. Can be deleted.',
    fabric: 'Silk',
    occasion: 'Festive',
    basePrice: 4999,
    status: 'draft',
    images: ['https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800'],
    variants: [
      { sku: 'TEST-ZARI-RED-M', price: 4999, stock: 10, color: 'Red', size: 'M', attributes: { color: 'Red', size: 'M' } },
      { sku: 'TEST-ZARI-RED-L', price: 4999, stock: 8, color: 'Red', size: 'L', attributes: { color: 'Red', size: 'L' } },
      { sku: 'TEST-ZARI-BLUE-M', price: 5499, stock: 5, color: 'Blue', size: 'M', attributes: { color: 'Blue', size: 'M' } },
    ],
  };

  const createRes1 = await apiCall('POST', '/products', productWithVariants, ADMIN_TOKEN);
  const created1 = createRes1.ok && createRes1.data?.data;
  if (created1) TEST_PRODUCT_ID_WITH_VARIANTS = created1._id || created1.id;
  log('Create product WITH variants', !!created1,
    `ID: ${TEST_PRODUCT_ID_WITH_VARIANTS || 'FAILED'}, Variants: ${created1?.variants?.length || 0}, Status: ${createRes1.status}`);
  if (!created1) console.log('   Error:', JSON.stringify(createRes1.data).substring(0, 300));

  // Create product WITHOUT variants
  const productNoVariants = {
    name: 'TEST Simple Kurta (no variants)',
    description: 'A test product without variants for QA testing.',
    fabric: 'Cotton',
    basePrice: 1299,
    status: 'draft',
    images: ['https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=800'],
  };

  const createRes2 = await apiCall('POST', '/products', productNoVariants, ADMIN_TOKEN);
  const created2 = createRes2.ok && createRes2.data?.data;
  if (created2) TEST_PRODUCT_ID_NO_VARIANTS = created2._id || created2.id;
  log('Create product WITHOUT variants', !!created2,
    `ID: ${TEST_PRODUCT_ID_NO_VARIANTS || 'FAILED'}, Variants: ${created2?.variants?.length || 0}, Status: ${createRes2.status}`);
  if (!created2) console.log('   Error:', JSON.stringify(createRes2.data).substring(0, 300));

  // Update product
  if (TEST_PRODUCT_ID_WITH_VARIANTS) {
    const updateRes = await apiCall('PUT', `/products/${TEST_PRODUCT_ID_WITH_VARIANTS}`, {
      name: 'TEST Zari Silk Saree (UPDATED)',
      basePrice: 5299,
    }, ADMIN_TOKEN);
    log('Update product', updateRes.ok, `Name: ${updateRes.data?.data?.name || 'N/A'}, Status: ${updateRes.status}`);
    if (!updateRes.ok) console.log('   Error:', JSON.stringify(updateRes.data).substring(0, 300));
  }

  // Verify product get after update
  if (TEST_PRODUCT_ID_WITH_VARIANTS) {
    const verifyRes = await apiCall('GET', `/products/${TEST_PRODUCT_ID_WITH_VARIANTS}`, null, ADMIN_TOKEN);
    log('Verify updated product', verifyRes.ok && verifyRes.data?.data?.name?.includes('UPDATED'),
      `Name: ${verifyRes.data?.data?.name || 'N/A'}`);
  }
}

async function testImageUpload() {
  console.log('\n══════════════════════════════════════════');
  console.log('  4. IMAGE UPLOAD');
  console.log('══════════════════════════════════════════');

  // Create a small test image (1x1 red PNG)
  const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
  const pngBuffer = Buffer.from(base64Png, 'base64');

  const boundary = '----TestBoundary' + Date.now();
  const crlf = '\r\n';

  const bodyParts = [
    `--${boundary}${crlf}`,
    `Content-Disposition: form-data; name="file"; filename="test-image.png"${crlf}`,
    `Content-Type: image/png${crlf}${crlf}`,
  ];

  const bodyStart = Buffer.from(bodyParts.join(''));
  const bodyEnd = Buffer.from(`${crlf}--${boundary}--${crlf}`);
  const body = Buffer.concat([bodyStart, pngBuffer, bodyEnd]);

  try {
    // Correct path: /upload/image (not /images/image)
    const url = `${BASE_URL}/upload/image`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: body,
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text.substring(0, 300) }; }

    const uploaded = response.ok && (data?.data?.url || data?.data?.imageUrl || data?.data?.urls || data?.url);
    log('Image upload', !!uploaded || response.status === 201,
      `Status: ${response.status}, URL: ${data?.data?.url || data?.data?.imageUrl || JSON.stringify(data?.data?.urls || '').substring(0, 80) || 'N/A'}`);
    if (!uploaded && response.status !== 201) {
      console.log('   Response:', JSON.stringify(data).substring(0, 300));
    }
  } catch (err) {
    log('Image upload', false, `Error: ${err.message}`);
  }
}

async function testDeleteProduct() {
  console.log('\n══════════════════════════════════════════');
  console.log('  5. DELETE PRODUCT');
  console.log('══════════════════════════════════════════');

  if (TEST_PRODUCT_ID_NO_VARIANTS) {
    const delRes = await apiCall('DELETE', `/products/${TEST_PRODUCT_ID_NO_VARIANTS}`, null, ADMIN_TOKEN);
    log('Delete product (no variants)', delRes.ok, `Status: ${delRes.status}`);
    if (!delRes.ok) console.log('   Error:', JSON.stringify(delRes.data).substring(0, 200));

    // Verify it's gone (should 404)
    const verifyRes = await apiCall('GET', `/products/${TEST_PRODUCT_ID_NO_VARIANTS}`, null, ADMIN_TOKEN);
    log('Verify product deleted (expect 404)', verifyRes.status === 404, `Status: ${verifyRes.status}`);
  } else {
    log('Delete product', false, 'No test product was created to delete');
    log('Verify product deleted', false, 'Skipped');
  }
}

async function testCategories() {
  console.log('\n══════════════════════════════════════════');
  console.log('  6. CATEGORIES');
  console.log('══════════════════════════════════════════');

  const catRes = await apiCall('GET', '/categories');
  const hasCats = catRes.ok && Array.isArray(catRes.data?.data);
  log('List categories', hasCats, `Count: ${catRes.data?.data?.length || 0}`);

  if (hasCats && catRes.data.data.length > 0) {
    const firstCat = catRes.data.data[0];
    const catSlug = firstCat.slug || firstCat._id || firstCat.id;
    const catDetailRes = await apiCall('GET', `/categories/${catSlug}`);
    log('Get category detail', catDetailRes.ok, `Category: ${catDetailRes.data?.data?.name || 'N/A'}`);
  }
}

async function testCartFlow() {
  console.log('\n══════════════════════════════════════════');
  console.log('  7. CART FLOW');
  console.log('══════════════════════════════════════════');

  const headers = { 'x-session-id': SESSION_ID };

  // Clear cart
  const clearRes = await apiCall('DELETE', '/cart', null, null, headers);
  log('Clear cart', clearRes.ok, `Status: ${clearRes.status}`);

  // Add to cart
  if (EXISTING_PRODUCT_ID) {
    const addBody = {
      productId: EXISTING_PRODUCT_ID,
      variantId: EXISTING_VARIANT_ID || undefined,
      quantity: 2,
    };
    const addRes = await apiCall('POST', '/cart/add', addBody, null, headers);
    log('Add to cart', addRes.ok, `Status: ${addRes.status}, Items: ${addRes.data?.data?.items?.length || 'N/A'}`);
    if (!addRes.ok) console.log('   Error:', JSON.stringify(addRes.data).substring(0, 200));

    // Get cart
    const getCartRes = await apiCall('GET', '/cart', null, null, headers);
    const cartItems = getCartRes.data?.data?.items || [];
    log('Get cart', getCartRes.ok && cartItems.length > 0, `Items: ${cartItems.length}, Total: ₹${getCartRes.data?.data?.total || 0}`);
  } else {
    log('Add to cart', false, 'No existing product ID');
    log('Get cart', false, 'Skipped');
  }
}

async function testOrderFlow() {
  console.log('\n══════════════════════════════════════════');
  console.log('  8. ORDER FLOW (Create → Status → Ship → Track)');
  console.log('══════════════════════════════════════════');

  // Order needs items[] array with productId (not sessionId)
  if (!EXISTING_PRODUCT_ID) {
    log('Create order', false, 'No existing product available');
    return;
  }

  const orderBody = {
    items: [
      {
        productId: EXISTING_PRODUCT_ID,
        variantId: EXISTING_VARIANT_ID || undefined,
        quantity: 1,
      },
    ],
    shippingAddress: {
      name: 'Test Customer',
      email: 'customer@test.com',
      phone: '+91-9876543211',
      address: '123 MG Road',
      city: 'Jaipur',
      state: 'Rajasthan',
      pincode: '302001',
      country: 'India',
    },
    paymentMethod: 'cod',
  };

  const orderRes = await apiCall('POST', '/orders', orderBody, CUSTOMER_TOKEN);
  const orderCreated = orderRes.ok && orderRes.data?.data;
  if (orderCreated) {
    TEST_ORDER_ID = orderRes.data.data.orderId || orderRes.data.data.order_id;
  }
  log('Create order', !!orderCreated,
    `OrderID: ${TEST_ORDER_ID || 'FAILED'}, Status: ${orderRes.status}, Total: ₹${orderRes.data?.data?.display_amount || 'N/A'}`);
  if (!orderCreated) console.log('   Error:', JSON.stringify(orderRes.data).substring(0, 300));

  if (TEST_ORDER_ID) {
    // Get order details
    const getOrderRes = await apiCall('GET', `/orders/${TEST_ORDER_ID}`);
    log('Get order details', getOrderRes.ok,
      `Status: ${getOrderRes.data?.data?.status || 'N/A'}, Total: ₹${getOrderRes.data?.data?.total || 0}`);

    // Update order → processing
    const processRes = await apiCall('PUT', `/orders/${TEST_ORDER_ID}/status`, {
      status: 'processing',
      note: 'Order confirmed by admin',
    });
    log('Update order → processing', processRes.ok,
      `New status: ${processRes.data?.data?.status || 'N/A'}`);

    // Update order → shipped
    const shipRes = await apiCall('PUT', `/orders/${TEST_ORDER_ID}/status`, {
      status: 'shipped',
      note: 'Shipped via BlueDart',
      trackingNumber: 'BD123456789',
    });
    log('Update order → shipped', shipRes.ok,
      `New status: ${shipRes.data?.data?.status || 'N/A'}`);

    // Get tracking
    const trackRes = await apiCall('GET', `/orders/${TEST_ORDER_ID}/tracking`);
    log('Get order tracking', trackRes.ok,
      `Status: ${trackRes.data?.data?.status || 'N/A'}, Tracking: ${trackRes.data?.data?.trackingNumber || 'N/A'}`);

    // Admin view order
    const adminOrderRes = await apiCall('GET', `/admin/orders/${TEST_ORDER_ID}`, null, ADMIN_TOKEN);
    log('Admin get order', adminOrderRes.ok,
      `Status: ${adminOrderRes.data?.data?.status || 'N/A'}`);

    // List customer orders
    const myOrdersRes = await apiCall('GET', '/orders/my', null, CUSTOMER_TOKEN);
    log('List customer orders', myOrdersRes.ok,
      `Count: ${myOrdersRes.data?.data?.orders?.length || 0}`);
  }
}

async function testPaymentFlow() {
  console.log('\n══════════════════════════════════════════');
  console.log('  9. PAYMENT FLOW');
  console.log('══════════════════════════════════════════');

  if (TEST_ORDER_ID) {
    const payRes = await apiCall('POST', `/orders/${TEST_ORDER_ID}/payment`, {
      razorpay_payment_id: `pay_test_${Date.now()}`,
      razorpay_order_id: `order_test_${Date.now()}`,
      razorpay_signature: 'test_signature',
      method: 'cod',
    });
    log('Confirm payment', payRes.ok,
      `Status: ${payRes.status}, PayStatus: ${payRes.data?.data?.paymentStatus || 'N/A'}, OrderStatus: ${payRes.data?.data?.status || 'N/A'}`);
    if (!payRes.ok) console.log('   Error:', JSON.stringify(payRes.data).substring(0, 300));
  } else {
    log('Confirm payment', false, 'No order ID');
  }
}

async function testBlogCRUD() {
  console.log('\n══════════════════════════════════════════');
  console.log('  10. BLOG CRUD');
  console.log('══════════════════════════════════════════');

  // List blogs
  const listRes = await apiCall('GET', '/blogs');
  log('List blogs', listRes.ok,
    `Posts: ${listRes.data?.data?.posts?.length || 0}, Total: ${listRes.data?.data?.pagination?.total || 0}`);

  // Blog stats
  const statsRes = await apiCall('GET', '/blogs/stats');
  log('Blog stats', statsRes.ok,
    `Total: ${statsRes.data?.data?.total_posts || 0}, Published: ${statsRes.data?.data?.published || 0}`);

  // Blog categories
  const catRes = await apiCall('GET', '/blogs/categories');
  log('Blog categories', catRes.ok,
    `Categories: ${Array.isArray(catRes.data?.data) ? catRes.data.data.length : 'N/A'}`);

  // Create blog
  const blogBody = {
    title: 'TEST Blog - QA Testing ' + Date.now(),
    content: '<p>This is a test blog post created for QA testing. Can be deleted safely.</p>',
    excerpt: 'Test blog post for automated QA.',
    status: 'draft',
    categories: ['Testing'],
    tags: ['test', 'qa', 'automated'],
  };

  const createRes = await apiCall('POST', '/blogs', blogBody, ADMIN_TOKEN);
  const blogCreated = createRes.ok && createRes.data?.data;
  if (blogCreated) TEST_BLOG_ID = blogCreated.id || blogCreated._id || blogCreated.slug;
  log('Create blog', !!blogCreated,
    `ID: ${TEST_BLOG_ID || 'FAILED'}, Status: ${createRes.status}`);
  if (!blogCreated) console.log('   Error:', JSON.stringify(createRes.data).substring(0, 200));

  if (TEST_BLOG_ID) {
    // Update blog → publish
    const updateRes = await apiCall('PUT', `/blogs/${TEST_BLOG_ID}`, {
      title: 'TEST Blog - UPDATED & Published',
      status: 'published',
    }, ADMIN_TOKEN);
    log('Update & publish blog', updateRes.ok,
      `Title: ${updateRes.data?.data?.title || 'N/A'}`);

    // Get blog
    const getRes = await apiCall('GET', `/blogs/${TEST_BLOG_ID}`);
    log('Get published blog', getRes.ok,
      `Title: ${getRes.data?.data?.title || 'N/A'}`);

    // Delete blog
    const delRes = await apiCall('DELETE', `/blogs/${TEST_BLOG_ID}`, null, ADMIN_TOKEN);
    log('Delete blog', delRes.ok, `Status: ${delRes.status}`);
  }
}

async function testAdminFeatures() {
  console.log('\n══════════════════════════════════════════');
  console.log('  11. ADMIN FEATURES');
  console.log('══════════════════════════════════════════');

  const overviewRes = await apiCall('GET', '/admin/analytics/overview', null, ADMIN_TOKEN);
  log('Analytics overview', overviewRes.ok,
    `Revenue: ₹${overviewRes.data?.data?.total_revenue || 0}, Orders: ${overviewRes.data?.data?.total_orders || 0}, Customers: ${overviewRes.data?.data?.total_customers || 0}`);

  const salesRes = await apiCall('GET', '/admin/analytics/sales', null, ADMIN_TOKEN);
  log('Analytics sales', salesRes.ok,
    `Top products: ${salesRes.data?.data?.top_products?.length || 0}`);

  const ordersRes = await apiCall('GET', '/admin/orders', null, ADMIN_TOKEN);
  log('Admin orders list', ordersRes.ok,
    `Orders: ${ordersRes.data?.data?.orders?.length || 0}, Stats: ${JSON.stringify(ordersRes.data?.data?.stats || {}).substring(0, 80)}`);

  const usersRes = await apiCall('GET', '/admin/users', null, ADMIN_TOKEN);
  log('Admin users list', usersRes.ok,
    `Users: ${usersRes.data?.data?.length || 0}`);

  const blogStatsRes = await apiCall('GET', '/admin/blogs/stats', null, ADMIN_TOKEN);
  log('Admin blog stats', blogStatsRes.ok,
    `Total: ${blogStatsRes.data?.data?.total_posts || 0}`);

  const warehouseRes = await apiCall('GET', '/admin/warehouses', null, ADMIN_TOKEN);
  log('Admin warehouses', warehouseRes.ok,
    `Warehouses: ${warehouseRes.data?.data?.length || 0}`);
}

async function testSearch() {
  console.log('\n══════════════════════════════════════════');
  console.log('  12. SEARCH & RECOMMENDATIONS');
  console.log('══════════════════════════════════════════');

  const searchSilk = await apiCall('GET', '/search?q=silk');
  log('Search "silk"', searchSilk.ok,
    `Results: ${searchSilk.data?.data?.products?.length || 0}, Suggestions: ${searchSilk.data?.data?.suggestions?.length || 0}`);

  const searchKurta = await apiCall('GET', '/search?q=kurta');
  log('Search "kurta"', searchKurta.ok,
    `Results: ${searchKurta.data?.data?.products?.length || 0}`);

  const recRes = await apiCall('GET', '/recommendations');
  log('General recommendations', recRes.ok,
    `Products: ${recRes.data?.data?.length || 0}`);

  if (EXISTING_PRODUCT_ID) {
    const prodRecRes = await apiCall('GET', `/products/${EXISTING_PRODUCT_ID}/recommendations`);
    log('Product recommendations', prodRecRes.ok,
      `Related: ${prodRecRes.data?.data?.length || 0}`);
  }
}

async function testMiscEndpoints() {
  console.log('\n══════════════════════════════════════════');
  console.log('  13. MISC ENDPOINTS');
  console.log('══════════════════════════════════════════');

  const featuredRes = await apiCall('GET', '/products/featured');
  log('Featured products', featuredRes.ok,
    `Count: ${featuredRes.data?.data?.length || 0}`);

  const trendingRes = await apiCall('GET', '/products/trending');
  log('Trending products', trendingRes.ok,
    `Count: ${trendingRes.data?.data?.length || 0}`);

  const newRes = await apiCall('GET', '/products/new-arrivals');
  log('New arrivals', newRes.ok,
    `Count: ${newRes.data?.data?.length || 0}`);

  const couponsRes = await apiCall('GET', '/coupons');
  log('List coupons', couponsRes.ok,
    `Count: ${couponsRes.data?.data?.coupons?.length || 0}`);

  const validateRes = await apiCall('GET', '/coupons/validate/WELCOME10');
  log('Validate coupon WELCOME10', validateRes.ok,
    `Valid: ${validateRes.data?.data?.valid || false}, Discount: ${validateRes.data?.data?.value || 0}%`);

  const validateRes2 = await apiCall('POST', '/coupons/validate', {
    code: 'SILK20',
    cartTotal: 5000,
  });
  log('Apply coupon SILK20', validateRes2.ok,
    `Discount: ₹${validateRes2.data?.data?.discount || 0}`);

  // Reviews
  if (EXISTING_PRODUCT_ID) {
    const reviewsRes = await apiCall('GET', `/reviews/product/${EXISTING_PRODUCT_ID}`);
    log('Get product reviews', reviewsRes.ok,
      `Reviews: ${reviewsRes.data?.data?.reviews?.length || 0}, Avg: ${reviewsRes.data?.data?.average || 0}`);
  }
}

async function cleanup() {
  console.log('\n══════════════════════════════════════════');
  console.log('  CLEANUP');
  console.log('══════════════════════════════════════════');

  // Delete test product with variants (leftover)
  if (TEST_PRODUCT_ID_WITH_VARIANTS) {
    const delRes = await apiCall('DELETE', `/products/${TEST_PRODUCT_ID_WITH_VARIANTS}`, null, ADMIN_TOKEN);
    log('Cleanup: delete test product', delRes.ok, `ID: ${TEST_PRODUCT_ID_WITH_VARIANTS}, Status: ${delRes.status}`);
  }

  // Cancel test order
  if (TEST_ORDER_ID) {
    const cancelRes = await apiCall('PUT', `/orders/${TEST_ORDER_ID}/cancel`, {
      reason: 'QA test cleanup',
    });
    log('Cleanup: cancel test order', cancelRes.ok || cancelRes.status < 500,
      `OrderID: ${TEST_ORDER_ID}, Status: ${cancelRes.status}`);
  }

  // Clear session cart  
  const clearRes = await apiCall('DELETE', '/cart', null, null, { 'x-session-id': SESSION_ID });
  log('Cleanup: clear test cart', clearRes.ok, `Status: ${clearRes.status}`);
}

// ==========================================
// RUN ALL TESTS
// ==========================================

async function runAllTests() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  SHRIRAMYA PRODUCTION API TEST SUITE v2                     ║');
  console.log('║  Target: https://www.shriramya.com                          ║');
  console.log('║  Time: ' + new Date().toISOString().padEnd(53) + '║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  await testHealthCheck();
  await testAuth();
  await testProductCRUD();
  await testImageUpload();
  await testDeleteProduct();
  await testCategories();
  await testCartFlow();
  await testOrderFlow();
  await testPaymentFlow();
  await testBlogCRUD();
  await testAdminFeatures();
  await testSearch();
  await testMiscEndpoints();
  await cleanup();

  // Summary
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  RESULTS SUMMARY                                           ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`\n  Total: ${total} | Passed: ${passed} ✅ | Failed: ${failed} ❌`);
  console.log(`  Pass Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

  if (failed > 0) {
    console.log('  ─── Failed tests ───');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`    ${r.testNumber.toString().padStart(2)}. ${r.testName}: ${r.details}`);
    });
    console.log('');
  }

  console.log('  ─── Test Coverage ───');
  console.log('  ✓ Health Check');
  console.log('  ✓ Auth (Admin login, Customer login, Role check)');
  console.log('  ✓ Products (List, Get, Create w/variants, Create w/o variants, Update, Delete)');
  console.log('  ✓ Image Upload');
  console.log('  ✓ Categories (List, Get detail)');
  console.log('  ✓ Cart (Clear, Add, Get)');
  console.log('  ✓ Orders (Create, Get, Status→Processing, Status→Shipped, Track, Admin view, My orders)');
  console.log('  ✓ Payment (Confirm COD/Razorpay)');
  console.log('  ✓ Blogs (List, Stats, Categories, Create, Update/Publish, Get, Delete)');
  console.log('  ✓ Admin (Analytics, Sales, Orders, Users, Blog stats, Warehouses)');
  console.log('  ✓ Search & Recommendations');
  console.log('  ✓ Misc (Featured, Trending, New Arrivals, Coupons, Reviews)');
  console.log('');
}

runAllTests().catch(console.error);
