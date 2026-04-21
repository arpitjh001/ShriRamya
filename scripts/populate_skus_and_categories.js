const mongoose = require('mongoose');

const nonSrvUrl = "mongodb://arpitjh001:DpyoKp8in9QBhoqW@ac-e7drapw-shard-00-00.wwimqmj.mongodb.net:27017,ac-e7drapw-shard-00-01.wwimqmj.mongodb.net:27017,ac-e7drapw-shard-00-02.wwimqmj.mongodb.net:27017/shriramya?tls=true&authSource=admin&replicaSet=atlas-10ml3p-shard-0&retryWrites=true&w=majority&appName=ShriRamya-Cluster";

async function migrate() {
  try {
    await mongoose.connect(nonSrvUrl);
    const productColl = mongoose.connection.db.collection('products');
    const categoryColl = mongoose.connection.db.collection('categories');
    
    // 1. Get all categories for mapping
    const allCategories = await categoryColl.find({}).toArray();
    const categoryMap = {}; // Name -> ID
    allCategories.forEach(cat => {
        categoryMap[cat.name.toLowerCase()] = cat._id;
    });

    // 2. Iterate and update products
    const products = await productColl.find({}).toArray();
    let skuUpdated = 0;
    let categoryMapped = 0;

    for (const p of products) {
        const update = {};
        
        // Populate SKU if missing
        if (!p.sku) {
            update.sku = "SR-" + (p.productId || p._id.toString().slice(-8));
            skuUpdated++;
        }

        // Map categoryName to categories array if needed
        if ((!p.categories || p.categories.length === 0) && p.categoryName) {
            const catId = categoryMap[p.categoryName.toLowerCase()];
            if (catId) {
                update.categories = [catId];
                update.categoryId = catId.toString();
                categoryMapped++;
            }
        }

        if (Object.keys(update).length > 0) {
            await productColl.updateOne({ _id: p._id }, { $set: update });
        }
    }

    console.log(`Migration Complete:`);
    console.log(`- SKUs Generated/Updated: ${skuUpdated}`);
    console.log(`- Categories Mapped to Array: ${categoryMapped}`);

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error during migration:', err);
  }
}

migrate();
