const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb://mongodb:27017/shriramya');

async function createAdmin() {
  try {
    const User = mongoose.model('User', new mongoose.Schema({
      email: { type: String, required: true, unique: true, trim: true, lowercase: true },
      password: { type: String, required: true },
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
      role: { type: String, enum: ['user', 'admin'], default: 'user' },
      is_active: { type: Boolean, default: true }
    }, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }));

    // Delete existing admin
    await User.deleteOne({ email: 'admin@shriramya.com' });
    console.log('Deleted existing admin user');

    // Create new admin with Mongoose (will hash password automatically)
    const admin = await User.create({
      email: 'admin@shriramya.com',
      password: 'Admin@123',
      name: 'Shri Ramya Admin',
      phone: '+91 9876543210',
      role: 'admin',
      is_active: true
    });

    console.log('✅ Admin user created successfully!');
    console.log('Email:', admin.email);
    console.log('Password: Admin@123');
    console.log('Password hash:', admin.password);
    
    // Verify password match
    const match = await admin.isPasswordMatch('Admin@123');
    console.log('Password match test:', match ? '✅ PASS' : '❌ FAIL');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createAdmin();
