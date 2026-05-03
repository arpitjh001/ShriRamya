const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function check() {
  console.log('Target:', process.env.MYSQL_HOST, process.env.MYSQL_PORT);
  console.log('User:', process.env.MYSQL_USER);
  
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: 3307,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE
    });
    console.log('MySQL connection successful!');
    
    const [rows] = await connection.query('SELECT 1 as result');
    console.log('Query result:', rows);
    
    await connection.end();
  } catch (err) {
    console.error('MySQL Error:', err.message);
  }
}

check();
