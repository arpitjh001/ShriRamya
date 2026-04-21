const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function debugLogin() {
  const MONGO_URL = 'mongodb://localhost:27017/shriramya';
  
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URL);
    console.log('Connected.');

    const email = 'admin@shriramya.com';
    const password = 'Admin@123';

    console.log('Searching for user:', email);
    const db = mongoose.connection.db;
    const user = await db.collection('users').findOne({ email: email.toLowerCase() });

    if (!user) {
      console.log('User not found');
      process.exit(0);
    }

    console.log('User found. Comparing password...');
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match:', isMatch);

    if (isMatch) {
      console.log('Login successful. Generating token...');
      // Replicate token generation logic if needed
      // But let's see if it fails before this
    }

  } catch (error) {
    console.error('Error during login:', error);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
  }
}

debugLogin();
