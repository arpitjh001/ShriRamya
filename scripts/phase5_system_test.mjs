import { performance } from 'node:perf_hooks';
import fs from 'node:fs/promises';
import path from 'node:path';

const base = 'http://localhost:8080/api/v1';

const parseMaybeJson = (text) => {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const request = async (method, url, { token, body, formData } = {}) => {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body != null && !formData) headers['Content-Type'] = 'application/json';

  const started = performance.now();
  try {
    const response = await fetch(url, {
      method,
      headers,
      body: formData ?? (body != null ? JSON.stringify(body) : undefined),
    });
    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      ms: Number((performance.now() - started).toFixed(2)),
      body: parseMaybeJson(text),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      ms: Number((performance.now() - started).toFixed(2)),
      body: { error: error.message },
    };
  }
};

const uploadImage = async (filePath, token) => {
  const buffer = await fs.readFile(filePath);
  const extension = path.extname(filePath).toLowerCase();
  const mimeTypeByExt = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };
  const blob = new Blob([buffer], { type: mimeTypeByExt[extension] || 'application/octet-stream' });
  const formData = new FormData();
  formData.append('file', blob, path.basename(filePath));

  const res = await request('POST', `${base}/upload`, { token, formData });
  if (!res.ok || !res.body?.url) {
    throw new Error(`Upload failed for ${filePath}: ${JSON.stringify(res)}`);
  }
  return res.body.url;
};

