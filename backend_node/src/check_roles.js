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
        const [rows] = await c.query("SELECT * FROM roles;");
        console.log(JSON.stringify(rows, null, 2));
        c.end();
    } catch (e) {
        console.error(e);
    }
})();
