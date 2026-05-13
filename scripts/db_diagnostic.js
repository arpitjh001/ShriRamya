const mongoose = require('mongoose');

const srvUrl = process.env.MONGO_URL || "mongodb://localhost:27017/shriramya";
const nonSrvUrl = process.env.MONGODB_NON_SRV_URL || srvUrl;

async function diagnose() {
  try {
    console.log('Connecting to MongoDB (尝试 Non-SRV if needed)...');
    try {
      await mongoose.connect(nonSrvUrl);
      console.log('Connected using Non-SRV URL.');
    } catch (srvErr) {
      console.warn('Non-SRV failed, trying SRV...', srvErr.message);
      await mongoose.connect(srvUrl);
      console.log('Connected using SRV URL.');
    }

    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));

    if (collections.find(c => c.name === 'products')) {
      const productCount = await mongoose.connection.db.collection('products').countDocuments();
      console.log('Total products in collection "products":', productCount);

      if (productCount > 0) {
        const sample = await mongoose.connection.db.collection('products').findOne({});
        console.log('Sample product keys:', Object.keys(sample));
        console.log('Sample product status:', sample.status);
        console.log('Sample product tenant_id:', sample.tenant_id);
        console.log('Sample product is_deleted:', sample.is_deleted);

        const tenantCounts = await mongoose.connection.db.collection('products').aggregate([
          { $group: { _id: "$tenant_id", count: { $sum: 1 } } }
        ]).toArray();
        console.log('Tenant ID distribution:', tenantCounts);

        const statusCounts = await mongoose.connection.db.collection('products').aggregate([
          { $group: { _id: "$status", count: { $sum: 1 } } }
        ]).toArray();
        console.log('Status distribution:', statusCounts);
      }
    } else {
      console.log('NO "products" collection found!');
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Final Error:', err);
  }
}

diagnose();