const main = async () => {
  const seed = Math.floor(Date.now() / 1000);
  const email = `phase5.admin.${seed}@example.com`;
  const password = 'AdminPass123!';

  const registerRes = await request('POST', `${base}/auth/register`, {
    body: { email, password, name: 'Phase5 Admin', phone: '9999999999' },
  });
  const loginRes = await request('POST', `${base}/auth/login`, {
    body: { email, password },
  });
  if (!loginRes.ok) {
    throw new Error(`Login failed: ${JSON.stringify(loginRes)}`);
  }

  const token = loginRes.body?.data?.access_token;
  if (!token) {
    throw new Error(`Access token missing in login response: ${JSON.stringify(loginRes)}`);
  }

  const localImageFiles = [
    'uploads/banarasi_red.png',
    'uploads/designer_pink.png',
    'uploads/kanjivaram_blue.png',
    'uploads/test1.png',
    'uploads/test2.png',
  ];

  const uploadedUrls = [];
  for (const imageFile of localImageFiles) {
    try {
      await fs.access(imageFile);
      uploadedUrls.push(await uploadImage(imageFile, token));
    } catch {
      // Skip missing files
    }
  }
  if (uploadedUrls.length < 3) {
    throw new Error('Not enough uploadable local image files were found.');
  }

  const now = new Date();
  const startIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const endIso = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString();

  const productSeeds = [
    { name: 'Royal Banarasi Silk Saree', basePrice: 4299, colors: ['Maroon', 'Emerald', 'Gold'], sizes: ['S', 'M', 'L'] },
    { name: 'Kanjeevaram Bridal Saree', basePrice: 5999, colors: ['Red', 'Wine', 'Olive'], sizes: ['S', 'M', 'L'] },
    { name: 'Embroidered Lehenga Set', basePrice: 7499, colors: ['Ruby', 'Ivory', 'Navy'], sizes: ['M', 'L', 'XL'] },
    { name: 'Festive Kurta Palazzo Set', basePrice: 3199, colors: ['Teal', 'Mustard', 'Pink'], sizes: ['S', 'M', 'L'] },
    { name: 'Designer Anarkali Suit', basePrice: 5299, colors: ['Black', 'Rose', 'Bottle Green'], sizes: ['M', 'L', 'XL'] },
  ];

  const createdProducts = [];
  const createLatencies = [];

  for (let p = 0; p < productSeeds.length; p += 1) {
    const item = productSeeds[p];
    const variants = [];

    for (let i = 0; i < 3; i += 1) {
      const price = item.basePrice + i * 150;
      const hasDiscount = i === 0 || i === 2;
      variants.push({
        sku: `P5-${seed}-${p}-${i}`,
        price,
        discountPrice: hasDiscount ? price - 400 : null,
        discountStart: i === 2 ? null : startIso,
        discountEnd: i === 2 ? null : endIso,
        stock: 20 + i * 5,
        attributes: { Color: item.colors[i], Size: item.sizes[i] },
        image: uploadedUrls[(p + i) % uploadedUrls.length],
      });
    }

    const payload = {
      name: `${item.name} ${seed}`,
      description: 'Phase 5 seeded product for discount pricing validation',
      basePrice: item.basePrice,
      status: 'published',
      attributes: [
        { name: 'Color', values: item.colors },
        { name: 'Size', values: item.sizes },
      ],
      variants,
    };

    const createRes = await request('POST', `${base}/products`, { token, body: payload });
    if (!createRes.ok) {
      throw new Error(`Product create failed: ${JSON.stringify(createRes)}`);
    }

    createdProducts.push(createRes.body?.data);
    createLatencies.push(createRes.ms);
  }

  const firstProductId = createdProducts[0]?.id;
  const lastProductId = createdProducts[createdProducts.length - 1]?.id;
  if (!firstProductId || !lastProductId) {
    throw new Error('Created product IDs missing.');
  }

  const getAllRes = await request('GET', `${base}/products`);
  const getOneRes = await request('GET', `${base}/products/${firstProductId}`);
  const updateRes = await request('PUT', `${base}/products/${firstProductId}`, {
    token,
    body: { name: `Updated Product ${seed}`, basePrice: 4399 },
  });

  const addVariantRes = await request('POST', `${base}/products/${firstProductId}/variants`, {
    token,
    body: {
      sku: `P5-ADD-${seed}`,
      price: 2899,
      discountPrice: 2299,
      discountStart: startIso,
      discountEnd: endIso,
      stock: 17,
      attributes: { Color: 'Saffron', Size: 'XL' },
      image: uploadedUrls[0],
    },
  });
  if (!addVariantRes.ok) {
    throw new Error(`Variant add failed: ${JSON.stringify(addVariantRes)}`);
  }

  const addedVariantId = addVariantRes.body?.data?.id;
  if (!addedVariantId) {
    throw new Error(`Added variant id missing: ${JSON.stringify(addVariantRes)}`);
  }

  const updateVariantRes = await request('PUT', `${base}/products/${firstProductId}/variants/${addedVariantId}`, {
    token,
    body: {
      sku: `P5-ADD-${seed}-UPD`,
      price: 2999,
      discountPrice: 2499,
      discountStart: startIso,
      discountEnd: endIso,
      stock: 14,
      attributes: { Color: 'Saffron', Size: 'XL' },
      image: uploadedUrls[1],
    },
  });

  const deleteVariantRes = await request('DELETE', `${base}/products/${firstProductId}/variants/${addedVariantId}`, { token });
  const deleteProductRes = await request('DELETE', `${base}/products/${lastProductId}`, { token });

  const unauthCreateRes = await request('POST', `${base}/products`, {
    body: { name: 'Unauthorized Product', basePrice: 1000 },
  });
  const unauthUpdateRes = await request('PUT', `${base}/products/${firstProductId}`, {
    body: { name: 'Unauthorized Update' },
  });

  const invalidDiscountRes = await request('POST', `${base}/products/${firstProductId}/variants`, {
    token,
    body: {
      sku: `P5-BAD-${seed}`,
      price: 1000,
      discountPrice: 1200,
      stock: 3,
      attributes: { Color: 'Bad', Size: 'M' },
      image: uploadedUrls[0],
    },
  });

  const invalidWindowRes = await request('POST', `${base}/products/${firstProductId}/variants`, {
    token,
    body: {
      sku: `P5-BAD-WINDOW-${seed}`,
      price: 1000,
      discountPrice: 800,
      discountStart: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      discountEnd: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      stock: 3,
      attributes: { Color: 'Bad2', Size: 'L' },
      image: uploadedUrls[0],
    },
  });

  const verifyProductRes = await request('GET', `${base}/products/${firstProductId}`);
  const discountVerification = (verifyProductRes.body?.data?.variants || []).map((variant) => ({
    sku: variant.sku,
    price: variant.price,
    discountPrice: variant.discountPrice,
    discountStart: variant.discountStart,
    discountEnd: variant.discountEnd,
    effectivePrice: variant.effectivePrice,
  }));

  const createAvg = Number((createLatencies.reduce((sum, item) => sum + item, 0) / createLatencies.length).toFixed(2));
  const createMax = Number(Math.max(...createLatencies).toFixed(2));

  const result = {
    seed,
    email,
    register: { ok: registerRes.ok, status: registerRes.status, ms: registerRes.ms },
    login: { ok: loginRes.ok, status: loginRes.status, ms: loginRes.ms },
    uploadCount: uploadedUrls.length,
    uploadedUrls,
    createdProductIds: createdProducts.map((p) => p.id),
    apiChecks: {
      'POST /auth/login': { ok: loginRes.ok, status: loginRes.status, ms: loginRes.ms },
      'POST /products': { ok: createdProducts.length === 5, createdCount: createdProducts.length, avgMs: createAvg, maxMs: createMax },
      'GET /products': { ok: getAllRes.ok, status: getAllRes.status, ms: getAllRes.ms },
      'GET /products/:id': { ok: getOneRes.ok, status: getOneRes.status, ms: getOneRes.ms },
      'PUT /products/:id': { ok: updateRes.ok, status: updateRes.status, ms: updateRes.ms },
      'DELETE /products/:id': { ok: deleteProductRes.ok, status: deleteProductRes.status, ms: deleteProductRes.ms },
      'POST /products/:product_id/variants': { ok: addVariantRes.ok, status: addVariantRes.status, ms: addVariantRes.ms },
      'PUT /products/:product_id/variants/:variant_id': { ok: updateVariantRes.ok, status: updateVariantRes.status, ms: updateVariantRes.ms },
      'DELETE /products/:product_id/variants/:variant_id': { ok: deleteVariantRes.ok, status: deleteVariantRes.status, ms: deleteVariantRes.ms },
      'POST /upload': { ok: uploadedUrls.length >= 5 },
      'Unauthorized create/update': { createStatus: unauthCreateRes.status, updateStatus: unauthUpdateRes.status },
    },
    schemaValidation: {
      discountPriceLtPrice: { status: invalidDiscountRes.status, ok: invalidDiscountRes.status === 400 },
      discountEndAfterStart: { status: invalidWindowRes.status, ok: invalidWindowRes.status === 400 },
    },
    discountVerification,
    performanceTargets: {
      createProductTargetMs: 300,
      fetchProductTargetMs: 100,
      createProductAvgMs: createAvg,
      createProductMaxMs: createMax,
      getProductsMs: getAllRes.ms,
      getProductByIdMs: getOneRes.ms,
      createTargetMet: createAvg < 300,
      getProductsTargetMet: getAllRes.ms < 100,
      getProductByIdTargetMet: getOneRes.ms < 100,
    },
  };

  await fs.writeFile('phase5_test_results.json', JSON.stringify(result, null, 2), 'utf8');
  console.log(JSON.stringify(result, null, 2));
};

main().catch((error) => {
  console.error(`PHASE5_TEST_FAILED: ${error.message}`);
  process.exit(1);
});
