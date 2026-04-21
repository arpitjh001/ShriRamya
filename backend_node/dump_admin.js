const { connectDB, mongoose } = require('./src/db/mongodb');

(async () => {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    const usersCol = db.collection('users');
    
    const user = await usersCol.findOne({ email: 'admin@shriramya.com' });
    console.log('User structure:', JSON.stringify(user, null, 2));
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
