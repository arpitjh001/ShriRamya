const mysql = require('mysql2/promise');
const fs = require('fs');
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
        
        console.log('Reading migration file...');
        // The file is at the root of the project, so for the backend container at /app/src/.., 
        // the root is at /app/../ (which might not be mounted).
        // I'll copy the SQL file to backend_node/src/ first.
        
        const sqlPath = path.join(__dirname, 'rbac_migration.sql');
        if (!fs.existsSync(sqlPath)) {
            console.error('SQL file not found at ' + sqlPath);
            process.exit(1);
        }
        
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log('Executing migration...');
        await c.query(sql);
        console.log('✅ Migration executed successfully!');
        
        const [rows] = await c.query("SHOW TABLES;");
        console.log('Tables in database:');
        rows.forEach(row => console.log(`  - ${Object.values(row)[0]}`));
        
        c.end();
    } catch (e) {
        console.error('❌ Error:', e);
        process.exit(1);
    }
})();
