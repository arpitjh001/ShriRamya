const mongoose = require('mongoose');

const nonSrvUrl = "mongodb://arpitjh001:DpyoKp8in9QBhoqW@ac-e7drapw-shard-00-00.wwimqmj.mongodb.net:27017,ac-e7drapw-shard-00-01.wwimqmj.mongodb.net:27017,ac-e7drapw-shard-00-02.wwimqmj.mongodb.net:27017/shriramya?tls=true&authSource=admin&replicaSet=atlas-10ml3p-shard-0&retryWrites=true&w=majority&appName=ShriRamya-Cluster";

async function diagnose() {
  try {
    await mongoose.connect(nonSrvUrl);
    const productColl = mongoose.connection.db.collection('products');
    const categoryColl = mongoose.connection.db.collection('categories');
    
    const allCategories = await categoryColl.find({}).toArray();
    const categoryNames = allCategories.map(c => c.name.toLowerCase());
    const categorySlugs = allCategories.map(c => c.slug.toLowerCase());

    const products = await productColl.find({}).toArray();
    
    products.forEach(p => {
        const potentialCats = [];
        if (p.tags) {
            p.tags.forEach(tag => {
                if (categoryNames.includes(tag.toLowerCase()) || categorySlugs.includes(tag.toLowerCase())) {
                    potentialCats.push(tag);
                }
            });
        }
        if (potentialCats.length > 1) {
            console.log(`Product "${p.name}" has multiple potential categories in tags:`, potentialCats);
        }
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

diagnose();
