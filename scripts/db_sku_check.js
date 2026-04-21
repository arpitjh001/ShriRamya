const mongoose = require('mongoose');

const nonSrvUrl = "mongodb://arpitjh001:DpyoKp8in9QBhoqW@ac-e7drapw-shard-00-00.wwimqmj.mongodb.net:27017,ac-e7drapw-shard-00-01.wwimqmj.mongodb.net:27017,ac-e7drapw-shard-00-02.wwimqmj.mongodb.net:27017/shriramya?tls=true&authSource=admin&replicaSet=atlas-10ml3p-shard-0&retryWrites=true&w=majority&appName=ShriRamya-Cluster";

async function diagnose() {
  try {
    await mongoose.connect(nonSrvUrl);
    const collection = mongoose.connection.db.collection('products');

    const hasSku = await collection.findOne({ sku: { $exists: true, $ne: null } });
    console.log('Product with SKU exists:', !!hasSku);
    if (hasSku) console.log('SKU Sample:', hasSku.sku);

    const hasCategories = await collection.findOne({ categories: { $exists: true, $not: { $size: 0 } } });
    console.log('Product with categories array exists:', !!hasCategories);

    const hasVariants = await collection.findOne({ variants: { $exists: true, $not: { $size: 0 } } });
    console.log('Product with variants array exists:', !!hasVariants);

    const total = await collection.countDocuments();
    const countWithSku = await collection.countDocuments({ sku: { $exists: true } });
    const countWithCategories = await collection.countDocuments({ categories: { $exists: true } });
    
    console.log(`Total Products: ${total}`);
    console.log(`Products with SKU: ${countWithSku}`);
    console.log(`Products with Categories Array: ${countWithCategories}`);

    const sample = await collection.findOne({});
    console.log('Full Sample Document:', JSON.stringify(sample, null, 2));

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

diagnose();
