const mongoose = require('mongoose');
const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
    try {
        // 1. Connect to MongoDB
        await mongoose.connect(`${process.env.MONGO_URL || 'mongodb://mongodb:27017/'}${process.env.DB_NAME || 'shriramya'}`);
        console.log('Connected to MongoDB');
        
        const db = mongoose.connection.db;
        const mongoUser = await db.collection('users').findOne({ email: 'admin@shriramya.com' });
        
        if (!mongoUser) {
            console.error('Admin user not found in MongoDB');
            process.exit(1);
        }
        
        const mongoUserId = mongoUser._id.toString();
        console.log('Admin MongoDB ID:', mongoUserId);

        // 2. Connect to MySQL
        const c = await mysql.createConnection({
            host: 'mysql',
            user: 'shriramya_user',
            password: 'shriramya_password',
            database: 'shriramya'
        });
        console.log('Connected to MySQL');

        // 3. Ensure mysql_users mapping
        await c.query(
            'INSERT INTO mysql_users (mongo_user_id, email, name, tenant_id, role) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE mongo_user_id = VALUES(mongo_user_id), role = VALUES(role)',
            [mongoUserId, mongoUser.email, mongoUser.name || 'Admin', 1, 'admin']
        );
        
        const [userRows] = await c.query('SELECT id FROM mysql_users WHERE mongo_user_id = ?', [mongoUserId]);
        const mysqlUserId = userRows[0].id;
        console.log('MySQL User ID:', mysqlUserId);

        // 4. Ensure Admin role assignment
        const [roleRows] = await c.query('SELECT id FROM roles WHERE name = "Admin"');
        const adminRoleId = roleRows[0].id;
        
        await c.query(
            'INSERT IGNORE INTO user_roles (user_id, role_id, tenant_id) VALUES (?, ?, ?)',
            [mysqlUserId, adminRoleId, 1]
        );
        
        console.log('✅ RBAC sync completed for admin user!');
        
        // 5. Final check
        const [finalRows] = await c.query(
            `SELECT ur.*, r.name as role_name FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = ?`,
            [mysqlUserId]
        );
        console.log('Assigned Roles:', JSON.stringify(finalRows, null, 2));

        await mongoose.connection.close();
        c.end();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
