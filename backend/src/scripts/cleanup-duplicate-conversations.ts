import { connectDB } from '../config/db';
import { Conversation } from '../models/conversation.model';
import mongoose from 'mongoose';

async function cleanupDuplicateConversations() {
  try {
    await connectDB();
    console.log('🔍 Starting duplicate conversation cleanup...');

    // Find all conversations
    const allConversations = await Conversation.find({});
    console.log(`🔍 Found ${allConversations.length} total conversations`);

    // Group conversations by sorted participants
    const conversationGroups = new Map<string, any[]>();
    
    allConversations.forEach(conv => {
      const sortedParticipants = [...conv.participants].sort().join(',');
      if (!conversationGroups.has(sortedParticipants)) {
        conversationGroups.set(sortedParticipants, []);
      }
      conversationGroups.get(sortedParticipants)!.push(conv);
    });

    let totalDuplicates = 0;
    let totalRemoved = 0;

    // Process each group
    for (const [participants, conversations] of conversationGroups) {
      if (conversations.length > 1) {
        console.log(`🔍 Found ${conversations.length} conversations with participants: ${participants}`);
        totalDuplicates += conversations.length - 1;

        // Keep the most recent conversation, remove the rest
        const sortedConversations = conversations.sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );

        const toKeep = sortedConversations[0];
        const toRemove = sortedConversations.slice(1);

        console.log(`🔍 Keeping conversation ${toKeep._id} (most recent)`);
        
        for (const conv of toRemove) {
          console.log(`🔍 Removing duplicate conversation ${conv._id}`);
          await Conversation.findByIdAndDelete(conv._id);
          totalRemoved++;
        }
      }
    }

    console.log(`🔍 Cleanup completed:`);
    console.log(`   - Total conversations processed: ${allConversations.length}`);
    console.log(`   - Duplicate groups found: ${Array.from(conversationGroups.values()).filter(group => group.length > 1).length}`);
    console.log(`   - Total duplicates: ${totalDuplicates}`);
    console.log(`   - Conversations removed: ${totalRemoved}`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔍 Disconnected from database');
  }
}

// Run the cleanup if this script is executed directly
if (require.main === module) {
  cleanupDuplicateConversations();
}

export { cleanupDuplicateConversations }; 