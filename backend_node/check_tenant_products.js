const mongoose = require('mongoose');
const config = require('./src/config/config');

async function run() {
  await mongoose.connect(config.mongoose.url);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const results = await db.collection('products').aggregate([
    { 
      $group: { 
        _id: { 
          tenant_id: { $ifNull: ['$tenant_id', 'MISSING'] }, 
          tenantId: { $ifNull: ['$tenantId', 'MISSING'] } 
        }, 
        count: { $sum: 1 } 
      } 
    }
  ]).toArray();
  
  console.log('Products by Tenant:', JSON.stringify(results, null, 2));

  await mongoose.disconnect();
}

run().catch(console.error);
