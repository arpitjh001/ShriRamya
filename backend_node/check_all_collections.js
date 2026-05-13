const mongoose = require('mongoose');
const config = require('./src/config/config');

async function run() {
  await mongoose.connect(config.mongoose.url);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  
  for (const col of collections) {
    const count = await db.collection(col.name).countDocuments();
    console.log(`${col.name}: ${count}`);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
