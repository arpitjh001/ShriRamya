const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

(async () => {
    try {
        const c = await mysql.createConnection({
            host: process.env.MYSQL_HOST || 'mysql',
            user: process.env.MYSQL_USER || 'shriramya_user',
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE || 'shriramya',
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
