const mongoose = require('mongoose');
require('dotenv').config({ path: 'c:/Users/Lenovo/shriramya/ShriRamya/backend_node/.env' });

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/';
const DB_NAME = process.env.DB_NAME || 'shriramya';

async function checkAdmin() {
  try {
    const mongoUri = MONGO_URL.endsWith('/') ? `${MONGO_URL}${DB_NAME}` : `${MONGO_URL}/${DB_NAME}`;
    console.log(`Connecting to: ${mongoUri}`);
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const users = await db.collection('users').find({ email: 'admin@shriramya.com' }).toArray();

    if (users.length === 0) {
      console.log('User admin@shriramya.com NOT FOUND');
    } else {
      users.forEach(user => {
        console.log('User found:');
        console.log('ID:', user._id);
        console.log('Email:', user.email);
        console.log('Role:', user.role);
        console.log('Is Active:', user.is_active || user.isActive);
      });
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAdmin();
