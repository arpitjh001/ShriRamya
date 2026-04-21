const mongoose = require('mongoose');

const nonSrvUrl = "mongodb://arpitjh001:DpyoKp8in9QBhoqW@ac-e7drapw-shard-00-00.wwimqmj.mongodb.net:27017,ac-e7drapw-shard-00-01.wwimqmj.mongodb.net:27017,ac-e7drapw-shard-00-02.wwimqmj.mongodb.net:27017/shriramya?tls=true&authSource=admin&replicaSet=atlas-10ml3p-shard-0&retryWrites=true&w=majority&appName=ShriRamya-Cluster";

async function diagnose() {
  try {
    await mongoose.connect(nonSrvUrl);
    const collection = mongoose.connection.db.collection('products');
    
    const modernProduct = await collection.findOne({ sku: { $exists: true, $ne: null } });
    console.log('Modern Product Sample:', JSON.stringify(modernProduct, null, 2));

    const legacyProduct = await collection.findOne({ sku: { $exists: false } });
    console.log('Legacy Product Sample:', JSON.stringify(legacyProduct, null, 2));

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

diagnose();
