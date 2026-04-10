const mysql = require('mysql2/promise');
(async () => {
    try {
        const c = await mysql.createConnection({
            host: 'db',
            user: 'remote_user',
            password: 'shriramya123',
            database: 'shriramya_store'
        });
        const [rows] = await c.query("SELECT id, email, role, roles, permissions FROM users WHERE email='admin@shriramya.com'");
        console.log(JSON.stringify(rows, null, 2));
        c.end();
    } catch (e) { console.error(e) }
})();
