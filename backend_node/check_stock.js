const mongoose = require('mongoose');
const Product = require('./src/models/product.model');
const config = require('./src/config/config');

async function run() {
  await mongoose.connect(config.mongoose.url);
  console.log('Connected to MongoDB');

  const products = await Product.find({})
    .sort({ created_at: -1 })
    .limit(10)
    .lean();

  console.log('--- Stock Samples ---');
  products.forEach(p => {
    console.log(`Name: ${p.name}, Stock: ${p.stock}, StockQty: ${p.stock_quantity}`);
  });

  await mongoose.disconnect();
}

run().catch(console.error);
