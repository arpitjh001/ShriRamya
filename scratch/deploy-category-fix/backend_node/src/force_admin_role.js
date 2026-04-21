const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL || 'mongodb://mongodb:27017/shriramya');
        console.log('Connected to MongoDB');
        
        const db = mongoose.connection.db;
        const result = await db.collection('users').updateOne(
            { email: 'admin@shriramya.com' },
            { $set: { role: 'admin', is_active: true } }
        );
        
        console.log('Update result:', result);
        
        const updatedUser = await db.collection('users').findOne({ email: 'admin@shriramya.com' });
        console.log('Updated User:', JSON.stringify(updatedUser, null, 2));
        
        await mongoose.connection.close();
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
})();
