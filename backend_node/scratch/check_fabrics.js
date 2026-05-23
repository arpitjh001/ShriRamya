const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const Product = require('../src/models/product.model');
const Category = require('../src/models/category.model');

async function run() {
  const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/';
  const dbName = process.env.DB_NAME || 'shriramya';
  const connectionUrl = `${mongoUrl.endsWith('/') ? mongoUrl : mongoUrl + '/'}${dbName}`;
  
  console.log('Connecting to:', connectionUrl);
  await mongoose.connect(connectionUrl);
  
  const products = await Product.find({ is_deleted: { $ne: true } }).populate('categories');
  console.log(`Found ${products.length} products`);
  
  const fabrics = new Set();
  const categoryFabrics = {};
  
  for (const product of products) {
    const fabric = product.fabric;
    if (fabric) {
      fabrics.add(fabric);
    }
    
    const cats = product.categories || [];
    const catSlugs = cats.map(c => c.slug);
    if (product.categoryId) {
      const mainCat = await Category.findById(product.categoryId);
      if (mainCat && !catSlugs.includes(mainCat.slug)) {
        catSlugs.push(mainCat.slug);
      }
    }
    
    catSlugs.forEach(slug => {
      if (!categoryFabrics[slug]) {
        categoryFabrics[slug] = {};
      }
      if (fabric) {
        categoryFabrics[slug][fabric] = (categoryFabrics[slug][fabric] || 0) + 1;
      }
    });
  }
  
  console.log('\nAll unique fabrics in database:', Array.from(fabrics));
  console.log('\nFabrics by category:');
  console.log(JSON.stringify(categoryFabrics, null, 2));
  
  await mongoose.disconnect();
}

run().catch(console.error);
