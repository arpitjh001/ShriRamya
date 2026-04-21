const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: 'c:/Users/Lenovo/shriramya/ShriRamya/backend_node/.env' });

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/';
const DB_NAME = process.env.DB_NAME || 'shriramya';

async function verifyPassword() {
  try {
    const mongoUri = MONGO_URL.endsWith('/') ? `${MONGO_URL}${DB_NAME}` : `${MONGO_URL}/${DB_NAME}`;
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const user = await db.collection('users').findOne({ email: 'admin@shriramya.com' });

    if (!user) {
      console.log('User admin@shriramya.com NOT FOUND');
    } else {
      console.log('User found. Hashed password:', user.password);
      const isMatch = await bcrypt.compare('Admin@123', user.password);
      console.log('Password "Admin@123" matches:', isMatch);
      
      const isLowerMatch = await bcrypt.compare('admin@123', user.password);
      console.log('Password "admin@123" matches:', isLowerMatch);

      console.log('Role:', user.role);
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

verifyPassword();
