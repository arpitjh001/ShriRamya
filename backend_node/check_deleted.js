const mongoose = require('mongoose');
const Product = require('./src/models/product.model');
const config = require('./src/config/config');

async function run() {
  await mongoose.connect(config.mongoose.url);
  console.log('Connected to MongoDB');

  const deletedCount = await Product.countDocuments({ is_deleted: true });
  const nonDeletedCount = await Product.countDocuments({ is_deleted: { $ne: true } });

  console.log(`Deleted: ${deletedCount}`);
  console.log(`Non-Deleted: ${nonDeletedCount}`);

  await mongoose.disconnect();
}

run().catch(console.error);
