const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/';
const DB_NAME = process.env.DB_NAME || 'shriramya';

async function checkAdminUser() {
    try {
        await mongoose.connect(`${MONGO_URL}${DB_NAME}`);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');

        const admin = await usersCollection.findOne({ email: 'admin@shriramya.com' });

        if (admin) {
            console.log('✅ Admin user found:');
            console.log('Email:', admin.email);
            console.log('Role:', admin.role);
            console.log('Has password:', !!admin.password);
        } else {
            console.log('❌ Admin user NOT found!');
        }

        await mongoose.connection.close();
    } catch (error) {
        console.error('❌ Error checking admin user:', error.message);
    }
}

checkAdminUser();
