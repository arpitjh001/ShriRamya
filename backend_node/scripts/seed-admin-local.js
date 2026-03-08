/**
 * Quick Admin Seed Script - Local MongoDB
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URL = 'mongodb://localhost:27017/shriramya';
const ADMIN_EMAIL = 'admin@shriramya.com';
const ADMIN_PASSWORD = 'Admin@123';
const ADMIN_NAME = 'Shri Ramya Admin';

async function seedAdminUser() {
  try {
    await mongoose.connect(MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    const existingAdmin = await usersCollection.findOne({ email: ADMIN_EMAIL });

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists. Updating password...');
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
    } else {
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
    }

    const admin = await usersCollection.findOne({ email: ADMIN_EMAIL });
    const isMatch = await bcrypt.compare(ADMIN_PASSWORD, admin.password);

    if (isMatch && admin.role === 'admin') {
      console.log('✅ Admin login verified!');
      console.log('📧 Email:', ADMIN_EMAIL);
      console.log('🔑 Password:', ADMIN_PASSWORD);
    }

    await mongoose.connection.close();
    console.log('👋 Database connection closed');

  } catch (error) {
    console.error('❌ Error seeding admin user:', error.message);
    process.exit(1);
  }
}

seedAdminUser();
