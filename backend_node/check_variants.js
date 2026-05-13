const mongoose = require('mongoose');
const config = require('./src/config/config');

async function run() {
  await mongoose.connect(config.mongoose.url);
  const db = mongoose.connection.db;
  
  const withVariants = await db.collection('products').countDocuments({ 
    variants: { $exists: true, $not: { $size: 0 } } 
  });
  
  const withoutVariants = await db.collection('products').countDocuments({ 
    $or: [
      { variants: { $exists: false } }, 
      { variants: { $size: 0 } }
    ] 
  });
  
  console.log('Products with variants:', withVariants);
  console.log('Products without variants:', withoutVariants);
  
  await mongoose.disconnect();
}

run().catch(console.error);
