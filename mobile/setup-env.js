#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up environment variables for AIRWIG Mobile App...\n');

const envPath = path.join(__dirname, '.env');

// Check if .env already exists
if (fs.existsSync(envPath)) {
  console.log('⚠️  .env file already exists. Do you want to overwrite it? (y/N)');
  process.stdin.once('data', (data) => {
    const answer = data.toString().trim().toLowerCase();
    if (answer === 'y' || answer === 'yes') {
      createEnvFile();
    } else {
      console.log('❌ Setup cancelled.');
      process.exit(0);
    }
  });
} else {
  createEnvFile();
}

function createEnvFile() {
  const envContent = `# Clerk Configuration
# Get your publishable key from: https://dashboard.clerk.com/last-active?path=api-keys
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key_here

# API Configuration
# Set this to your backend URL (default: localhost for development)
EXPO_PUBLIC_API_URL=http://localhost:5000

# Instructions:
# 1. Replace the placeholder values with your actual keys
# 2. Make sure .env is in your .gitignore file
# 3. Restart the development server after making changes
`;

  try {
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env file created successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Open .env file and replace the placeholder values');
    console.log('2. Get your Clerk publishable key from: https://dashboard.clerk.com/last-active?path=api-keys');
    console.log('3. Update the API URL if your backend is running on a different port');
    console.log('4. Run "npx expo start" to start the development server');
    console.log('\n🚨 Important: Never commit your actual API keys to version control!');
  } catch (error) {
    console.error('❌ Error creating .env file:', error.message);
    process.exit(1);
  }
} 