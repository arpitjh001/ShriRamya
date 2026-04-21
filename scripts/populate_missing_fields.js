const mongoose = require('mongoose');

const nonSrvUrl = "mongodb://arpitjh001:DpyoKp8in9QBhoqW@ac-e7drapw-shard-00-00.wwimqmj.mongodb.net:27017,ac-e7drapw-shard-00-01.wwimqmj.mongodb.net:27017,ac-e7drapw-shard-00-02.wwimqmj.mongodb.net:27017/shriramya?tls=true&authSource=admin&replicaSet=atlas-10ml3p-shard-0&retryWrites=true&w=majority&appName=ShriRamya-Cluster";

async function migrate() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(nonSrvUrl);
    console.log('Connected.');

    const collection = mongoose.connection.db.collection('products');
    
    console.log('Starting migration for products collection...');

    // 1. Populate is_deleted where missing
    const deletedRes = await collection.updateMany(
      { is_deleted: { $exists: false } },
      { $set: { is_deleted: false } }
    );
    console.log(`Updated ${deletedRes.modifiedCount} documents with is_deleted: false`);

    // 2. Populate status where missing
    const statusRes = await collection.updateMany(
      { status: { $exists: false } },
      { $set: { status: 'published' } }
    );
    console.log(`Updated ${statusRes.modifiedCount} documents with status: published`);

    // 3. Populate tenant_id and tenantId where missing (default to 1)
    const tenantRes = await collection.updateMany(
      { $and: [ { tenant_id: { $exists: false } }, { tenantId: { $exists: false } } ] },
      { $set: { tenant_id: 1, tenantId: 1 } }
    );
    console.log(`Updated ${tenantRes.modifiedCount} documents with tenant_id: 1`);

    console.log('Migration completed successfully.');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

migrate();
