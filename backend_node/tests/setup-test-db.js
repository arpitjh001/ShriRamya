/**
 * Test Database Setup Script
 * Creates test databases and initializes schema
 */

const mysql = require('mysql2/promise');
const mongoose = require('mongoose');

const TEST_CONFIG = {
  mysql: {
    host: 'localhost',
    port: 3307,
    user: 'shriramya_user',
    password: 'shriramya_password',
    database: 'shriramya_test'
  },
  mongo: {
    url: 'mongodb://localhost:27017/shriramya_test'
  }
};

async function setupMySQL() {
  console.log('📊 Setting up MySQL test database...');
  
  let connection;
  try {
    // Connect without database selection
    connection = await mysql.createConnection({
      host: TEST_CONFIG.mysql.host,
      port: TEST_CONFIG.mysql.port,
      user: TEST_CONFIG.mysql.user,
      password: TEST_CONFIG.mysql.password
    });

    console.log('✓ Connected to MySQL');

    // Drop database if exists
    try {
      await connection.query(`DROP DATABASE IF EXISTS ${TEST_CONFIG.mysql.database}`);
      console.log('✓ Dropped existing test database');
    } catch (error) {
      console.log('ℹ No existing test database to drop');
    }

    // Create test database
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${TEST_CONFIG.mysql.database}`);
    console.log('✓ Created test database');

    // Use the database
    await connection.query(`USE ${TEST_CONFIG.mysql.database}`);
    console.log('✓ Using test database');

    // Run migrations or create tables here if needed
    console.log('✓ MySQL test database ready');
    
  } catch (error) {
    console.error('❌ MySQL setup failed:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function setupMongoDB() {
  console.log('🍃 Setting up MongoDB test database...');
  
  try {
    // Drop database if exists
    try {
      const adminDb = mongoose.connection.useDb('admin');
      const dbList = await adminDb.db.admin().listDatabases();
      const testDbExists = dbList.databases.some(db => db.name === TEST_CONFIG.mongo.url.split('/').pop());
      
      if (testDbExists) {
        await mongoose.connection.dropDatabase();
        console.log('✓ Dropped existing test database');
      }
    } catch (error) {
      console.log('ℹ No existing test database to drop');
    }

    // Connect to MongoDB
    await mongoose.connect(TEST_CONFIG.mongo.url);
    console.log('✓ Connected to MongoDB');
    console.log('✓ MongoDB test database ready');
    
    await mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ MongoDB setup failed:', error.message);
    throw error;
  }
}

async function main() {
  console.log('🧪 Starting test database setup...\n');
  
  try {
    // Setup MySQL
    await setupMySQL();
    console.log('');
    
    // Setup MongoDB
    await setupMongoDB();
    
    console.log('\n✅ Test database setup complete!');
    console.log('\nTest Databases:');
    console.log(`  - MySQL: ${TEST_CONFIG.mysql.host}:${TEST_CONFIG.mysql.port}/${TEST_CONFIG.mysql.database}`);
    console.log(`  - MongoDB: ${TEST_CONFIG.mongo.url}`);
    console.log('\nYou can now run tests with: npm test');
    
  } catch (error) {
    console.error('\n❌ Test database setup failed!');
    console.error('Error:', error.message);
    console.error('\nMake sure Docker containers are running:');
    console.log('  docker-compose up -d mysql mongodb redis');
    process.exit(1);
  }
}

// Run setup
main();
