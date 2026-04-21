/**
 * Admin User Seed Script
 * Creates admin user for Shri Ramya Admin Dashboard
 * 
 * Usage: node scripts/seed-admin-user.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/';
const DB_NAME = process.env.DB_NAME || 'shriramya';

// Admin credentials
const ADMIN_EMAIL = 'admin@shriramya.com';
const ADMIN_PASSWORD = 'Admin@123';
const ADMIN_NAME = 'Shri Ramya Admin';

async function seedAdminUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(`${MONGO_URL}${DB_NAME}`, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Check if admin already exists
    const existingAdmin = await usersCollection.findOne({ email: ADMIN_EMAIL });
    
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists. Updating password...');
      
      // Update password
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
      await usersCollection.updateOne(
        { email: ADMIN_EMAIL },
        { 
          $set: { 
            password: hashedPassword,
            role: 'admin',
            updatedAt: new Date()
          } 
        }
      );
      
      console.log('✅ Admin password updated successfully!');
      console.log('📧 Email:', ADMIN_EMAIL);
      console.log('🔑 Password:', ADMIN_PASSWORD);
    } else {
      // Create admin user
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
      
      const adminUser = {
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        password: hashedPassword,
        role: 'admin',
        phone: '+91 9876543210',
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await usersCollection.insertOne(adminUser);
      console.log('✅ Admin user created successfully!');
      console.log('📧 Email:', ADMIN_EMAIL);
      console.log('🔑 Password:', ADMIN_PASSWORD);
    }

    // Verify admin can login
    const admin = await usersCollection.findOne({ email: ADMIN_EMAIL });
    const isMatch = await bcrypt.compare(ADMIN_PASSWORD, admin.password);
    
    if (isMatch && admin.role === 'admin') {
      console.log('✅ Admin login verified!');
    }

    await mongoose.connection.close();
    console.log('👋 Database connection closed');
    
  } catch (error) {
    console.error('❌ Error seeding admin user:', error.message);
    process.exit(1);
  }
}

// Run the seed script
seedAdminUser();
