const axios = require('axios');

// Test script to verify live streaming setup
async function testLiveStreamSetup() {
  console.log('🧪 Testing Live Stream Setup...\n');

  // Test 1: Check if server is running
  console.log('1. Testing server connection...');
  try {
    const response = await axios.get('http://localhost:5000/uploads');
    console.log('✅ Server is running');
  } catch (error) {
    console.log('❌ Server is not running on port 5000');
    console.log('   Please start the server with: npm run dev');
    return;
  }

  // Test 2: Check Agora configuration
  console.log('\n2. Checking Agora configuration...');
  const agoraAppId = process.env.AGORA_APP_ID;
  const agoraCert = process.env.AGORA_APP_CERTIFICATE;
  
  if (!agoraAppId || !agoraCert) {
    console.log('❌ Agora configuration missing');
    console.log('   Please add AGORA_APP_ID and AGORA_APP_CERTIFICATE to your .env file');
  } else {
    console.log('✅ Agora configuration found');
    console.log(`   App ID: ${agoraAppId.substring(0, 8)}...`);
    console.log(`   Certificate: ${agoraCert.substring(0, 8)}...`);
  }

  // Test 3: Database connection
  console.log('\n3. Database connection will be tested when server starts...');

  console.log('\n🎯 Next Steps:');
  console.log('1. Make sure your .env file has all required values');
  console.log('2. Start your backend: npm run dev');
  console.log('3. Start your frontend: npm run dev (in frontend folder)');
  console.log('4. Visit http://localhost:3000/live to test live streaming');
}

testLiveStreamSetup();
