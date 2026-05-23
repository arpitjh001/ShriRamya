const mongoose = require('mongoose');
const User = require('../src/models/user.model');
const config = require('../src/config/config');

async function run() {
  await mongoose.connect(config.mongoose.url);
  console.log('Connected to MongoDB');

  const users = await User.find({}).select('email name role').lean();
  console.log('--- All Users in Database ---');
  users.forEach(u => console.log(`  Role: ${u.role.padEnd(10)} | Email: ${u.email.padEnd(30)} | Name: ${u.name}`));

  await mongoose.disconnect();
}

run().catch(console.error);
