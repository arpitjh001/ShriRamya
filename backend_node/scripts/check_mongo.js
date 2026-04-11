#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

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
  // Prefer environment variables
  let fullUri = process.env.MONGODB_URI || null;
  let baseUrl = process.env.MONGO_URL || null;
  let dbName = process.env.DB_NAME || null;

  // Fallback: read vercel.json from repo root
  if (!fullUri && !baseUrl) {
    const vercelPath = path.resolve(__dirname, '..', '..', 'vercel.json');
    if (fs.existsSync(vercelPath)) {
      try {
        const vercel = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
        fullUri = fullUri || (vercel.env && vercel.env.MONGODB_URI) || null;
        baseUrl = baseUrl || (vercel.env && vercel.env.MONGO_URL) || null;
        dbName = dbName || (vercel.env && vercel.env.DB_NAME) || null;
      } catch (err) {
        console.error('Failed to parse vercel.json:', err.message);
      }
    }
  }

  let mongoUri = buildMongoUrl(fullUri, baseUrl, dbName);
  if (!mongoUri) {
    console.error('No Mongo connection string found. Set MONGODB_URI or MONGO_URL (+ DB_NAME) in environment or vercel.json');
    process.exit(1);
  }

  // If provided, build a non-SRV connection string from the SRV credentials
  const nonSrvHosts = process.env.MONGODB_NON_SRV_HOSTS; // comma-separated host:port
  if (nonSrvHosts) {
    const sourceUri = fullUri || baseUrl || '';
    const authMatch = sourceUri.match(/mongodb(?:\+srv)?:\/\/([^@]+)@/);
    const authPart = authMatch ? authMatch[1] : null;
    const db = dbName || '';
    if (!authPart) {
      console.error('Cannot build non-SRV URI: missing auth credentials in existing MONGODB_URI or MONGO_URL');
      process.exit(1);
    }

    mongoUri = `mongodb://${authPart}@${nonSrvHosts}/${db}?ssl=true&authSource=admin&retryWrites=true&w=majority`;
  }

  // Redact credentials when printing (supports both mongodb+srv:// and mongodb://)
  const redacted = mongoUri.replace(/(mongodb(?:\+srv)?:\/\/)(?:.*?:.*?@)/, '$1REDACTED:REDACTED@');
  console.log('Connecting to MongoDB using:', redacted);

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log('MongoDB connection: OK');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(2);
  }

  try {
    // Require models (use same mongoose instance)
    const Product = require('../src/models/product.model');
    const Image = require('../src/models/images.model');

    const productCount = await Product.countDocuments({});
    const imageCount = await Image.countDocuments({});

    console.log(`Products count: ${productCount}`);
    console.log(`Images count: ${imageCount}`);

    const recentProducts = await Product.find({}).sort({ created_at: -1 }).limit(5).select('name slug _id images basePrice variants created_at').lean();
    console.log('\nRecent products (up to 5):');
    console.log(JSON.stringify(recentProducts, null, 2));

    const recentImages = await Image.find({}).sort({ uploadedAt: -1, createdAt: -1 }).limit(5).select('imageId originalName urls metadata uploadedAt createdAt').lean();
    console.log('\nRecent images (up to 5):');
    console.log(JSON.stringify(recentImages, null, 2));

    // Optional: check that images referenced by recent products exist in images collection
    const referencedImageIds = new Set();
    recentProducts.forEach(p => {
      if (Array.isArray(p.images)) {
        p.images.forEach(u => {
          // try to extract uuid imageId from URL
          const m = String(u || '').match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
          if (m) referencedImageIds.add(m[0]);
        });
      }
    });

    if (referencedImageIds.size > 0) {
      console.log('\nReferenced image IDs found in recent products:', Array.from(referencedImageIds));
      const refs = await Image.find({ imageId: { $in: Array.from(referencedImageIds) } }).select('imageId uploadedAt').lean();
      console.log('Referenced images present in images collection:', refs.map(r => r.imageId));
    } else {
      console.log('\nNo UUID-style image IDs found in recent product `images` arrays (could be external URLs).');
    }

  } catch (err) {
    console.error('Error querying collections:', err.message);
    console.error(err);
    process.exit(3);
  } finally {
    await mongoose.disconnect();
  }

  console.log('\nCheck complete');
  process.exit(0);
}

main();
