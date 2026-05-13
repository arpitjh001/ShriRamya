const mongoose = require('mongoose');
const Product = require('./src/models/product.model');
const config = require('./src/config/config');

async function run() {
  await mongoose.connect(config.mongoose.url);
  console.log('Connected to MongoDB');

  const products = await Product.find({})
    .sort({ created_at: -1 })
    .limit(5)
    .lean();

  console.log('--- Sample Products ---');
  products.forEach(p => {
    console.log(`ID: ${p._id}, Name: ${p.name}, Status: ${p.status}, Tenant: ${p.tenant_id}, Deleted: ${p.is_deleted || false}`);
  });

  await mongoose.disconnect();
}

run().catch(console.error);
