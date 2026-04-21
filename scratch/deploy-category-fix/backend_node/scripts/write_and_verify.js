#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Build mongo connection URL similar to check_mongo.js
function buildMongoUrl(fullUri, baseUrl, dbName) {
  if (fullUri) return fullUri;
  if (!baseUrl) return null;
  if (!dbName) return baseUrl;
  if (baseUrl.includes('?')) {
    const [baseWithoutQuery, query] = baseUrl.split('?');
    const normalizedBase = baseWithoutQuery.endsWith('/') ? baseWithoutQuery : `${baseWithoutQuery}/`;
    return `${normalizedBase}${dbName}?${query}`;
  }
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${normalizedBase}${dbName}`;
}

async function main() {
  const BASE_URL = process.env.BASE_URL || 'https://www.shriramya.com/api/v1';
  console.log('BASE_URL:', BASE_URL);

  // 1) Admin login
  const adminEmail = 'admin@shriramya.com';
  const adminPassword = 'Admin@123';

  console.log('Logging in as admin...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });

  const loginJson = await loginRes.json().catch(() => null);
  if (!loginJson || !loginJson.success || !loginJson.data || !loginJson.data.token) {
    console.error('Admin login failed:', JSON.stringify(loginJson, null, 2));
    process.exit(1);
  }
  const token = loginJson.data.token;
  console.log('Admin login OK');

  // 2) Upload a small PNG as multipart/form-data
  console.log('Uploading test image...');
  const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
  const buffer = Buffer.from(base64Png, 'base64');

  // Use global FormData/Blob available in Node 18+
  if (typeof FormData === 'undefined' || typeof Blob === 'undefined') {
    console.error('FormData/Blob is not available in this Node runtime. Cannot upload image.');
    process.exit(1);
  }

  const form = new FormData();
  const blob = new Blob([buffer], { type: 'image/png' });
  form.append('file', blob, 'test-image.png');
  form.append('category', 'products');

  const uploadRes = await fetch(`${BASE_URL}/upload/image`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: form,
  });
  const uploadJson = await uploadRes.json().catch(() => null);
  if (!uploadJson || !uploadJson.success) {
    console.error('Image upload failed:', JSON.stringify(uploadJson, null, 2));
    process.exit(1);
  }
  const uploadData = uploadJson.data || uploadJson;

  // Heuristics to find a useful URL or internal API path
  const uploadedUrl = uploadData.medium || uploadData.original || uploadData.thumbnail || (uploadData.cdn && (uploadData.cdn.medium || uploadData.cdn.original)) || uploadData.url || uploadData.imageUrl || (uploadData.urls && (uploadData.urls.medium || uploadData.urls.original));

  console.log('Upload response:', JSON.stringify(uploadData, null, 2));
  console.log('Selected uploadedUrl:', uploadedUrl || 'NONE');

  // 3) Create a product referencing the uploaded image
  console.log('Creating test product...');
  const productName = 'WRITE-TEST Product ' + Date.now();
  const slug = productName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 10000);

  const productPayload = {
    name: productName,
    slug,
    basePrice: 199,
    status: 'draft',
    images: uploadedUrl ? [uploadedUrl] : [],
  };

  const createRes = await fetch(`${BASE_URL}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(productPayload),
  });

  const createJson = await createRes.json().catch(() => null);
  if (!createJson || !createJson.success) {
    console.error('Product creation failed:', JSON.stringify(createJson, null, 2));
    process.exit(1);
  }
  const createdProduct = createJson.data;
  console.log('Created product:', JSON.stringify(createdProduct, null, 2));

  // 4) Connect to MongoDB and verify documents
  console.log('\nConnecting to MongoDB to verify records...');

  // Gather connection info from env or vercel.json
  let fullUri = process.env.MONGODB_URI || null;
  let baseUrlEnv = process.env.MONGO_URL || null;
  let dbName = process.env.DB_NAME || null;

  // Read vercel.json fallback
  const vercelPath = path.resolve(__dirname, '..', '..', 'vercel.json');
  if (!fullUri && !baseUrlEnv && fs.existsSync(vercelPath)) {
    try {
      const vercel = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
      fullUri = fullUri || (vercel.env && vercel.env.MONGODB_URI) || null;
      baseUrlEnv = baseUrlEnv || (vercel.env && vercel.env.MONGO_URL) || null;
      dbName = dbName || (vercel.env && vercel.env.DB_NAME) || null;
    } catch (err) {
      // ignore
    }
  }

  let mongoUri = buildMongoUrl(fullUri, baseUrlEnv, dbName);
  const nonSrvHosts = process.env.MONGODB_NON_SRV_HOSTS;
  if (nonSrvHosts) {
    const sourceUri = fullUri || baseUrlEnv || '';
    const authMatch = sourceUri.match(/mongodb(?:\+srv)?:\/\/([^@]+)@/);
    const authPart = authMatch ? authMatch[1] : null;
    const db = dbName || '';
    if (!authPart) {
      console.error('Cannot build non-SRV URI: missing auth credentials in existing MONGODB_URI or MONGO_URL');
      process.exit(1);
    }
    mongoUri = `mongodb://${authPart}@${nonSrvHosts}/${db}?ssl=true&authSource=admin&retryWrites=true&w=majority`;
  }

  if (!mongoUri) {
    console.error('No Mongo connection string found. Set MONGODB_URI or MONGO_URL (+ DB_NAME) in environment or vercel.json');
    process.exit(1);
  }

  // Redact credentials when printing
  const redacted = mongoUri.replace(/(mongodb(?:\+srv)?:\/\/)(?:.*?:.*?@)/, '$1REDACTED:REDACTED@');
  console.log('Mongo URI (redacted):', redacted);

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connect error:', err.message);
    process.exit(1);
  }

  try {
    const Product = require('../src/models/product.model');
    const Image = require('../src/models/images.model');

    // Find created product by slug or name
    const foundProduct = await Product.findOne({ slug }).lean();
    console.log('\nFound product document:');
    console.log(JSON.stringify(foundProduct, null, 2));

    // If uploadedUrl contains UUID, check images collection
    let imageUuid = null;
    if (uploadedUrl) {
      const m = String(uploadedUrl).match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      if (m) imageUuid = m[0];
    }

    if (imageUuid) {
      const foundImage = await Image.findOne({ imageId: imageUuid }).lean();
      console.log('\nFound image document:');
      console.log(JSON.stringify(foundImage, null, 2));
    } else {
      console.log('\nNo UUID-style imageId detected in uploaded URL; image may be stored externally or not saved to images collection.');
    }

  } catch (err) {
    console.error('Error querying DB:', err.message);
  } finally {
    await mongoose.disconnect();
  }

  console.log('\nWrite-and-verify completed');
}

main().catch(err => {
  console.error('Fatal error:', err && err.stack ? err.stack : err);
  process.exit(1);
});
