require('dotenv').config();
const mongoose = require('mongoose');

async function fixDuplicateUsers() {
  try {
    console.log('🔧 Fixing duplicate user issues...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Find the problematic user
    const duplicateUser = await usersCollection.findOne({ email: 'bant98476@gmail.com' });
    
    if (duplicateUser) {
      console.log('🔍 Found user with email bant98476@gmail.com:');
      console.log('- ID:', duplicateUser._id);
      console.log('- Username:', duplicateUser.username);
      console.log('- Email:', duplicateUser.email);
      
      // Remove the problematic user so the system can recreate it properly
      console.log('\n🗑️ Removing duplicate user to allow clean recreation...');
      const deleteResult = await usersCollection.deleteOne({ _id: duplicateUser._id });
      console.log('✅ Deleted user:', deleteResult.deletedCount, 'document(s)');
      
      console.log('\n✅ User cleaned up! The system will now create a fresh user when you try to create a stream.');
    } else {
      console.log('✅ No duplicate user found with email bant98476@gmail.com');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from database');
  }
}

fixDuplicateUsers();
