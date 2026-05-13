const mongoose = require('mongoose');
const Product = require('./src/models/product.model');
const config = require('./src/config/config');

async function run() {
  await mongoose.connect(config.mongoose.url);
  console.log('Connected to MongoDB');

  const published = await Product.countDocuments({ status: 'published' });
  const publish = await Product.countDocuments({ status: 'publish' });
  const draft = await Product.countDocuments({ status: 'draft' });

  console.log(`Published: ${published}`);
  console.log(`Publish: ${publish}`);
  console.log(`Draft: ${draft}`);

  const samples = await Product.find({ status: { $in: ['published', 'publish'] } }).limit(5).select('name status').lean();
  console.log('--- Published Samples ---');
  samples.forEach(s => console.log(`  ${s.name} (${s.status})`));

  await mongoose.disconnect();
}

run().catch(console.error);
