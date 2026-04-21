const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
    try {
        await mongoose.connect(`${process.env.MONGO_URL || 'mongodb://mongodb:27017/'}${process.env.DB_NAME || 'shriramya'}`);
        console.log('Connected to MongoDB');
        
        const db = mongoose.connection.db;
        const users = await db.collection('users').find({ email: 'admin@shriramya.com' }).toArray();
        console.log('Admin Users in MongoDB:', JSON.stringify(users, null, 2));
        
        await mongoose.connection.close();
    } catch (e) {
        console.error(e);
    }
})();
