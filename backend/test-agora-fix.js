require('dotenv').config();
const { RtcTokenBuilder, RtcRole } = require('agora-token');

console.log('🧪 Testing Agora Token Generation Fix...\n');

const AGORA_APP_ID = process.env.AGORA_APP_ID;
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

console.log('Agora App ID:', AGORA_APP_ID ? 'Set ✅' : 'Missing ❌');
console.log('Agora Certificate:', AGORA_APP_CERTIFICATE ? 'Set ✅' : 'Missing ❌');

if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
  console.log('\n❌ Agora credentials missing. Please check your .env file.');
  process.exit(1);
}

try {
  const channelName = 'test_channel';
  const uid = 12345;
  const role = RtcRole.PUBLISHER;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + 3600; // 1 hour

  console.log('\n🎬 Generating token with parameters:');
  console.log('- Channel:', channelName);
  console.log('- UID:', uid);
  console.log('- Role:', role);
  console.log('- Expires in:', 3600, 'seconds');

  // Use the correct 7-parameter function
  const token = RtcTokenBuilder.buildTokenWithUid(
    AGORA_APP_ID,
    AGORA_APP_CERTIFICATE,
    channelName,
    uid,
    role,
    privilegeExpiredTs,
    privilegeExpiredTs  // privilegeExpire parameter
  );

  console.log('\n✅ SUCCESS! Agora token generated successfully!');
  console.log('Token length:', token.length);
  console.log('Token starts with:', token.substring(0, 20) + '...');
  
  console.log('\n🎉 Live streaming should now work!');

} catch (error) {
  console.log('\n❌ ERROR generating Agora token:');
  console.log('Error message:', error.message);
  console.log('Error details:', error);
}
