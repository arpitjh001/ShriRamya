/**
 * User Seed Script
 * Creates default users for testing and development
 * 
 * Usage: npm run seed:users
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

// Load environment variables from scripts/.env first, then root .env
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
require('dotenv').config(); // Also load root .env as fallback

// User data to seed
const USERS = [
    {
        email: 'admin@shriramya.com',
        password: 'Admin@123',
        name: 'Admin User',
        role: 'admin',
        tenantId: 1
    },
    {
        email: 'editor@shriramya.com',
        password: 'Editor@123',
        name: 'Editor User',
        role: 'user', // MongoDB role (RBAC handled in MySQL)
        tenantId: 1
    },
    {
        email: 'customer@shriramya.com',
        password: 'Customer@123',
        name: 'Customer User',
        role: 'user', // MongoDB role (RBAC handled in MySQL)
        tenantId: 1
    }
];

// RBAC roles for MySQL
const RBAC_ROLES = {
    'admin@shriramya.com': 'Admin',
    'editor@shriramya.com': 'Editor',
    'customer@shriramya.com': 'Customer'
};

async function seedUsers() {
    let pool;
    try {
        // Connect to MongoDB - use environment variable or default localhost
        const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/shriramya';
        console.log('Connecting to MongoDB:', mongoUrl.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@'));
        await mongoose.connect(mongoUrl);
        console.log('✓ Connected to MongoDB');

        // Connect to MySQL - use environment variable or default localhost
        const mysqlHost = process.env.DB_HOST || 'localhost';
        const mysqlPort = process.env.DB_PORT || '3307';
        const mysqlUser = process.env.DB_USER || 'root';
        const mysqlPassword = process.env.DB_PASSWORD || 'rootpassword';
        const mysqlDatabase = process.env.DB_NAME || 'shriramya';

        // Create MySQL connection pool
        pool = mysql.createPool({
            host: mysqlHost,
            port: parseInt(mysqlPort),
            user: mysqlUser,
            password: mysqlPassword,
            database: mysqlDatabase,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        await pool.query('SELECT 1');
        console.log('✓ Connected to MySQL');

        const User = require('../src/models/user.model');
        const { UserRoleService, Role } = require('../src/models/rbac.model');

        for (const userData of USERS) {
            const { email, password, name, role, tenantId } = userData;

            // Check if user exists in MongoDB
            let user = await User.findOne({ email });
            
            if (user) {
                console.log(`⚠ User ${email} already exists, updating...`);
                user.password = password; // Will be hashed by pre-save hook
                user.role = role;
                user.name = name;
                await user.save();
            } else {
                console.log(`Creating user: ${email} (${role})...`);
                user = await User.create({
                    email,
                    password,
                    name,
                    role
                });
            }

            console.log(`✓ User ${email} created/updated with ID: ${user.id}`);

            // Ensure MySQL user mapping exists
            await ensureUserMapping(user.id, email, RBAC_ROLES[email], tenantId, pool);
            
            // Assign RBAC role
            await assignUserRole(user.id, RBAC_ROLES[email], tenantId, pool);
        }

        console.log('\n✅ All users seeded successfully!');
        console.log('\n=== TEST CREDENTIALS ===');
        console.log('Admin:    admin@shriramya.com    / Admin@123');
        console.log('Editor:   editor@shriramya.com   / Editor@123');
        console.log('Customer: customer@shriramya.com / Customer@123');
        console.log('=========================\n');

    } catch (error) {
        console.error('❌ Error seeding users:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        await pool.end();
        console.log('Database connections closed');
        process.exit(0);
    }
}

/**
 * Ensure user mapping exists in MySQL for RBAC
 */
async function ensureUserMapping(mongoUserId, email, role, tenantId = 1, pool) {
    try {
        // Check if mapping exists
        const [rows] = await pool.query(
            'SELECT id FROM mysql_users WHERE mongo_user_id = ? OR email = ?',
            [mongoUserId, email]
        );

        let mysqlUserId = rows.length > 0 ? rows[0].id : null;

        if (!mysqlUserId) {
            // Create mapping
            const [result] = await pool.query(
                'INSERT INTO mysql_users (mongo_user_id, email, tenant_id, role) VALUES (?, ?, ?, ?)',
                [mongoUserId, email, tenantId, role]
            );
            mysqlUserId = result.insertId;
            console.log(`  ✓ Created MySQL user mapping (ID: ${mysqlUserId})`);
        } else {
            // Update existing mapping
            await pool.query(
                'UPDATE mysql_users SET mongo_user_id = ?, role = ? WHERE id = ?',
                [mongoUserId, role, mysqlUserId]
            );
            console.log(`  ✓ Updated MySQL user mapping (ID: ${mysqlUserId})`);
        }

        return mysqlUserId;
    } catch (error) {
        console.error(`  ❌ Error ensuring user mapping: ${error.message}`);
        return null;
    }
}

/**
 * Assign RBAC role to user
 */
async function assignUserRole(mongoUserId, roleName, tenantId = 1, pool) {
    try {
        // Get MySQL user ID
        const [userRows] = await pool.query(
            'SELECT id FROM mysql_users WHERE mongo_user_id = ?',
            [mongoUserId]
        );

        if (userRows.length === 0) {
            console.log(`  ⚠ No MySQL user mapping found for ${mongoUserId}`);
            return;
        }

        const mysqlUserId = userRows[0].id;

        // Get role ID
        const standardizedRole = roleName.charAt(0).toUpperCase() + roleName.slice(1).toLowerCase();
        const [roleRows] = await pool.query(
            'SELECT id FROM roles WHERE name = ?',
            [standardizedRole]
        );

        if (roleRows.length === 0) {
            console.log(`  ⚠ Role ${standardizedRole} not found`);
            return;
        }

        const roleId = roleRows[0].id;

        // Check if user already has this role
        const [existingRoles] = await pool.query(
            'SELECT id FROM user_roles WHERE user_id = ? AND role_id = ? AND tenant_id = ?',
            [mysqlUserId, roleId, tenantId]
        );

        if (existingRoles.length > 0) {
            console.log(`  ✓ User already has ${standardizedRole} role`);
            return;
        }

        // Assign role
        await pool.query(
            'INSERT INTO user_roles (user_id, role_id, tenant_id) VALUES (?, ?, ?)',
            [mysqlUserId, roleId, tenantId]
        );

        console.log(`  ✓ Assigned ${standardizedRole} role to user`);
    } catch (error) {
        console.error(`  ❌ Error assigning role: ${error.message}`);
    }
}

// Run the seed script
seedUsers();
