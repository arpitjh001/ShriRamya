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
        
        console.log('Fixing roles and user_roles table structures...');
        
        // Ensure roles table has AUTO_INCREMENT on id
        await c.query(`
            ALTER TABLE roles MODIFY COLUMN id INT AUTO_INCREMENT;
        `);
        console.log('✓ roles table fixed');
        
        // Ensure user_roles table has AUTO_INCREMENT on id
        await c.query(`
            ALTER TABLE user_roles MODIFY COLUMN id INT AUTO_INCREMENT;
        `);
        console.log('✓ user_roles table fixed');
        
        console.log('✅ RBAC tables fixed!');
        c.end();
    } catch (e) {
        console.error('❌ Error:', e.message);
        // If it fails because of dependencies, try to drop and recreate if empty or simple
        process.exit(1);
    }
})();
