const fs = require('fs');
const path = require('path');
const { chromium } = require('../frontend/node_modules/playwright');

const FRONTEND_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:8000/api/v1';
const artifactsDir = path.join(__dirname, 'verification-artifacts');

fs.mkdirSync(artifactsDir, { recursive: true });

const result = {
  checks: [],
  created: {},
  screenshots: [],
  issues: [],
};

const record = (name, ok, detail = '') => {
  result.checks.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` - ${detail}` : ''}`);
};

const requestJson = async (pathName, options = {}) => {
  const response = await fetch(`${API_URL}${pathName}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {}),
    },
    body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body,
  });

  const text = await response.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  return { response, body };
};

const assertOk = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const getPublicProductId = (product) => product.slug || product.productId || product.id || product._id;

const loginAdmin = async () => {
  const { response, body } = await requestJson('/auth/login', {
    method: 'POST',
    body: { email: 'admin@shriramya.com', password: 'Admin@123' },
  });

  assertOk(response.ok, `Admin login failed: ${body.message || response.status}`);
  const token = body.data?.token || body.data?.access_token;
  assertOk(token, 'Admin login did not return a token');
  record('Admin login', true, `HTTP ${response.status}`);
  return token;
};

const createProduct = async (token) => {
  const stamp = Date.now();
  const payload = {
    name: `COD Test Checkout Saree ${stamp}`,
    sku: `COD-E2E-${stamp}`,
    basePrice: 1299,
    description: 'Temporary product created by Codex E2E verification. Safe to delete.',
    fabric: 'Cotton Silk',
    occasion: 'Testing',
    status: 'published',
    images: ['https://images.unsplash.com/photo-1610030469668-7b6c1e7b2a63?auto=format&fit=crop&w=900&q=80'],
    variants: [
      {
        sku: `COD-E2E-${stamp}-RED-M`,
        price: 1299,
        stock: 5,
        color: 'Red',
        size: 'M',
        attributes: { color: 'Red', size: 'M' },
      },
    ],
  };

  const { response, body } = await requestJson('/products', {
    method: 'POST',
    token,
    body: payload,
  });

  assertOk(response.ok, `Product creation failed: ${body.message || response.status}`);
  const product = body.data || {};
  const productId = getPublicProductId(product);
  assertOk(productId, 'Product creation response is missing product id');
  result.created.productId = String(productId);
  result.created.productName = product.name;
  result.created.variantId = product.variants?.[0]?.id || product.variants?.[0]?._id || null;
  record('Product creation API', true, `created ${product.name}`);
  return product;
};

const verifyApiCheckout = async (product) => {
  const sessionId = `codex_e2e_${Date.now()}`;
  const productId = getPublicProductId(product);
  const variantId = product.variants?.[0]?.id || product.variants?.[0]?._id;

  const addCart = await requestJson('/cart/add', {
    method: 'POST',
    headers: { 'x-session-id': sessionId },
    body: { productId, variantId, quantity: 1, color: 'Red', size: 'M' },
  });
  assertOk(addCart.response.ok, `Cart add failed: ${addCart.body.message || addCart.response.status}`);
  const cart = addCart.body.data;
  assertOk(Array.isArray(cart?.items) && cart.items.length === 1, 'Cart response did not include one item');
  record('Cart add API', true, `session ${sessionId}`);

  const orderPayload = {
    items: cart.items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      attributes: item.attributes,
    })),
    shipping_address: {
      name: 'Codex Test Customer',
      phone: '9999999999',
      address_line1: '1 Test Street',
      city: 'Jaipur',
      state: 'Rajasthan',
      pincode: '302001',
    },
    email: 'codex.test@example.com',
    is_mock: true,
  };

  const orderRes = await requestJson('/orders', { method: 'POST', body: orderPayload });
  assertOk(orderRes.response.ok, `Mock order creation failed: ${orderRes.body.message || orderRes.response.status}`);
  const order = orderRes.body.data;
  assertOk(order?.orderId && order?.isMock === true, 'Order response is not marked mock');
  result.created.orderId = order.orderId;
  record('Mock order creation API', true, order.orderId);

  const payRes = await requestJson(`/orders/${order.orderId}/payment`, {
    method: 'POST',
    body: {
      razorpay_payment_id: `pay_mock_${Date.now()}`,
      razorpay_order_id: order.razorpayOrderId,
      razorpay_signature: 'mock_signature',
    },
  });
  assertOk(payRes.response.ok, `Payment confirmation failed: ${payRes.body.message || payRes.response.status}`);
  assertOk(payRes.body.data?.paymentStatus === 'paid', `Payment status is ${payRes.body.data?.paymentStatus}`);
  record('Mock payment confirmation API', true, 'paymentStatus=paid');
};

