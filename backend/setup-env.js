const fs = require('fs');
const path = require('path');

const envContent = `# Clerk Configuration
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key_here
CLERK_ISSUER=https://your-app.clerk.accounts.dev
CLERK_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/social-media-app?retryWrites=true&w=majority

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here

# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,https://airwig.ca,https://www.airwig.ca

# Optional: Stream Chat Configuration (if using Stream Chat)
STREAM_CHAT_API_KEY=your_stream_chat_api_key
STREAM_CHAT_SECRET=your_stream_chat_secret

# Agora.io Configuration for Live Streaming
AGORA_APP_ID=your_agora_app_id_here
AGORA_APP_CERTIFICATE=your_agora_app_certificate_here`;

const envPath = path.join(__dirname, '.env');

if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env file created successfully!');
  console.log('📝 Please update the following values in your .env file:');
  console.log('   1. AGORA_APP_ID (from Agora.io Console)');
  console.log('   2. AGORA_APP_CERTIFICATE (from Agora.io Console)');
  console.log('   3. MONGODB_URI (your actual MongoDB connection string)');
  console.log('   4. CLERK_SECRET_KEY (your actual Clerk secret key)');
  console.log('   5. Other configuration values as needed');
} else {
  console.log('⚠️ .env file already exists. Please check if you need to add:');
  console.log('   AGORA_APP_ID=your_agora_app_id_here');
  console.log('   AGORA_APP_CERTIFICATE=your_agora_app_certificate_here');
}
