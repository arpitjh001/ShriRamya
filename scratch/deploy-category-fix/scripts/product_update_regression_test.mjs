import { performance } from 'node:perf_hooks';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';

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
  const extension = path.extname(filePath).toLowerCase();
  const mimeTypeByExt = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };
  const buffer = await fs.readFile(filePath);
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
  const email = `product.update.${seed}@example.com`;
  const password = 'AdminPass123!';

  const registerRes = await request('POST', `${base}/auth/register`, {
    body: { email, password, name: 'Product Update Admin', phone: '9999999999' },
  });
  const loginRes = await request('POST', `${base}/auth/login`, {
    body: { email, password },
  });
  if (!loginRes.ok) {
    throw new Error(`Login failed: ${JSON.stringify(loginRes)}`);
  }
  const token = loginRes.body?.data?.access_token;

  const redImage = await uploadImage('uploads/banarasi_red.png', token);
  const blueImage = await uploadImage('uploads/kanjivaram_blue.png', token);

  const createPayload = {
    name: `Silk Saree ${seed}`,
    sku: `SILK-SAREE-${seed}`,
    description: 'Silk saree variant regression test',
    fabric: 'Silk',
    occasion: 'Wedding',
    basePrice: 1999,
    status: 'published',
    attributes: [
      { name: 'Color', values: ['Red', 'Blue'] },
      { name: 'Size', values: ['S', 'M'] },
    ],
    variants: [
      {
        sku: `SR-RED-S-${seed}`,
        price: 1999,
        discountPrice: 1499,
        stock: 20,
        attributes: { Color: 'Red', Size: 'S' },
        image: redImage,
      },
      {
        sku: `SR-RED-M-${seed}`,
        price: 2099,
        discountPrice: 1599,
        stock: 18,
        attributes: { Color: 'Red', Size: 'M' },
        image: redImage,
      },
      {
        sku: `SR-BLUE-S-${seed}`,
        price: 2199,
        discountPrice: 1699,
        stock: 16,
        attributes: { Color: 'Blue', Size: 'S' },
        image: blueImage,
      },
      {
        sku: `SR-BLUE-M-${seed}`,
        price: 2299,
        discountPrice: 1799,
        stock: 14,
        attributes: { Color: 'Blue', Size: 'M' },
        image: blueImage,
      },
    ],
  };

  const createRes = await request('POST', `${base}/products`, { token, body: createPayload });
  if (!createRes.ok) {
    throw new Error(`Create failed: ${JSON.stringify(createRes)}`);
  }
  const productId = createRes.body?.data?.id;
  if (!productId) {
    throw new Error(`Missing product id from create response: ${JSON.stringify(createRes)}`);
  }

  const getAllRes = await request('GET', `${base}/products`);
  const getOneBeforeUpdateRes = await request('GET', `${base}/products/${productId}`);

  const updateProductRes = await request('PUT', `${base}/products/${productId}`, {
    token,
    body: {
      sku: `SILK-SAREE-UPDATED-${seed}`,
      fabric: 'Pure Silk',
      occasion: 'Festive',
      basePrice: 2499,
    },
  });

  const addVariantRes = await request('POST', `${base}/products/${productId}/variants`, {
    token,
    body: {
      sku: `SR-GREEN-L-${seed}`,
      price: 2399,
      discountPrice: 1899,
      stock: 10,
      attributes: { Color: 'Green', Size: 'L' },
      image: blueImage,
    },
  });

  const variantToUpdate = (getOneBeforeUpdateRes.body?.data?.variants || []).find((variant) =>
    String(variant.sku || '').startsWith(`SR-RED-S-${seed}`)
  ) || getOneBeforeUpdateRes.body?.data?.variants?.[0];

  const firstVariantId = variantToUpdate?.id;
  const updateVariantRes = await request('PUT', `${base}/products/${productId}/variants/${firstVariantId}`, {
    token,
    body: {
      sku: `SR-RED-S-UPDATED-${seed}`,
      price: Number(variantToUpdate?.price || 1999),
      discountPrice: Number(variantToUpdate?.discountPrice || 1499),
      stock: 25,
      attributes: variantToUpdate?.attributes || { Color: 'Red', Size: 'S' },
      image: redImage,
    },
  });

  const getOneAfterUpdateRes = await request('GET', `${base}/products/${productId}`);

  const mysqlVerificationRaw = execSync(
    `docker exec -i shriramya-mysql-1 mysql -uwpuser -pwppassword shriramya -e "SELECT id, sku, fabric, occasion FROM products WHERE id=${productId}; SELECT id, sku, price FROM product_variants WHERE product_id=${productId} ORDER BY id;"`,
    { encoding: 'utf8' }
  );

  const deleteRes = await request('DELETE', `${base}/products/${productId}`, { token });

  const result = {
    seed,
    email,
    productId,
    register: { ok: registerRes.ok, status: registerRes.status, ms: registerRes.ms },
    login: { ok: loginRes.ok, status: loginRes.status, ms: loginRes.ms },
    uploadedImages: [redImage, blueImage],
    apiResults: {
      'POST /products': { ok: createRes.ok, status: createRes.status, ms: createRes.ms },
      'GET /products': { ok: getAllRes.ok, status: getAllRes.status, ms: getAllRes.ms },
      'GET /products/:id (before)': { ok: getOneBeforeUpdateRes.ok, status: getOneBeforeUpdateRes.status, ms: getOneBeforeUpdateRes.ms },
      'PUT /products/:id': { ok: updateProductRes.ok, status: updateProductRes.status, ms: updateProductRes.ms },
      'POST /products/:product_id/variants': { ok: addVariantRes.ok, status: addVariantRes.status, ms: addVariantRes.ms },
      'PUT /products/:product_id/variants/:variant_id': { ok: updateVariantRes.ok, status: updateVariantRes.status, ms: updateVariantRes.ms },
      'GET /products/:id (after)': { ok: getOneAfterUpdateRes.ok, status: getOneAfterUpdateRes.status, ms: getOneAfterUpdateRes.ms },
      'DELETE /products/:id': { ok: deleteRes.ok, status: deleteRes.status, ms: deleteRes.ms },
    },
    updatePersistenceFromApi: {
      sku: getOneAfterUpdateRes.body?.data?.sku,
      fabric: getOneAfterUpdateRes.body?.data?.fabric,
      occasion: getOneAfterUpdateRes.body?.data?.occasion,
      firstVariantSku: getOneAfterUpdateRes.body?.data?.variants?.[0]?.sku,
    },
    mysqlVerificationRaw,
    samplePayloads: {
      createPayload,
      updatePayload: {
        sku: `SILK-SAREE-UPDATED-${seed}`,
        fabric: 'Pure Silk',
        occasion: 'Festive',
        basePrice: 2499,
      }
    },
  };

  await fs.writeFile('product_update_test_results.json', JSON.stringify(result, null, 2), 'utf8');
  console.log(JSON.stringify(result, null, 2));
};

main().catch((error) => {
  console.error(`PRODUCT_UPDATE_TEST_FAILED: ${error.message}`);
  process.exit(1);
});
