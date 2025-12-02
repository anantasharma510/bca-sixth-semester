# Fix Your .env Configuration

## Issues Found:

1. **NODE_ENV should be "development"** (not "production") for local development
2. **FRONTEND_URL should be localhost** for development
3. **ALLOWED_ORIGINS should include localhost** for development

## Your Current .env (with issues):
```env
NODE_ENV=production  # ❌ Should be "development"
FRONTEND_URL=https://yourdomain.com  # ❌ Should be "http://localhost:3000"
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com  # ❌ Missing localhost
```

## Fixed .env Configuration:
Replace your current .env file content with this:

```env
# Clerk Configuration
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
AGORA_APP_ID=c9566a2bf24941dcb82d39fea282a290
AGORA_APP_CERTIFICATE=41b7724f30964e4796aa859576259408
```

## Key Changes:
1. ✅ NODE_ENV=development
2. ✅ FRONTEND_URL=http://localhost:3000
3. ✅ ALLOWED_ORIGINS includes localhost
4. ✅ Your Agora credentials are correct

After making these changes, restart your backend server.
