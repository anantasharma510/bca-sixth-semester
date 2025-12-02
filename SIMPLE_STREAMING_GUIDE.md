# Simple Live Streaming Guide

## 🎥 What This Does

**User A (Host)**: 
- Creates live stream
- Camera automatically opens
- Can share screen
- Can chat with viewers
- Controls (mute, camera on/off, end stream)

**User B & Others (Viewers)**:
- Join stream to watch host's video/screen
- Can chat in real-time
- See viewer count

## 🚀 Quick Setup

### 1. Frontend Environment Variables

Create `frontend/.env.local` with:

```bash
# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key_here
CLERK_SECRET_KEY=your_clerk_secret_here

# API Configuration  
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000

# Agora Configuration
NEXT_PUBLIC_AGORA_APP_ID=c9566a2bf24941dcb82d39fea282a290
```

### 2. Backend Environment Variables

Ensure `backend/.env` has:

```bash
# Agora Configuration
AGORA_APP_ID=c9566a2bf24941dcb82d39fea282a290
AGORA_APP_CERTIFICATE=41b7724f30964e4796aa859576259408
```

### 3. Start Both Servers

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend  
npm run dev
```

## 🎯 How to Test

### Host (User A):
1. Go to `/live`
2. Click "Create Stream"
3. Fill in title, description
4. Click "Go Live"
5. Camera should auto-open
6. Use controls to toggle camera, mic, screen share
7. Chat with viewers

### Viewers (User B, C, etc.):
1. Go to `/live` 
2. Click on any LIVE stream
3. Should see host's video/screen
4. Can chat in real-time
5. Messages persist on page refresh

## 🔧 Features

- **Auto Camera**: Host camera opens automatically when going live
- **Screen Share**: Host can switch between camera and screen sharing
- **Real-time Chat**: All users can chat, messages are saved to database
- **Viewer Count**: Shows number of people watching
- **Stream Controls**: Host can mute, toggle camera, end stream
- **Responsive**: Works on desktop and mobile

## 🐛 Troubleshooting

**"Loading Stream..." stuck?**
- Check browser console for Agora SDK errors
- Verify `NEXT_PUBLIC_AGORA_APP_ID` is set correctly

**"Waiting for host to start..."?** 
- Host needs to go live first
- Check if host's camera/screen sharing is working

**Chat not working?**
- Check Socket.IO connection
- Verify backend is running on port 5000

**No video showing?**
- Grant camera/microphone permissions in browser
- Check browser compatibility with Agora SDK

## 📝 Architecture

- **Frontend**: Next.js with Agora SDK for video streaming
- **Backend**: Express.js with Socket.IO for real-time chat
- **Database**: MongoDB for chat message persistence
- **Auth**: Clerk for user authentication
- **Video**: Agora.io for live streaming infrastructure

## 🚀 Production Deployment

1. Set proper domain in environment variables
2. Configure CORS for your domain
3. Use SSL certificates (HTTPS required for camera access)
4. Set up MongoDB Atlas for production database
5. Configure Agora.io production credentials
