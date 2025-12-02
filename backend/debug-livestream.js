// Debug script to identify live stream creation issues
require('dotenv').config();

console.log('🔍 Debugging Live Stream Issues...\n');

// Check 1: Environment Variables
console.log('1. Environment Variables Check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('AGORA_APP_ID:', process.env.AGORA_APP_ID ? 'Set' : '❌ Missing');
console.log('AGORA_APP_CERTIFICATE:', process.env.AGORA_APP_CERTIFICATE ? 'Set' : '❌ Missing');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Set' : '❌ Missing');
console.log('CLERK_SECRET_KEY:', process.env.CLERK_SECRET_KEY ? 'Set' : '❌ Missing');
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : '❌ Missing');

// Check 2: Agora Token Generation
console.log('\n2. Testing Agora Token Generation:');
try {
  const { generateAgoraToken } = require('./src/utils/agoraToken.ts');
  const token = generateAgoraToken({
    channelName: 'test_channel',
    uid: 12345,
    role: 'publisher'
  });
  console.log('✅ Agora token generated successfully');
} catch (error) {
  console.log('❌ Agora token generation failed:', error.message);
}

// Check 3: Database Connection (if MongoDB is set)
console.log('\n3. Testing Database Connection:');
if (process.env.MONGODB_URI && !process.env.MONGODB_URI.includes('username:password')) {
  try {
    const mongoose = require('mongoose');
    mongoose.connect(process.env.MONGODB_URI)
      .then(() => {
        console.log('✅ Database connection successful');
        mongoose.disconnect();
      })
      .catch((err) => {
        console.log('❌ Database connection failed:', err.message);
      });
  } catch (error) {
    console.log('❌ Database connection error:', error.message);
  }
} else {
  console.log('❌ MongoDB URI not properly configured');
}

// Check 4: Required Node Modules
console.log('\n4. Checking Required Modules:');
const requiredModules = ['uuid', 'agora-token', '@clerk/clerk-sdk-node'];
requiredModules.forEach(moduleName => {
  try {
    require(moduleName);
    console.log(`✅ ${moduleName} - installed`);
  } catch (error) {
    console.log(`❌ ${moduleName} - missing or broken`);
  }
});

console.log('\n🎯 Common Issues and Solutions:');
console.log('1. If Agora token fails: Check AGORA_APP_ID and AGORA_APP_CERTIFICATE');
console.log('2. If DB fails: Update MONGODB_URI with real credentials');
console.log('3. If modules missing: Run "npm install" in backend folder');
console.log('4. If NODE_ENV is production: Change to "development"');

process.exit(0);
