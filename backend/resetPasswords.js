const mongoose = require('mongoose');
const User = require('./src/models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const testPassword = 'password123';

    console.log('🔐 Generating hashed password...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(testPassword, salt);

    console.log('📝 Updating all users...');
    const result = await User.updateMany(
      {},
      { 
        $set: { 
          password: hashedPassword,
          authMethod: 'email'
        }
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} users`);

    // Verify
    const shrawan = await User.findOne({ email: 'shrawan12@gmail.com' });
    const pema = await User.findOne({ email: 'pema12@gmail.com' });

    console.log('\n📋 Test Credentials:');
    console.log('  Shrawan: shrawan12@gmail.com / password123');
    console.log('  Pema:    pema12@gmail.com / password123');
    console.log('  Admin:   admin@smartpark.com / password123');

    // Verify password works
    const isMatch = await shrawan.comparePassword(testPassword);
    console.log(`\n✅ Password verification: ${isMatch ? 'PASS ✓' : 'FAIL ✗'}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
