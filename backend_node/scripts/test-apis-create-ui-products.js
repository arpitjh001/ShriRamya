const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080/api/v1';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin-user@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'AdminPassword123!';
const DEVICE_ID = `api-test-${Date.now()}`;

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
  validateStatus: () => true,
});

const results = [];
const created = {
  imageUrls: [],
  productIds: [],
  categoryId: null,
  tempCategoryId: null,
  customerId: null,
  couponId: null,
  orderId: null,
  blogPostId: null,
};

const PUBLIC_IMAGE_FALLBACKS = [
  'https://upload.wikimedia.org/wikipedia/commons/3/3f/Fronalpstock_big.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/1/12/Broadway_and_Times_Square_by_night.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/6/6e/Golde33443.jpg',
];

function pushResult(scope, method, endpoint, status, ok, details = '') {
  results.push({ scope, method, endpoint, status, ok, details });
}

async function call(scope, method, endpoint, data = null, headers = {}) {
  let response;
  try {
    response = await client.request({
      method,
      url: endpoint,
      data,
      headers,
    });
  } catch (error) {
    pushResult(scope, method.toUpperCase(), endpoint, 0, false, error.message);
    return null;
  }

  const ok = response.status >= 200 && response.status < 300;
  const details = response.data?.message || response.data?.error || '';
  pushResult(scope, method.toUpperCase(), endpoint, response.status, ok, details);
  return response;
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'x-device-id': DEVICE_ID,
  };
}

function pickImagePaths() {
  const root = path.resolve(__dirname, '..', '..', '..');
  const preferred = [
    path.join(root, 'uploads', 'banarasi_red.png'),
    path.join(root, 'uploads', 'designer_pink.png'),
    path.join(root, 'uploads', 'kanjivaram_blue.png'),
  ];

  const existingPreferred = preferred.filter((filePath) => fs.existsSync(filePath));
  if (existingPreferred.length >= 2) return existingPreferred.slice(0, 3);

  const uploadsRoot = path.join(root, 'uploads');
  const fallback = [];

  function walk(dirPath) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (/\.(png|jpe?g|webp)$/i.test(entry.name)) {
        fallback.push(fullPath);
      }
      if (fallback.length >= 3) return;
    }
  }

  if (fs.existsSync(uploadsRoot)) walk(uploadsRoot);
  return fallback.slice(0, 3);
}

async function uploadImage(token, imagePath) {
  const form = new FormData();
  form.append('file', fs.createReadStream(imagePath));

  const response = await client.post('/upload', form, {
    headers: {
      ...authHeaders(token),
      ...form.getHeaders(),
    },
    validateStatus: () => true,
    maxBodyLength: Infinity,
  });

  const ok = response.status >= 200 && response.status < 300;
  pushResult('upload', 'POST', '/upload', response.status, ok, imagePath);
  if (!ok) return null;
  return response.data?.url || response.data?.data?.url || null;
}

function buildProductPayload(index, categoryId, imageUrls) {
  const stamp = Date.now() + index;
  const basePrice = 5000 + (index * 300);
  const salePrice = basePrice - 250;

  return {
    name: `UI Full Product ${index} ${stamp}`,
    description: `UI full payload product ${index} with images, categories, and variation stock matrix.`,
    regular_price: String(basePrice),
    sale_price: String(salePrice),
    stock_quantity: 30 + index,
    sku: `ui-full-${stamp}-${index}`,
    status: 'publish',
    categories: [{ id: categoryId }],
    images: imageUrls,
    fabric: index % 2 === 0 ? 'Banarasi Silk' : 'Kanjivaram Silk',
    occasion: index % 2 === 0 ? 'Wedding' : 'Festive',
    care_instructions: 'Dry clean only. Steam iron on low heat.',
    size_stock: [
      { size: 'S', qty: 10 + index },
      { size: 'M', qty: 12 + index },
    ],
    color_stock: [
      { color: 'Red', qty: 11 + index },
      { color: 'Blue', qty: 9 + index },
    ],
    defer_images: false,
  };
}

function extractProductErrorMessage(response) {
  return (
    response?.data?.message ||
    response?.data?.error ||
    response?.message ||
    ''
  );
}

function extractRefreshTokenFromSetCookie(setCookie = []) {
  const row = Array.isArray(setCookie)
    ? setCookie.find((cookie) => cookie.startsWith('refresh_token='))
    : null;
  if (!row) return null;
  return row.split(';')[0].replace('refresh_token=', '');
}

