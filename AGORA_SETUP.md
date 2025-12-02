# 🎥 Agora.io Live Streaming Setup

## Credentials

**App ID:** `f25f49cd58a648208b41beca2942caf2`  
**Certificate:** `787b0c2d4c164d93a2790719dc939204`

## Configuration

### ✅ Backend Configuration

Add these to your `backend/.env` file:

```bash
# Agora.io Configuration for Live Streaming
AGORA_APP_ID=f25f49cd58a648208b41beca2942caf2
AGORA_APP_CERTIFICATE=787b0c2d4c164d93a2790719dc939204
```

**Why both?** The backend uses both App ID and Certificate to generate secure tokens for users to join Agora channels.

### ✅ Frontend Configuration

Add this to your `frontend/.env.local` file:

```bash
# Agora.io Configuration
# Note: Only App ID is needed in frontend, NOT the certificate
NEXT_PUBLIC_AGORA_APP_ID=f25f49cd58a648208b41beca2942caf2
```

**Why only App ID?** The frontend only needs the App ID to join Agora channels. The certificate is **NEVER** exposed to the frontend for security reasons - it's only used server-side to generate tokens.

## Security Note

⚠️ **IMPORTANT**: The certificate (`AGORA_APP_CERTIFICATE`) should **NEVER** be added to the frontend. It's a secret key that must remain on the backend only. Exposing it would allow anyone to generate tokens and potentially abuse your Agora account.

## How It Works

1. **Backend** uses App ID + Certificate to generate secure tokens
2. **Frontend** receives the token from backend API
3. **Frontend** uses App ID + Token to join Agora channels
4. Users can then stream/watch live content

## Verification

After adding the credentials:

1. **Backend**: Restart your backend server
2. **Frontend**: Restart your frontend dev server (or rebuild if production)
3. Test live streaming functionality

## Troubleshooting

If live streaming doesn't work:

1. Check that `AGORA_APP_ID` matches in both backend and frontend
2. Verify `AGORA_APP_CERTIFICATE` is set in backend `.env`
3. Ensure `NEXT_PUBLIC_AGORA_APP_ID` is set in frontend `.env.local`
4. Check browser console for Agora SDK errors
5. Verify tokens are being generated correctly on backend

