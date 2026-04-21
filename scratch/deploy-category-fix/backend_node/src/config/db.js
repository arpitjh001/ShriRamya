const mongoose = require('mongoose');
const config = require('./config');

/**
 * Connect to MongoDB
 */
const connectMongo = async () => {
    try {
        await mongoose.connect(config.mongoose.url);
        console.log('Successfully connected to MongoDB');
    } catch (error) {
        console.error('Failed to connect to MongoDB', error);
        process.exit(1);
    }
};

module.exports = { connectMongo };