const verifyBrowser = async (product) => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto(FRONTEND_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  const homeText = await page.locator('body').innerText();
  record('Homepage ribbon visible', homeText.includes('Under Construction. Data Displayed is currently for testing purpose.'), 'desktop');
  record('Homepage has content', homeText.length > 200, `${homeText.length} chars`);
  const desktopShot = path.join(artifactsDir, 'home-desktop.png');
  await page.screenshot({ path: desktopShot, fullPage: false });
  result.screenshots.push(desktopShot);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(FRONTEND_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const mobileRibbon = await page.locator('body').innerText();
  const mobileShot = path.join(artifactsDir, 'home-mobile.png');
  await page.screenshot({ path: mobileShot, fullPage: false });
  result.screenshots.push(mobileShot);
  record('Mobile homepage ribbon visible', mobileRibbon.includes('Under Construction. Data Displayed is currently for testing purpose.'), '390px viewport');
  record('Mobile homepage horizontal overflow', mobileOverflow <= 2, `overflow=${mobileOverflow}px`);

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.route('**/api/v1/orders', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }

    const payload = JSON.parse(route.request().postData() || '{}');
    await route.continue({
      postData: JSON.stringify({ ...payload, is_mock: true }),
      headers: {
        ...route.request().headers(),
        'content-type': 'application/json',
      },
    });
  });

  await page.goto(`${FRONTEND_URL}/products/${getPublicProductId(product)}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /Buy Now/i }).click();
  await page.waitForURL('**/checkout', { timeout: 30000 });
  await page.getByTestId('checkout-email').fill('codex.browser@example.com');
  await page.getByTestId('checkout-name').fill('Codex Browser Test');
  await page.getByTestId('checkout-phone').fill('9999999999');
  await page.getByTestId('checkout-address1').fill('1 Browser Test Street');
  await page.getByTestId('checkout-city').fill('Jaipur');
  await page.getByTestId('checkout-state').fill('Rajasthan');
  await page.getByTestId('checkout-pincode').fill('302001');
  await page.getByTestId('place-order-button').click();
  await page.waitForURL('**/order-success/**', { timeout: 45000 });
  record('Browser product-to-checkout flow', true, await page.url());

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${FRONTEND_URL}/products/${getPublicProductId(product)}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  const mobileProductOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const productShot = path.join(artifactsDir, 'product-mobile.png');
  await page.screenshot({ path: productShot, fullPage: false });
  result.screenshots.push(productShot);
  record('Mobile product page horizontal overflow', mobileProductOverflow <= 2, `overflow=${mobileProductOverflow}px`);

  const relevantErrors = consoleErrors.filter((entry) => (
    !entry.includes('Failed to load resource') &&
    !entry.includes('wishlist') &&
    !entry.includes('reviews/product')
  ));
  record('Browser console fatal errors', relevantErrors.length === 0, `${relevantErrors.length} relevant errors`);
  if (relevantErrors.length > 0) {
    result.issues.push({ name: 'console-errors', errors: relevantErrors.slice(0, 10) });
  }

  await browser.close();
};

const verifyXpressbeesConfig = async (token, orderId) => {
  const serviceability = await requestJson('/orders/admin/shipping/xpressbees/serviceability', {
    method: 'POST',
    token,
    body: {
      origin_pincode: '302001',
      destination_pincode: '302002',
      order_type: 'Prepaid',
      order_amount: 1299,
      weight: 0.5,
      length: 10,
      width: 10,
      height: 10,
    },
  });

  if (serviceability.response.ok) {
    record('XpressBees serviceability endpoint', true, 'returned couriers');
  } else {
    record('XpressBees serviceability endpoint', false, `${serviceability.response.status}: ${serviceability.body.message}`);
    result.issues.push({
      name: 'xpressbees-not-live-testable',
      detail: serviceability.body.message,
    });
  }

  const shipment = await requestJson(`/orders/admin/${orderId}/shipments`, {
    method: 'POST',
    token,
    body: {
      provider: 'xpressbees',
      weight: 0.5,
      length: 10,
      width: 10,
      height: 10,
      courier_id: '1',
      request_auto_pickup: true,
      preventMultiple: false,
    },
  });

  if (shipment.response.ok) {
    record('XpressBees shipment booking endpoint', true, 'shipment created');
  } else {
    record('XpressBees shipment booking endpoint', false, `${shipment.response.status}: ${shipment.body.message}`);
  }
};

(async () => {
  try {
    const token = await loginAdmin();
    const product = await createProduct(token);
    await verifyApiCheckout(product);
    await verifyBrowser(product);
    await verifyXpressbeesConfig(token, result.created.orderId);
  } catch (error) {
    result.issues.push({ name: 'verification-aborted', detail: error.message, stack: error.stack });
    console.error(error);
    process.exitCode = 1;
  } finally {
    fs.writeFileSync(path.join(artifactsDir, 'summary.json'), JSON.stringify(result, null, 2));
  }
})();
