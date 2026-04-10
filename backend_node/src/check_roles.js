const mysql = require('mysql2/promise');
(async () => {
    try {
        const c = await mysql.createConnection({
            host: 'mysql',
            user: 'shriramya_user',
            password: 'shriramya_password',
            database: 'shriramya'
        });
        const [rows] = await c.query("SELECT * FROM roles;");
        console.log(JSON.stringify(rows, null, 2));
        c.end();
    } catch (e) {
        console.error(e);
    }
})();
