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
  const productArg = process.env.TEST_PRODUCT_ID || process.argv[2] || '69da0bfd24ecac80bf0904f5';
  const imageArg = process.env.TEST_IMAGE_ID || process.argv[3] || 'e3771d62-3be3-4336-be17-4cc2b3913603';

  console.log('Target product identifier:', productArg);
  console.log('Target imageId:', imageArg);

  let fullUri = process.env.MONGODB_URI || null;
  let baseUrl = process.env.MONGO_URL || null;
  let dbName = process.env.DB_NAME || null;

  // Fallback to vercel.json if needed
  const vercelPath = path.resolve(__dirname, '..', '..', 'vercel.json');
  if (!fullUri && !baseUrl && fs.existsSync(vercelPath)) {
    try {
      const vercel = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
      fullUri = fullUri || (vercel.env && vercel.env.MONGODB_URI) || null;
      baseUrl = baseUrl || (vercel.env && vercel.env.MONGO_URL) || null;
      dbName = dbName || (vercel.env && vercel.env.DB_NAME) || null;
    } catch (err) {
      // ignore
    }
  }

  let mongoUri = buildMongoUrl(fullUri, baseUrl, dbName);
  const nonSrvHosts = process.env.MONGODB_NON_SRV_HOSTS;
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

  if (!mongoUri) {
    console.error('No Mongo connection string found. Set MONGODB_URI or MONGO_URL (+ DB_NAME) in environment or vercel.json');
    process.exit(1);
  }

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
    const Product = require('../src/models/product.model');
    const Image = require('../src/models/images.model');

    // Delete product
    let prodQuery = {};
    if (mongoose.Types.ObjectId.isValid(productArg)) {
      prodQuery._id = productArg;
    } else if (/^\d+$/.test(String(productArg))) {
      prodQuery.productId = Number(productArg);
    } else {
      prodQuery.slug = String(productArg);
    }

    const foundProduct = await Product.findOne(prodQuery).lean();
    if (foundProduct) {
      console.log('Found product to delete:', foundProduct._id.toString(), foundProduct.name || foundProduct.slug || 'N/A');
      const delP = await Product.deleteOne({ _id: foundProduct._id });
      console.log('Product delete result:', delP);
    } else {
      console.log('Product not found for identifier:', productArg);
    }

    // Delete image by imageId
    const foundImage = await Image.findOne({ imageId: imageArg }).lean();
    if (foundImage) {
      console.log('Found image to delete:', foundImage._id.toString(), foundImage.imageId, foundImage.originalName || 'N/A');
      const delI = await Image.deleteOne({ imageId: imageArg });
      console.log('Image delete result:', delI);
    } else {
      console.log('Image not found for imageId:', imageArg);
    }

  } catch (err) {
    console.error('Error during deletion:', err && err.stack ? err.stack : err);
    process.exit(3);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }

  console.log('Removal script completed');
}

main();
