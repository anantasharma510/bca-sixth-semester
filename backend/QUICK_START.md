# Better Auth Quick Start Guide

## ✅ Setup Complete!

Better Auth has been successfully integrated into your backend. Here's what you need to do next:

---

## 🚀 Immediate Next Steps

### 1. Generate Better Auth Secret

**Windows (PowerShell):**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

**Linux/Mac:**
```bash
openssl rand -base64 32
```

### 2. Add to `.env` File

Add these lines to your `backend/.env` file:

```env
BETTER_AUTH_SECRET=<paste-generated-secret-here>
BETTER_AUTH_URL=http://localhost:5000
```

### 3. Test the Setup

```bash
# Start your server
npm run dev

# In another terminal, test Better Auth health endpoint
curl http://localhost:5000/api/auth/ok
```

You should see: `{"ok":true}`

---

## 📝 What Changed

### Files Created:
- ✅ `src/auth.ts` - Better Auth configuration
- ✅ `BETTER_AUTH_SETUP.md` - Detailed setup guide

### Files Modified:
- ✅ `package.json` - Added Better Auth, changed to ESM
- ✅ `tsconfig.json` - Updated to ES2022 modules
- ✅ `src/middleware/auth.ts` - New Better Auth middleware
- ✅ `src/models/user.model.ts` - Added Better Auth linking fields
- ✅ `src/index.ts` - Mounted Better Auth handler
- ✅ `env.example` - Added Better Auth variables

---

## ⚠️ Important: ESM Conversion Required

Your codebase now uses **ESM (ECMAScript Modules)** instead of CommonJS. This means:

**Before (CommonJS):**
```typescript
const express = require('express');
module.exports = router;
```

**After (ESM):**
```typescript
import express from 'express';
export default router;
```

**You'll need to convert:**
- All route files (`src/routes/*.ts`)
- All model files (`src/models/*.ts`) 
- All utility files (`src/utils/*.ts`)

**But don't worry!** The server will still work with Clerk for now. You can convert files gradually.

---

## 🧪 Test Better Auth

### 1. Sign Up a User
```bash
curl -X POST http://localhost:5000/api/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
```

### 2. Sign In
```bash
curl -X POST http://localhost:5000/api/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

Save the `Set-Cookie` header value from the response.

### 3. Test Protected Route
```bash
curl http://localhost:5000/api/protected \
  -H "Cookie: better-auth.session_token=<cookie-from-sign-in>"
```

---

## 🔄 Current Status

### ✅ Working:
- Better Auth is installed and configured
- Authentication middleware is ready
- Server can handle Better Auth requests
- Socket.IO updated for Better Auth

### ⏳ Still Using Clerk:
- All routes still use Clerk tokens (backward compatible)
- Mobile app still uses Clerk
- Frontend still uses Clerk

### 🎯 Next Phase:
- Convert route files to ESM
- Update routes to use Better Auth middleware
- Update mobile app
- Update frontend

---

## 📚 Available Better Auth Endpoints

Once running, Better Auth provides these endpoints:

- `GET /api/auth/ok` - Health check
- `POST /api/auth/sign-up` - Sign up
- `POST /api/auth/sign-in` - Sign in
- `POST /api/auth/sign-out` - Sign out
- `GET /api/auth/session` - Get current session
- `POST /api/auth/forget-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

See: https://www.better-auth.com/docs for full API documentation.

---

## 🆘 Troubleshooting

### "Cannot find module 'better-auth'"
```bash
cd backend
npm install
```

### "Better Auth handler not responding"
- Check that `BETTER_AUTH_SECRET` is set in `.env`
- Verify handler is mounted before `express.json()`
- Check server logs for errors

### "Session not found"
- Make sure cookies are being sent
- Check `BETTER_AUTH_URL` matches your server URL
- Verify MongoDB is connected

---

## 📖 Documentation

- **Setup Guide:** `BETTER_AUTH_SETUP.md`
- **Migration Plan:** `../BETTER_AUTH_MIGRATION_PLAN.md`
- **Better Auth Docs:** https://www.better-auth.com/docs
- **MongoDB Adapter:** https://www.better-auth.com/docs/adapters/mongo

---

## ✨ You're Ready!

Better Auth is now integrated. Start your server and test the `/api/auth/ok` endpoint to verify everything is working!

```bash
npm run dev
```

Then visit: http://localhost:5000/api/auth/ok

