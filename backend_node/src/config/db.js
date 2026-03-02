const mongoose = require('mongoose');
const mysql = require('mysql2/promise');
const config = require('./config');

const connectMongo = async () => {
    try {
        await mongoose.connect(config.mongoose.url);
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Failed to connect to MongoDB', error);
    }
};

const mysqlPool = mysql.createPool({
    host: config.mysql.host,
    port: config.mysql.port,
    user: config.mysql.user,
    password: config.mysql.password,
    database: config.mysql.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const connectMySQL = async () => {
    try {
        const connection = await mysqlPool.getConnection();
        console.log('Connected to MySQL');
        connection.release();
    } catch (error) {
        console.error('Failed to connect to MySQL', error);
    }
};

module.exports = { connectMongo, mysqlPool, connectMySQL };
