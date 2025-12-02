# Better Auth Setup Complete ✅

## What Was Done

### 1. ✅ Package Configuration
- Updated `package.json` to use ESM (`"type": "module"`)
- Added `better-auth` dependency
- Updated `tsconfig.json` to use ES2022 modules

### 2. ✅ Better Auth Configuration
- Created `src/auth.ts` with Better Auth setup
- Configured MongoDB adapter
- Set up email/password authentication
- Configured session management (7 days expiry)

### 3. ✅ Authentication Middleware
- Created new `requireAuth` middleware using Better Auth sessions
- Created new `requireAdmin` middleware
- Handles user creation automatically
- Links Better Auth users to your User model
- Maintains backward compatibility with existing routes

### 4. ✅ Server Setup
- Mounted Better Auth handler at `/api/auth/*`
- **CRITICAL:** Handler is mounted BEFORE `express.json()` middleware
- Updated Socket.IO authentication to use Better Auth cookies

### 5. ✅ User Model
- Added `betterAuthUserId` field for linking
- Added `clerkId` field for migration period
- Maintains backward compatibility

### 6. ✅ Environment Variables
- Added `BETTER_AUTH_SECRET` (required)
- Added `BETTER_AUTH_URL` (optional, defaults to localhost:5000)
- Updated `env.example` with Better Auth variables

---

## Next Steps

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Generate Better Auth Secret
```bash
# On Linux/Mac:
openssl rand -base64 32

# On Windows (PowerShell):
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### 3. Update `.env` File
Add to your `.env` file:
```env
BETTER_AUTH_SECRET=<generated-secret-here>
BETTER_AUTH_URL=http://localhost:5000
```

### 4. Test Better Auth
```bash
# Start the server
npm run dev

# Test the health endpoint
curl http://localhost:5000/api/auth/ok

# Should return: {"ok":true}
```

### 5. Test Sign Up
```bash
curl -X POST http://localhost:5000/api/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
```

### 6. Test Sign In
```bash
curl -X POST http://localhost:5000/api/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 7. Test Protected Route
```bash
# After signing in, use the session cookie
curl http://localhost:5000/api/protected \
  -H "Cookie: better-auth.session_token=<cookie-value>"
```

---

## Important Notes

### ⚠️ ESM Conversion Required

Since we changed to ESM, you'll need to update ALL route files from:
```typescript
// OLD (CommonJS)
const express = require('express');
module.exports = router;
```

To:
```typescript
// NEW (ESM)
import express from 'express';
export default router;
```

**Files that need updating:**
- All route files in `src/routes/`
- All model files in `src/models/`
- All utility files in `src/utils/`

### ⚠️ Socket.IO Changes

Socket.IO now uses cookies instead of tokens. Mobile clients need to:
1. Get session cookie from Better Auth
2. Send cookie in Socket.IO handshake headers

### ⚠️ Backward Compatibility

The middleware maintains backward compatibility:
- `(req as any).user.sub` still works (for existing routes)
- `(req as any).userId` is available
- `(req as any).dbUser` contains the full user document

---

## Testing Checklist

- [ ] Better Auth health endpoint works (`/api/auth/ok`)
- [ ] Can sign up new user
- [ ] Can sign in with email/password
- [ ] Session cookie is set correctly
- [ ] Protected routes work with session cookie
- [ ] Admin routes work correctly
- [ ] Socket.IO connects with cookies
- [ ] User is created in MongoDB automatically
- [ ] Suspension check works

---

## Troubleshooting

### Error: "Cannot find module"
- Make sure you ran `npm install`
- Check that `package.json` has `"type": "module"`

### Error: "Better Auth handler not working"
- Make sure Better Auth handler is mounted BEFORE `express.json()`
- Check that `/api/auth/*` route is correct

### Error: "Session not found"
- Make sure cookies are being sent with requests
- Check `BETTER_AUTH_SECRET` is set correctly
- Verify MongoDB connection is working

### Error: "User not created"
- Check MongoDB connection
- Check User model schema
- Look for errors in console

---

## Migration Status

✅ **Completed:**
- Better Auth installed and configured
- Middleware created
- Server updated
- Socket.IO updated
- User model updated

⏳ **Still Needed:**
- Convert all files to ESM (routes, models, utils)
- Update mobile app to use Better Auth
- Test all endpoints
- Migrate existing users (if any)

---

## Support

For issues or questions:
1. Check Better Auth docs: https://www.better-auth.com/docs
2. Check MongoDB adapter docs: https://www.better-auth.com/docs/adapters/mongo
3. Review the migration plan: `BETTER_AUTH_MIGRATION_PLAN.md`

