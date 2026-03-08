// Create admin user directly in MongoDB
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://mongodb:27017/';
const DB_NAME = process.env.DB_NAME || 'shriramya';

async function createAdmin() {
  try {
    await mongoose.connect(`${MONGO_URL}${DB_NAME}`);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // Check if admin exists
    const existing = await usersCollection.findOne({ email: 'admin@shriramya.com' });
    if (existing) {
      console.log('⚠️  Admin already exists, updating password...');
      const hashedPassword = await bcrypt.hash('Admin@123', 10);
      await usersCollection.updateOne(
        { email: 'admin@shriramya.com' },
        { $set: { password: hashedPassword, role: 'admin' } }
      );
      console.log('✅ Admin password updated!');
    } else {
      console.log('Creating admin user...');
      const hashedPassword = await bcrypt.hash('Admin@123', 10);
      await usersCollection.insertOne({
        name: 'Shri Ramya Admin',
        email: 'admin@shriramya.com',
        password: hashedPassword,
        role: 'admin',
        phone: '+91 9876543210',
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('✅ Admin user created!');
    }
    
    console.log('📧 Email: admin@shriramya.com');
    console.log('🔑 Password: Admin@123');
    
    await mongoose.connection.close();
    console.log('👋 Done');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createAdmin();
