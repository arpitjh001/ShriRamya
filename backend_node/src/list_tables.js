const mysql = require('mysql2/promise');
(async () => {
    try {
        const c = await mysql.createConnection({
            host: 'mysql',
            user: 'shriramya_user',
            password: 'shriramya_password',
            database: 'shriramya'
        });
        const [rows] = await c.query("SHOW TABLES;");
        rows.forEach(row => console.log(Object.values(row)[0]));
        c.end();
    } catch (e) {
        console.error(e);
    }
})();