async function main() {
  console.log(`Running API tests against ${BASE_URL}`);
  console.log(`Device ID: ${DEVICE_ID}`);

  // Health
  await call('system', 'get', '/health');

  // Auth: login
  const loginResponse = await client.post(
    '/auth/login',
    { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    {
      headers: { 'x-device-id': DEVICE_ID },
      validateStatus: () => true,
    }
  );

  const loginOk = loginResponse.status >= 200 && loginResponse.status < 300 && loginResponse.data?.data?.access_token;
  pushResult('auth', 'POST', '/auth/login', loginResponse.status, !!loginOk, loginResponse.data?.message || '');
  if (!loginOk) {
    console.error('Admin login failed. Aborting tests.');
    console.error(loginResponse.data);
    process.exit(1);
  }

  const token = loginResponse.data.data.access_token;
  const headers = authHeaders(token);
  const refreshToken = extractRefreshTokenFromSetCookie(loginResponse.headers['set-cookie']);

  // Auth follow-up
  await call('auth', 'get', '/auth/me', null, headers);
  await call('auth', 'get', '/auth/check-admin', null, headers);
  if (refreshToken) {
    await call('auth', 'post', '/auth/refresh', { refresh_token: refreshToken }, { 'x-device-id': DEVICE_ID });
  } else {
    pushResult('auth', 'POST', '/auth/refresh', 0, false, 'refresh_token cookie not found');
  }

  // Categories
  const categoriesBefore = await call('products', 'get', '/products/categories', null, headers);

  let categoryId = categoriesBefore?.data?.data?.[0]?.id || categoriesBefore?.data?.[0]?.id;
  if (!categoryId) {
    const catCreate = await call('products', 'post', '/products/categories', { name: `API Primary ${Date.now()}` }, headers);
    categoryId = catCreate?.data?.data?.id || catCreate?.data?.id || null;
  }
  created.categoryId = categoryId;

  const tempCategory = await call('products', 'post', '/products/categories', { name: `API Temp ${Date.now()}` }, headers);
  created.tempCategoryId = tempCategory?.data?.data?.id || tempCategory?.data?.id || null;
  if (created.tempCategoryId) {
    await call('products', 'get', `/products/categories/${created.tempCategoryId}`, null, headers);
    await call('products', 'put', `/products/categories/${created.tempCategoryId}`, { name: `API Temp Updated ${Date.now()}` }, headers);
    await call('products', 'delete', `/products/categories/${created.tempCategoryId}`, null, headers);
  }

  // Upload images
  const imagePaths = pickImagePaths();
  if (imagePaths.length === 0) {
    pushResult('upload', 'POST', '/upload', 0, false, 'No local image files found');
  } else {
    for (const imagePath of imagePaths) {
      const imageUrl = await uploadImage(token, imagePath);
      if (imageUrl) created.imageUrls.push(imageUrl);
    }
  }

  // Product APIs + create few products with full UI fields
  await call('products', 'get', '/products', null, headers);

  if (!created.categoryId) {
    pushResult('products', 'POST', '/products', 0, false, 'No category ID available, skipping product creation');
  } else {
    const uploadedImageUrls = created.imageUrls.slice(0, 2);
    const imageUrlsForProducts = uploadedImageUrls.length > 0 ? uploadedImageUrls : PUBLIC_IMAGE_FALLBACKS.slice(0, 2);
    for (let i = 1; i <= 3; i += 1) {
      const payload = buildProductPayload(i, created.categoryId, imageUrlsForProducts);
      const createProductRes = await call('products', 'post', '/products', payload, headers);
      let productId = createProductRes?.data?.data?.id || createProductRes?.data?.id || null;

      if (!productId) {
        const message = extractProductErrorMessage(createProductRes);
        const shouldRetryWithPublicImages = /remote image|valid url|sideload|http/i.test(message);
        if (shouldRetryWithPublicImages) {
          const retryPayload = buildProductPayload(i, created.categoryId, PUBLIC_IMAGE_FALLBACKS.slice(0, 2));
          const retryRes = await call('products', 'post', '/products', retryPayload, headers);
          productId = retryRes?.data?.data?.id || retryRes?.data?.id || null;
        }
      }

      if (productId) {
        created.productIds.push(productId);
        await call('products', 'get', `/products/${productId}`, null, headers);
      }
    }

    if (created.productIds.length > 0) {
      await call(
        'products',
        'put',
        `/products/${created.productIds[0]}`,
        { care_instructions: 'Dry clean only. Store in cotton bag.', stock_quantity: 99 },
        headers
      );
    }
  }

  // Cart
  await call('cart', 'get', '/cart', null, headers);
  if (created.productIds.length > 0) {
    await call('cart', 'put', '/cart', { items: [{ product_id: created.productIds[0], quantity: 2 }] }, headers);
    await call('cart', 'get', '/cart', null, headers);
    await call('cart', 'delete', '/cart', null, headers);
  } else {
    pushResult('cart', 'PUT', '/cart', 0, false, 'Skipped cart write due to no created products');
  }

  // Orders
  await call('orders', 'get', '/orders', null, headers);
  if (created.productIds.length > 0) {
    const orderPayload = {
      payment_method: 'cod',
      payment_method_title: 'Cash on Delivery',
      set_paid: false,
      billing: {
        first_name: 'API',
        last_name: 'Tester',
        address_1: '123 Test Street',
        city: 'Chennai',
        state: 'TN',
        postcode: '600001',
        country: 'IN',
        email: `api.order.${Date.now()}@example.com`,
        phone: '9876543210',
      },
      shipping: {
        first_name: 'API',
        last_name: 'Tester',
        address_1: '123 Test Street',
        city: 'Chennai',
        state: 'TN',
        postcode: '600001',
        country: 'IN',
      },
      line_items: [
        {
          product_id: created.productIds[0],
          quantity: 1,
        },
      ],
    };

    const orderCreateRes = await call('orders', 'post', '/orders', orderPayload, headers);
    created.orderId = orderCreateRes?.data?.data?.id || orderCreateRes?.data?.id || null;
    if (created.orderId) {
      await call('orders', 'get', `/orders/${created.orderId}`, null, headers);
      await call('orders', 'put', `/orders/${created.orderId}`, { status: 'processing' }, headers);
    }
  }

  // Customers
  await call('customers', 'get', '/customers', null, headers);
  const customerPayload = {
    email: `api.customer.${Date.now()}@example.com`,
    first_name: 'API',
    last_name: 'Customer',
    username: `api_customer_${Date.now()}`,
    password: 'Customer#12345',
  };
  const createCustomerRes = await call('customers', 'post', '/customers', customerPayload, headers);
  created.customerId = createCustomerRes?.data?.data?.id || createCustomerRes?.data?.id || null;
  if (created.customerId) {
    await call('customers', 'get', `/customers/${created.customerId}`, null, headers);
    await call('customers', 'put', `/customers/${created.customerId}`, { first_name: 'API-Updated' }, headers);
    await call('customers', 'delete', `/customers/${created.customerId}`, null, headers);
  }

  // Coupons
  await call('coupons', 'get', '/coupons', null, headers);
  const couponCode = `API${Date.now().toString().slice(-8)}`;
  const createCouponRes = await call(
    'coupons',
    'post',
    '/coupons',
    { code: couponCode, discount_type: 'percent', amount: '10', description: 'API test coupon' },
    headers
  );
  created.couponId = createCouponRes?.data?.data?.id || createCouponRes?.data?.id || null;
  if (created.couponId) {
    await call('coupons', 'get', `/coupons/${created.couponId}`, null, headers);
    await call('coupons', 'put', `/coupons/${created.couponId}`, { amount: '12' }, headers);
    await call('coupons', 'delete', `/coupons/${created.couponId}`, null, headers);
  }

  // Blog
  await call('blog', 'get', '/blog/posts');
  await call('blog', 'get', '/blog/capabilities', null, headers);
  const blogCreateRes = await call(
    'blog',
    'post',
    '/blog/posts',
    {
      title: `API Blog ${Date.now()}`,
      content: 'Automated API validation blog post content.',
      status: 'draft',
    },
    headers
  );
  created.blogPostId = blogCreateRes?.data?.data?.id || blogCreateRes?.data?.id || null;
  if (created.blogPostId) {
    await call('blog', 'get', `/blog/posts/${created.blogPostId}`);
    await call('blog', 'put', `/blog/posts/${created.blogPostId}`, { title: `API Blog Updated ${Date.now()}` }, headers);
    await call('blog', 'delete', `/blog/posts/${created.blogPostId}`, null, headers);
  }

  // Webhook endpoint
  await call(
    'webhooks',
    'post',
    '/webhooks/woocommerce',
    {
      id: created.productIds[0] || 0,
      name: 'Webhook Payload Product',
      type: 'simple',
      status: 'publish',
      categories: [],
      images: [],
      attributes: [],
      variations: [],
      meta_data: [],
    },
    { 'x-wc-webhook-topic': 'product.updated' }
  );

  const passed = results.filter((row) => row.ok).length;
  const failed = results.filter((row) => !row.ok).length;

  console.log('\n=== API Test Summary ===');
  console.log(`Total checks: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log('\nCreated artifacts:');
  console.log(JSON.stringify(created, null, 2));

  if (failed > 0) {
    console.log('\nFailures:');
    results
      .filter((row) => !row.ok)
      .forEach((row) => {
        console.log(`- [${row.scope}] ${row.method} ${row.endpoint} -> status=${row.status} ${row.details}`);
      });
  }

  const outPath = path.resolve(__dirname, '..', '..', '..', 'test_reports', `api_full_run_${Date.now()}.json`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({ results, created, summary: { passed, failed } }, null, 2));
  console.log(`\nReport: ${outPath}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
