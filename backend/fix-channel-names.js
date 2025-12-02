const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://username:password@cluster.mongodb.net/social-media-app?retryWrites=true&w=majority');

// Define the schema (simplified)
const liveStreamSchema = new mongoose.Schema({
  agoraChannelName: String,
  hostId: String,
  status: String
});

const LiveStream = mongoose.model('LiveStream', liveStreamSchema);

async function fixChannelNames() {
  try {
    console.log('🔍 Finding streams with invalid channel names...');
    
    // Find all streams with long channel names
    const invalidStreams = await LiveStream.find({
      agoraChannelName: { $regex: /^stream_user_.*/ }
    });

    console.log(`📊 Found ${invalidStreams.length} streams with invalid channel names`);

    for (const stream of invalidStreams) {
      // Generate new short channel name
      const shortHostId = stream.hostId.slice(-8);
      const shortTimestamp = Date.now().toString().slice(-6);
      const randomId = Math.random().toString(36).substring(2, 8);
      const newChannelName = `live_${shortHostId}_${shortTimestamp}_${randomId}`;

      console.log(`🔄 Updating stream ${stream._id}:`);
      console.log(`   Old: ${stream.agoraChannelName}`);
      console.log(`   New: ${newChannelName}`);

      await LiveStream.updateOne(
        { _id: stream._id },
        { agoraChannelName: newChannelName }
      );
    }

    console.log('✅ All channel names updated successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error fixing channel names:', error);
    process.exit(1);
  }
}

fixChannelNames();
