const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const categoryFilterService = require('../services/categoryFilter.service');

async function run() {
  const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/';
  const dbName = process.env.DB_NAME || 'shriramya';
  const connectionUrl = `${mongoUrl.endsWith('/') ? mongoUrl : mongoUrl + '/'}${dbName}`;
  
  console.log('Connecting to database:', connectionUrl);
  await mongoose.connect(connectionUrl);
  
  try {
    await categoryFilterService.warmAllCategoryFabricCaches();
    console.log('✅ Warm up completed successfully.');
  } catch (error) {
    console.error('❌ Warm up failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database.');
  }
}

run();
