const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

const uri = process.env.MONGODB_URI;

(async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ Connected to MongoDB');

    // Remove null googleIds to prevent unique index conflicts
    console.log('🧹 Clearing googleId null values...');
    const result = await User.updateMany({ googleId: null }, { $unset: { googleId: '' } });
    console.log(`✅ Cleared ${result.modifiedCount} documents with null googleId`);

    // Get collection
    const collection = mongoose.connection.db.collection('users');
    const indexes = await collection.indexes();
    console.log('📋 Current indexes:', indexes.map(idx => idx.name));

    // Drop old non-sparse googleId index if it exists
    const existing = indexes.find((idx) => idx.name === 'googleId_1');
    if (existing) {
      console.log('🗑️  Dropping old googleId_1 index...');
      await collection.dropIndex('googleId_1');
      console.log('✅ Old index dropped');
    }

    // Create sparse unique index
    console.log('🔐 Creating sparse unique googleId index...');
    await collection.createIndex({ googleId: 1 }, { unique: true, sparse: true });
    console.log('✅ Sparse unique index created');

    await mongoose.disconnect();
    console.log('✅ Done');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
