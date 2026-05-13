const mongoose = require('mongoose');
const User = require('./src/models/user.model');
const config = require('./src/config/config');

async function run() {
  await mongoose.connect(config.mongoose.url);
  console.log('Connected to MongoDB');

  const users = await User.aggregate([
    { $group: { _id: '$role', count: { $sum: 1 } } }
  ]);

  console.log('--- User Roles ---');
  users.forEach(u => console.log(`  ${u._id}: ${u.count}`));

  const admins = await User.find({ role: 'admin' }).select('email name').lean();
  console.log('\n--- Admins ---');
  admins.forEach(a => console.log(`  ${a.email} (${a.name})`));

  await mongoose.disconnect();
}

run().catch(console.error);
