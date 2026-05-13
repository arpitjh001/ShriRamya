const mongoose = require('mongoose');
const config = require('./src/config/config');

async function run() {
  await mongoose.connect(config.mongoose.url);
  const db = mongoose.connection.db;
  
  const count = await db.collection('products').countDocuments({ 
    $or: [
      { salePrice: { $exists: true } }, 
      { sale_price: { $exists: true } }, 
      { discountPrice: { $exists: true } }
    ] 
  });
  
  console.log('Products with top-level sale price:', count);
  
  await mongoose.disconnect();
}

run().catch(console.error);
