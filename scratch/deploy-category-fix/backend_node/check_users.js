const { connectDB, mongoose } = require('./src/db/mongodb');
const bcrypt = require('bcryptjs');
const fs = require('fs');

(async () => {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    const usersCol = db.collection('users');
    
    const email = 'admin@shriramya.com';
    const password = 'Admin@123';
    
    const user = await usersCol.findOne({ email });
    
    let output = '';
    if (!user) {
      output += `User ${email} NOT FOUND in database.\n`;
      const allUsers = await usersCol.find({}).toArray();
      output += `Total users in DB: ${allUsers.length}\n`;
      allUsers.forEach(u => output += `- Found user: ${u.email} (Role: ${u.role})\n`);
    } else {
      output += `User ${email} found.\n`;
      const isMatch = await bcrypt.compare(password, user.password);
      output += `Password 'Admin@123' check: ${isMatch ? 'MATCH' : 'MISMATCH'}\n`;
      output += `Stored Hash: ${user.password}\n`;
      output += `User Role: ${user.role}\n`;
    }
    
    fs.writeFileSync('verify_detailed.txt', output, 'utf8');
    process.exit(0);
  } catch (err) {
    fs.writeFileSync('verify_detailed.txt', 'Error: ' + err.message, 'utf8');
    process.exit(1);
  }
})();
