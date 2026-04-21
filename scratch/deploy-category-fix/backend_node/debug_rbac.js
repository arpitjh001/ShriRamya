const mongoose = require('mongoose');
const { mysqlPool } = require('./src/config/db');
const User = require('./src/models/user.model');
const { UserRoleService } = require('./src/models/rbac.model');

async function debugRBAC() {
  try {
    console.log('--- DIANOSTIC START ---');
    
    // 1. Connect MongoDB
    if (!process.env.MONGODB_URL) {
       // Try a default if not in env
       process.env.MONGODB_URL = 'mongodb://mongodb:27017/shriramya';
    }
    await mongoose.connect(process.env.MONGODB_URL);
    console.log('MongoDB: Connected');
    
    // 2. Find User
    const email = 'admin@shriramya.com';
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`ERROR: User ${email} not found in MongoDB`);
      process.exit(1);
    }
    console.log('MongoDB User:', {
      _id: user._id.toString(),
      email: user.email,
      role: user.role,
      roles: user.roles
    });
    
    // 3. Check MySQL mysql_users
    const [mysqlUsers] = await mysqlPool.query(
      'SELECT id, mongo_user_id, email, role FROM mysql_users WHERE mongo_user_id = ? OR email = ?',
      [user._id.toString(), email]
    );
    console.log('MySQL Users Found:', mysqlUsers);
    
    if (mysqlUsers.length === 0) {
      console.log('ERROR: No MySQL user mapping found for this mongo_user_id/email');
    } else {
      const mysqlUserId = mysqlUsers[0].id;
      
      // 4. Check Roles in user_roles
      const [userRoles] = await mysqlPool.query(
        'SELECT r.id, r.name FROM roles r INNER JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = ?',
        [mysqlUserId]
      );
      console.log('MySQL Roles Found:', userRoles);
      
      // 5. Test Service Level
      // Note: UserRoleService.getRoleNamesForUser takes mongo_user_id
      const serviceRoles = await UserRoleService.getRoleNamesForUser(user._id.toString(), 1);
      console.log('Service Level Roles:', serviceRoles);
    }
    
    console.log('--- DIAGNOSTIC END ---');
    process.exit(0);
  } catch (err) {
    console.error('DIAGNOSTIC FAILED:', err);
    process.exit(1);
  }
}

debugRBAC();
