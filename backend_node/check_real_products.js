const mongoose = require('mongoose');
const Product = require('./src/models/product.model');
const config = require('./src/config/config');

async function run() {
  await mongoose.connect(config.mongoose.url);
  console.log('Connected to MongoDB');

  const total = await Product.countDocuments({});
  const samples = await Product.countDocuments({ name: { $regex: /SAMPLE/i } });
  const nonSamples = await Product.countDocuments({ name: { $not: /SAMPLE/i } });

  console.log(`Total: ${total}`);
  console.log(`Samples: ${samples}`);
  console.log(`Non-Samples: ${nonSamples}`);

  const sampleList = await Product.find({ name: { $not: /SAMPLE/i } }).limit(10).select('name status').lean();
  console.log('--- Non-Sample Products ---');
  sampleList.forEach(p => console.log(`  ${p.name} (${p.status})`));

  await mongoose.disconnect();
}

run().catch(console.error);
