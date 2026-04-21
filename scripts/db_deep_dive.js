const mongoose = require('mongoose');

const nonSrvUrl = "mongodb://arpitjh001:DpyoKp8in9QBhoqW@ac-e7drapw-shard-00-00.wwimqmj.mongodb.net:27017,ac-e7drapw-shard-00-01.wwimqmj.mongodb.net:27017,ac-e7drapw-shard-00-02.wwimqmj.mongodb.net:27017/shriramya?tls=true&authSource=admin&replicaSet=atlas-10ml3p-shard-0&retryWrites=true&w=majority&appName=ShriRamya-Cluster";

async function diagnose() {
  try {
    await mongoose.connect(nonSrvUrl);
    const collection = mongoose.connection.db.collection('products');
    
    const allDocs = await collection.find({}).toArray();
    const allKeys = new Set();
    allDocs.forEach(doc => {
      Object.keys(doc).forEach(key => allKeys.add(key));
    });
    
    console.log('Unique keys found in products collection:', Array.from(allKeys));

    // Check if any document has an SKU or categories array
    const withSku = allDocs.filter(d => d.sku || d.SKU || d.p_sku);
    console.log(`Products with some SKU field: ${withSku.length}`);
    if (withSku.length > 0) {
      console.log('Sample SKU key used:', Object.keys(withSku[0]).find(k => k.toLowerCase().includes('sku')));
    }

    const withMultiCat = allDocs.filter(d => Array.isArray(d.categories) || Array.isArray(d.category_ids) || Array.isArray(d.categoryNames));
    console.log(`Products with some multi-category field: ${withMultiCat.length}`);
    if (withMultiCat.length > 0) {
       const catKey = Object.keys(withMultiCat[0]).find(k => k.toLowerCase().includes('categor'));
       console.log('Sample category key used:', catKey, withMultiCat[0][catKey]);
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

diagnose();
