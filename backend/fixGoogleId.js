const mongoose = require('mongoose');
require('dotenv').config();

async function fixGoogleIdIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const collection = db.collection('users');
    
    // Drop the googleId_1 index if it exists
    try {
      const indexes = await collection.indexes();
      const hasGoogleIdIndex = indexes.some(idx => idx.name === 'googleId_1');
      
      if (hasGoogleIdIndex) {
        await collection.dropIndex('googleId_1');
        console.log('✅ Dropped googleId_1 index');
      } else {
        console.log('No googleId_1 index found');
      }
    } catch (err) {
      console.log('Error dropping index:', err.message);
    }
    
    // Create a sparse index (only indexes documents where googleId exists)
    await collection.createIndex({ googleId: 1 }, { sparse: true, unique: true });
    console.log('✅ Created sparse unique index on googleId');
    
    // Update any existing users to ensure googleId is null or undefined
    await collection.updateMany(
      { googleId: null },
      { $unset: { googleId: "" } }
    );
    console.log('✅ Cleaned up null googleId values');
    
    console.log('Google ID index fixed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixGoogleIdIndex();
