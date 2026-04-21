const mongoose = require('mongoose');
const config = require('../config/config');
const User = require('../models/user.model');

const seedAdmin = async () => {
    try {
        await mongoose.connect(config.mongoose.url);
        console.log('Connected to MongoDB for seeding');

        const adminEmail = 'admin-user@example.com';
        const adminPassword = 'AdminPassword123!';

        const existingAdmin = await User.findOne({ email: adminEmail });
        if (existingAdmin) {
            console.log('Admin already exists, updating password...');
            existingAdmin.password = adminPassword;
            existingAdmin.role = 'admin';
            await existingAdmin.save();
        } else {
            console.log('Creating new admin user...');
            await User.create({
                email: adminEmail,
                password: adminPassword,
                name: 'Admin User',
                role: 'admin'
            });
        }

        console.log('Seeding complete.');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seedAdmin();

