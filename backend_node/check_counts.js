const mongoose = require('mongoose');
const Product = require('./src/models/product.model');
const config = require('./src/config/config');

async function run() {
  await mongoose.connect(config.mongoose.url);
  console.log('Connected to MongoDB');

  const total = await Product.countDocuments({});
  const active = await Product.countDocuments({ is_deleted: { $ne: true } });
  const deleted = await Product.countDocuments({ is_deleted: true });
  
  const byTenant = await Product.aggregate([
    { $group: { _id: '$tenant_id', count: { $sum: 1 } } }
  ]);

  const byStatus = await Product.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  const byTenantAndDeleted = await Product.aggregate([
    { $group: { _id: { tenant_id: '$tenant_id', is_deleted: '$is_deleted' }, count: { $sum: 1 } } }
  ]);

  console.log('--- Statistics ---');
  console.log('Total Products:', total);
  console.log('Active (not deleted):', active);
  console.log('Soft Deleted:', deleted);
  console.log('\nBy Status:');
  byStatus.forEach(s => console.log(`  ${s._id || 'null'}: ${s.count}`));
  console.log('\nBy Tenant ID:');
  byTenant.forEach(t => console.log(`  ${t._id || 'null'}: ${t.count}`));
  console.log('\nBy Tenant and Deleted Status:');
  byTenantAndDeleted.forEach(td => console.log(`  Tenant: ${td._id.tenant_id || 'null'}, Deleted: ${td._id.is_deleted || false}, Count: ${td.count}`));

  await mongoose.disconnect();
}

run().catch(console.error);
