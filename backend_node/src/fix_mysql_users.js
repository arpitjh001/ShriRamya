const mysql = require('mysql2/promise');

(async () => {
    try {
        const c = await mysql.createConnection({
            host: 'mysql',
            user: 'shriramya_user',
            password: 'shriramya_password',
            database: 'shriramya',
            multipleStatements: true
        });
        
        console.log('Checking mysql_users schema...');
        const [columns] = await c.query('SHOW COLUMNS FROM mysql_users;');
        const columnNames = columns.map(c => c.Field);
        console.log('Current columns:', columnNames.join(', '));
        
        if (!columnNames.includes('tenant_id')) {
            console.log('Adding tenant_id to mysql_users...');
            await c.query('ALTER TABLE mysql_users ADD COLUMN tenant_id INT DEFAULT 1 AFTER name, ADD INDEX idx_tenant (tenant_id);');
        }
        
        if (!columnNames.includes('role')) {
            console.log('Adding role to mysql_users...');
            await c.query('ALTER TABLE mysql_users ADD COLUMN role VARCHAR(50) AFTER tenant_id;');
        }
        
        console.log('✅ mysql_users schema fixed!');
        c.end();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
