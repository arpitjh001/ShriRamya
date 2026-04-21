const mongoose = require('mongoose');

const nonSrvUrl = "mongodb://arpitjh001:DpyoKp8in9QBhoqW@ac-e7drapw-shard-00-00.wwimqmj.mongodb.net:27017,ac-e7drapw-shard-00-01.wwimqmj.mongodb.net:27017,ac-e7drapw-shard-00-02.wwimqmj.mongodb.net:27017/shriramya?tls=true&authSource=admin&replicaSet=atlas-10ml3p-shard-0&retryWrites=true&w=majority&appName=ShriRamya-Cluster";

async function diagnose() {
  try {
    await mongoose.connect(nonSrvUrl);
    const collection = mongoose.connection.db.collection('products');
    
    const p = await collection.findOne({ sku: { $exists: true, $ne: null } });
    if (p) {
        console.log('--- MODERN PRODUCT FOUND ---');
        console.log(JSON.stringify(p, null, 2));
    } else {
        console.log('No product with SKU field found.');
        // Maybe it's SKU (caps)?
        const p2 = await collection.findOne({ SKU: { $exists: true } });
        if (p2) console.log('Found with SKU (caps):', JSON.stringify(p2, null, 2));
    }

    const categories = await mongoose.connection.db.collection('categories').find({}).toArray();
    console.log('--- CATEGORIES COLLECTION ---');
    console.log(`Total categories: ${categories.length}`);
    if (categories.length > 0) {
        console.log('Sample category:', JSON.stringify(categories[0], null, 2));
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

diagnose();
