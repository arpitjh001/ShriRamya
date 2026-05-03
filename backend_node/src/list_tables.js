const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

(async () => {
    try {
        const c = await mysql.createConnection({
            host: process.env.MYSQL_HOST || 'mysql',
            user: process.env.MYSQL_USER || 'shriramya_user',
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE || 'shriramya'
        });
        const [rows] = await c.query("SHOW TABLES;");
        rows.forEach(row => console.log(Object.values(row)[0]));
        c.end();
    } catch (e) {
        console.error(e);
    }
})();
