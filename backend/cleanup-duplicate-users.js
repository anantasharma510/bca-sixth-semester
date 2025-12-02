require('dotenv').config();
const mongoose = require('mongoose');

async function cleanupDuplicateUsers() {
  try {
    console.log('🔍 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    console.log('\n🔍 Finding duplicate email entries...');
    
    // Find users with duplicate emails
    const duplicateEmails = await usersCollection.aggregate([
      {
        $match: {
          email: { $ne: null, $exists: true }
        }
      },
      {
        $group: {
          _id: "$email",
          count: { $sum: 1 },
          users: { $push: { _id: "$_id", username: "$username", createdAt: "$createdAt" } }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]).toArray();

    if (duplicateEmails.length === 0) {
      console.log('✅ No duplicate emails found');
    } else {
      console.log(`⚠️ Found ${duplicateEmails.length} duplicate email(s):`);
      
      for (const dup of duplicateEmails) {
        console.log(`\nEmail: ${dup._id}`);
        console.log('Users:', dup.users.map(u => `${u.username} (${u._id})`).join(', '));
        
        // Keep the newest user, remove older ones
        const sortedUsers = dup.users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const keepUser = sortedUsers[0];
        const removeUsers = sortedUsers.slice(1);
        
        console.log(`Keeping: ${keepUser.username} (${keepUser._id})`);
        
        for (const removeUser of removeUsers) {
          console.log(`Removing: ${removeUser.username} (${removeUser._id})`);
          await usersCollection.deleteOne({ _id: removeUser._id });
        }
      }
    }

    console.log('\n🧹 Cleanup completed!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from database');
  }
}

console.log('🧹 Database Cleanup Tool for Duplicate Users');
console.log('This will remove duplicate email entries, keeping the newest user.\n');

cleanupDuplicateUsers();
