const mongoose = require('mongoose');
const Product = require('./src/models/product.model');
const config = require('./src/config/config');

async function run() {
  await mongoose.connect(config.mongoose.url);
  console.log('Connected to MongoDB');

  const counts = await Product.aggregate([
    { $group: { _id: { tenant_id: '$tenant_id', tenantId: '$tenantId' }, count: { $sum: 1 } } }
  ]);

  console.log('--- Product Tenant Counts ---');
  counts.forEach(c => console.log(`  ${JSON.stringify(c._id)}: ${c.count}`));

  await mongoose.disconnect();
}

run().catch(console.error);
