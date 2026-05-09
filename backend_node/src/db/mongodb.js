const mongoose = require('mongoose');
const config = require('../config/config');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;
  try {
    await mongoose.connect(config.mongoose.url);
    isConnected = true;
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    throw err;
  }
};

const getDB = () => mongoose.connection.db;

module.exports = { connectDB, getDB, mongoose };
