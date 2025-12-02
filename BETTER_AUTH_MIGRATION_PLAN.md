# Complete Migration Plan: Clerk to Better Auth

## Executive Summary

This document provides a comprehensive migration plan to replace Clerk authentication with Better Auth in your Express.js backend and Expo mobile application. The migration involves replacing token-based authentication (Bearer tokens) with Better Auth's session-based authentication using cookies.

---

## Table of Contents

1. [Current Architecture Analysis](#current-architecture-analysis)
2. [Better Auth Setup](#better-auth-setup)
3. [Migration Strategy](#migration-strategy)
4. [Step-by-Step Migration Guide](#step-by-step-migration-guide)
5. [Code Changes Required](#code-changes-required)
6. [Recommended Folder Structure](#recommended-folder-structure)
7. [Breaking Changes & Risks](#breaking-changes--risks)
8. [Testing Checklist](#testing-checklist)

---

## Current Architecture Analysis

### 1. Clerk Usage Patterns Identified

#### Backend (Express.js)

**A. Authentication Middleware** (`backend/src/middleware/auth.ts`)
- `requireAuth`: Verifies JWT tokens from `Authorization: Bearer <token>` header
- `requireAdmin`: Verifies token and checks admin role in database
- Uses `@clerk/clerk-sdk-node` `verifyToken()` function
- Validates `CLERK_ISSUER` and `CLERK_SECRET_KEY`
- Attaches user payload to `req.user` with `sub` (user ID) claim
- Checks user suspension status from MongoDB

**B. Socket.IO Authentication** (`backend/src/index.ts`)
- Socket middleware verifies tokens from `socket.handshake.auth.token`
- Uses same Clerk token verification
- Attaches user ID to `socket.data.user`

**C. Protected Routes** (All route files)
- **114 routes** use `requireAuth` middleware
- **15 routes** use `requireAdmin` middleware
- Routes access user via `(req as any).user.sub` (Clerk user ID)
- User ID is used as MongoDB `_id` directly

**D. User Model** (`backend/src/models/user.model.ts`)
- `_id` field is the Clerk User ID (string)
- No separate user ID generation
- Direct mapping: Clerk ID = MongoDB `_id`

**E. Webhooks** (`backend/src/routes/webhooks.ts`)
- Handles `user.updated` and `user.deleted` events
- Syncs user data from Clerk to MongoDB
- Uses Svix for webhook signature verification

**F. User Creation Flow** (`backend/src/routes/protected.ts`)
- On first API call, if user doesn't exist in DB:
  1. Fetches user data from Clerk API (`users.getUser()`)
  2. Creates MongoDB user with Clerk ID as `_id`
  3. Syncs profile data (username, email, firstName, lastName, etc.)

**G. Clerk API Usage**
- `users.getUser(clerkId)`: Fetch user data
- `users.updateUser(clerkId, data)`: Update user profile
- `users.deleteUser(clerkId)`: Delete user account
- `users.updateUser()` with `publicMetadata`: Update role

#### Mobile App (Expo)

**A. Clerk Provider** (`mobile/App.tsx`)
- Wraps app with `ClerkProvider`
- Uses `expo-secure-store` for token caching
- Configures publishable key from app config

**B. Authentication Hook** (`mobile/src/hooks/useAuth.ts`)
- Uses `@clerk/clerk-expo` hooks: `useAuth()`, `useUser()`
- Gets tokens via `getToken()` method
- Checks suspension status via backend API

**C. API Client** (`mobile/src/services/api/client.ts`)
- Adds `Authorization: Bearer <token>` header to requests
- Gets token from Clerk's `getToken()` method
- Handles 401/403 errors

**D. Socket.IO Client** (`mobile/src/hooks/useSocket.ts`)
- Connects with token in `auth.token` field
- Token obtained from Clerk's `getToken()`

**E. Sign In/Sign Up** (`mobile/src/screens/SignInScreen.tsx`, `SignUpScreen.tsx`)
- Uses Clerk's `signIn.create()` and `signUp.create()`
- Sets active session with `setActive()`
- Syncs with backend after authentication

#### Frontend (Next.js)

**A. Clerk Provider** (`frontend/app/layout.tsx`)
- Wraps app with `ClerkProvider`
- Configures appearance

**B. Middleware** (`frontend/middleware.ts`)
- Uses `clerkMiddleware` from `@clerk/nextjs/server`
- Protects routes and checks admin roles
- Handles maintenance mode

---

## Better Auth Setup

### 1. Installation

```bash
# Backend
cd backend
npm install better-auth
npm uninstall @clerk/clerk-sdk-node

# Mobile
cd mobile
npm install better-auth @better-auth/expo
npm uninstall @clerk/clerk-expo

# Frontend (if migrating)
cd frontend
npm install better-auth
npm uninstall @clerk/nextjs
```

### 2. Better Auth Configuration

#### Backend Configuration (`backend/src/auth.ts`)

```typescript
import { betterAuth } from "better-auth";
import { mongooseAdapter } from "better-auth/adapters/mongoose";
import mongoose from "mongoose";

// Connect to MongoDB (reuse existing connection)
const db = mongoose.connection.db;

export const auth = betterAuth({
  database: mongooseAdapter(mongoose, {
    // Better Auth will create its own collections
    // You can keep your existing User model for app-specific data
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true if you want email verification
  },
  socialProviders: {
    // Add social providers if needed
    // google: { ... },
    // github: { ... },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  trustedOrigins: [
    process.env.FRONTEND_URL || "http://localhost:3000",
    "https://airwig.ca",
    "https://www.airwig.ca",
    // Add mobile app origins if needed
  ],
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:5000",
  basePath: "/api/auth",
  secret: process.env.BETTER_AUTH_SECRET!, // Generate: openssl rand -base64 32
});

export type Session = typeof auth.$Infer.Session;
```

**Environment Variables Required:**
```env
BETTER_AUTH_SECRET=<generate-secret-here>
BETTER_AUTH_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000
```

### 3. MongoDB Adapter Setup

Better Auth will create these collections automatically:
- `better-auth_user`
- `better-auth_session`
- `better-auth_account`
- `better-auth_verification`

**Important:** Your existing `User` model will remain separate. You'll need to:
1. Keep your `User` model for app-specific data
2. Link Better Auth user ID to your User model
3. Sync data between Better Auth and your User model

---

## Migration Strategy

### Phase 1: Backend Setup (Week 1)
1. Install Better Auth
2. Configure Better Auth instance
3. Mount Better Auth handler
4. Create new authentication middleware
5. Test basic authentication flow

### Phase 2: Route Migration (Week 2)
1. Update all protected routes
2. Replace `requireAuth` with Better Auth middleware
3. Update user ID access pattern
4. Test all protected endpoints

### Phase 3: Socket.IO Migration (Week 2)
1. Update Socket.IO authentication
2. Replace token-based auth with session-based
3. Test real-time features

### Phase 4: Mobile App Migration (Week 3)
1. Install Better Auth Expo plugin
2. Replace Clerk hooks
3. Update API client
4. Update Socket.IO client
5. Test authentication flows

### Phase 5: Frontend Migration (Week 4)
1. Replace Clerk with Better Auth
2. Update middleware
3. Test all protected pages

### Phase 6: Data Migration (Week 4)
1. Migrate existing users
2. Link Better Auth users to MongoDB User model
3. Test user data integrity

### Phase 7: Cleanup (Week 5)
1. Remove Clerk dependencies
2. Remove Clerk webhooks
3. Update documentation
4. Final testing

---

## Step-by-Step Migration Guide

### Step 1: Backend - Install and Configure Better Auth

**File: `backend/package.json`**
```json
{
  "type": "module", // CRITICAL: Better Auth requires ESM
  "dependencies": {
    "better-auth": "^1.0.0",
    // Remove: "@clerk/clerk-sdk-node"
  }
}
```

**File: `backend/src/auth.ts` (NEW)**
```typescript
import { betterAuth } from "better-auth";
import { mongooseAdapter } from "better-auth/adapters/mongoose";
import mongoose from "mongoose";

export const auth = betterAuth({
  database: mongooseAdapter(mongoose),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
  },
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:5000",
  basePath: "/api/auth",
  secret: process.env.BETTER_AUTH_SECRET!,
  trustedOrigins: [
    process.env.FRONTEND_URL || "http://localhost:3000",
    "https://airwig.ca",
    "https://www.airwig.ca",
  ],
});
```

**File: `backend/src/index.ts` (UPDATE)**
```typescript
import express from 'express';
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import { auth } from './auth'; // NEW

// ... existing imports ...

const app = express();

// ... existing CORS and security setup ...

// CRITICAL: Mount Better Auth handler BEFORE express.json()
app.all("/api/auth/*", toNodeHandler(auth));

// Mount express json middleware AFTER Better Auth handler
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

// ... rest of your routes ...
```

### Step 2: Backend - Create New Authentication Middleware

**File: `backend/src/middleware/auth.ts` (REPLACE)**
```typescript
import { Request, Response, NextFunction } from 'express';
import { auth } from '../auth';
import { fromNodeHeaders } from "better-auth/node";
import { User } from '../models/user.model';

// Better Auth session middleware
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // Get session from Better Auth
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session || !session.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }

    // Attach user to request (Better Auth user ID)
    (req as any).user = {
      id: session.user.id, // Better Auth user ID
      email: session.user.email,
      name: session.user.name,
    };
    
    // Check if user exists in our User model
    // Better Auth user ID might be different from our User._id
    // We need to link them
    let dbUser = await User.findOne({ 
      betterAuthUserId: session.user.id 
    });

    // If no link exists, try to find by email (for migration)
    if (!dbUser && session.user.email) {
      dbUser = await User.findOne({ email: session.user.email });
      if (dbUser) {
        // Link Better Auth user to existing User
        dbUser.betterAuthUserId = session.user.id;
        await dbUser.save();
      }
    }

    // Create user in our DB if doesn't exist
    if (!dbUser) {
      dbUser = await User.create({
        _id: session.user.id, // Use Better Auth ID as _id
        betterAuthUserId: session.user.id,
        username: await generateUniqueUsername(
          session.user.email?.split('@')[0] || `user_${session.user.id}`
        ),
        email: session.user.email,
        firstName: session.user.name?.split(' ')[0],
        lastName: session.user.name?.split(' ').slice(1).join(' '),
        role: 'user',
        status: 'active',
        isPrivate: false,
        lastActivityAt: new Date(),
      });
    }

    // Check if user is suspended
    if (dbUser.status === 'suspended') {
      return res.status(403).json({ 
        error: 'Account suspended',
        suspended: true,
        message: 'Your account has been suspended by an administrator.',
        code: 'ACCOUNT_SUSPENDED'
      });
    }

    // Attach database user to request
    (req as any).dbUser = dbUser;
    (req as any).userId = dbUser._id; // Use for backward compatibility

    next();
  } catch (err: any) {
    console.error('❌ Authentication error:', err.message);
    return res.status(401).json({ 
      error: 'Invalid session',
      code: 'INVALID_SESSION'
    });
  }
}

// Admin middleware
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    // First check authentication
    await requireAuth(req, res, () => {});

    const dbUser = (req as any).dbUser;
    
    if (!dbUser || dbUser.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Admin access required',
        code: 'ADMIN_ACCESS_REQUIRED'
      });
    }
    
    next();
  } catch (err: any) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'UNAUTHORIZED'
    });
  }
}

// Helper function
async function generateUniqueUsername(baseUsername: string): Promise<string> {
  let username = baseUsername.toLowerCase();
  let counter = 1;
  
  while (true) {
    const existingUser = await User.findOne({ username });
    if (!existingUser) {
      return username;
    }
    username = `${baseUsername}${counter}`.toLowerCase();
    counter++;
  }
}
```

### Step 3: Update User Model

**File: `backend/src/models/user.model.ts` (UPDATE)**
```typescript
import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  _id: string; // Better Auth User ID (or legacy Clerk ID)
  betterAuthUserId?: string; // Link to Better Auth user
  clerkId?: string; // Legacy Clerk ID (for migration period)
  // ... rest of your fields remain the same
  username: string;
  email?: string;
  // ... etc
}

const userSchema = new Schema<IUser>({
  _id: { type: String, required: true },
  betterAuthUserId: { type: String, unique: true, sparse: true, index: true },
  clerkId: { type: String, index: true }, // For migration
  // ... rest of schema
}, {
  timestamps: true,
});

export const User = model<IUser>('User', userSchema);
```

### Step 4: Update Socket.IO Authentication

**File: `backend/src/index.ts` (UPDATE Socket.IO section)**
```typescript
import { auth } from './auth';
import { fromNodeHeaders } from "better-auth/node";

// Socket.IO authentication middleware
io.use(async (socket, next) => {
  try {
    // Better Auth uses cookies, not tokens
    // We need to extract cookies from handshake
    const cookieHeader = socket.handshake.headers.cookie;
    
    if (!cookieHeader) {
      return next(new Error('No session cookie provided'));
    }

    // Create a mock request object with cookies
    const mockHeaders = new Headers();
    mockHeaders.set('cookie', cookieHeader);
    
    // Get session from Better Auth
    const session = await auth.api.getSession({
      headers: mockHeaders,
    });

    if (!session || !session.user) {
      return next(new Error('Invalid session'));
    }

    // Check if user is suspended
    const User = require('./models/user.model').User;
    const dbUser = await User.findOne({ 
      betterAuthUserId: session.user.id 
    });
    
    if (dbUser && dbUser.status === 'suspended') {
      return next(new Error('Account suspended'));
    }

    socket.data.user = { 
      id: dbUser?._id || session.user.id 
    };
    
    next();
  } catch (err) {
    console.log('Socket authentication failed:', err);
    next(new Error('Authentication failed'));
  }
});
```

### Step 5: Update Protected Routes

**Example: `backend/src/routes/protected.ts` (UPDATE)**
```typescript
// OLD:
const clerkUser = (req as any).user;
const clerkId = clerkUser.sub;

// NEW:
const dbUser = (req as any).dbUser;
const userId = (req as any).userId || dbUser._id;

// Use userId instead of clerkId throughout
```

**Pattern to replace in ALL route files:**
```typescript
// Find and replace:
(req as any).user.sub → (req as any).userId
clerkUser.sub → userId
clerkId → userId
```

### Step 6: Mobile App - Install Better Auth

**File: `mobile/package.json`**
```json
{
  "dependencies": {
    "better-auth": "^1.0.0",
    "@better-auth/expo": "^1.0.0",
    // Remove: "@clerk/clerk-expo"
  }
}
```

**File: `mobile/src/lib/auth-client.ts` (NEW)**
```typescript
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

const API_BASE_URL = "http://192.168.101.3:5000"; // Your backend URL

export const authClient = createAuthClient({
  baseURL: API_BASE_URL,
  storage: SecureStore,
  // scheme: "myapp", // For deep linking (optional)
});
```

**File: `mobile/App.tsx` (REPLACE)**
```typescript
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/MainTabNavigator';
// Remove: ClerkProvider
// Add: Better Auth doesn't need a provider

export default function App() {
  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}
```

**File: `mobile/src/hooks/useAuth.ts` (REPLACE)**
```typescript
import { useState, useEffect } from 'react';
import { authClient } from '../lib/auth-client';

export const useAuth = () => {
  const { data: session, isPending } = authClient.useSession();
  
  const [authState, setAuthState] = useState({
    isSignedIn: false,
    isLoaded: false,
    user: null as any,
    isLoading: false,
    error: null as string | null,
  });

  useEffect(() => {
    setAuthState({
      isSignedIn: !!session?.user,
      isLoaded: !isPending,
      user: session?.user || null,
      isLoading: isPending,
      error: null,
    });
  }, [session, isPending]);

  const signOut = async () => {
    await authClient.signOut();
  };

  const getToken = async (): Promise<string | null> => {
    // Better Auth uses cookies, not tokens
    // For API calls, we need to get the session cookie
    const cookies = authClient.getCookie();
    return cookies || null;
  };

  return {
    ...authState,
    signOut,
    getToken, // For backward compatibility
    session,
  };
};
```

**File: `mobile/src/services/api/client.ts` (UPDATE)**
```typescript
import { authClient } from '../../lib/auth-client';

// Update request interceptor
this.client.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      // Get session cookie from Better Auth
      const cookies = authClient.getCookie();
      if (cookies) {
        config.headers = {
          ...config.headers,
          'Cookie': cookies,
        };
      }
    } catch (error) {
      console.warn('Failed to get auth cookie:', error);
    }
    return config;
  },
  // ... error handler
);

// Update methods to remove token parameter
async get<T>(endpoint: string, params?: any): Promise<T> {
  // Remove token parameter, cookies are sent automatically
  const response = await this.request<ApiResponse<T>>({
    method: 'GET',
    url: endpoint,
    params,
  });
  return response.data as T;
}
```

**File: `mobile/src/hooks/useSocket.ts` (UPDATE)**
```typescript
import { authClient } from '../lib/auth-client';

// Update connect method
private async _connect(): Promise<void> {
  try {
    // Get session cookie
    const cookies = authClient.getCookie();
    if (!cookies) {
      throw new Error('No session cookie available');
    }

    this.socket = io(SOCKET_BASE_URL, {
      // Send cookies in handshake
      extraHeaders: {
        'Cookie': cookies,
      },
      transports: ['polling', 'websocket'],
      // ... rest of config
    });
    // ... rest of connection logic
  }
}
```

**File: `mobile/src/screens/SignInScreen.tsx` (UPDATE)**
```typescript
import { authClient } from '../lib/auth-client';

const onSignInPress = async () => {
  setIsLoading(true);
  setError('');

  try {
    // Better Auth sign in
    await authClient.signIn.email({
      email: emailAddress,
      password: password,
    });

    // Navigate to home
    navigation.navigate('MainTabs', { screen: 'Home' });
  } catch (err: any) {
    setError(err.message || 'Sign in failed');
  } finally {
    setIsLoading(false);
  }
};
```

### Step 7: Remove Clerk Webhooks

**File: `backend/src/routes/webhooks.ts` (DELETE or REPLACE)**
- Remove Clerk webhook handler
- Better Auth handles user events internally
- You may need to create custom webhooks if needed

### Step 8: Data Migration Script

**File: `backend/src/scripts/migrate-users.ts` (NEW)**
```typescript
import mongoose from 'mongoose';
import { User } from '../models/user.model';
import { connectDB } from '../config/db';

async function migrateUsers() {
  await connectDB();

  const users = await User.find({});
  
  console.log(`Found ${users.length} users to migrate`);

  for (const user of users) {
    // For each existing user:
    // 1. Create Better Auth account with same email
    // 2. Link Better Auth user ID to User model
    // 3. Mark migration as complete
    
    // This is a manual process - you'll need to:
    // - Have users sign up again with Better Auth
    // - Or create Better Auth accounts programmatically
    // - Link them to existing User records
    
    console.log(`Migrating user: ${user._id} (${user.email})`);
  }

  console.log('Migration complete');
  process.exit(0);
}

migrateUsers();
```

---

## Code Changes Required

### Backend Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `package.json` | Update | Add `"type": "module"`, install Better Auth, remove Clerk |
| `src/auth.ts` | NEW | Better Auth configuration |
| `src/middleware/auth.ts` | REPLACE | New session-based middleware |
| `src/index.ts` | UPDATE | Mount Better Auth handler, update Socket.IO auth |
| `src/models/user.model.ts` | UPDATE | Add `betterAuthUserId` field |
| `src/routes/*.ts` | UPDATE | Replace `clerkUser.sub` with `userId` |
| `src/routes/webhooks.ts` | DELETE | Remove Clerk webhooks |
| `env.example` | UPDATE | Add Better Auth env vars, remove Clerk vars |

### Mobile Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `package.json` | Update | Install Better Auth, remove Clerk |
| `App.tsx` | UPDATE | Remove ClerkProvider |
| `src/lib/auth-client.ts` | NEW | Better Auth client configuration |
| `src/hooks/useAuth.ts` | REPLACE | Use Better Auth hooks |
| `src/services/api/client.ts` | UPDATE | Use cookies instead of tokens |
| `src/hooks/useSocket.ts` | UPDATE | Send cookies instead of tokens |
| `src/screens/SignInScreen.tsx` | UPDATE | Use Better Auth sign in |
| `src/screens/SignUpScreen.tsx` | UPDATE | Use Better Auth sign up |

---

## Recommended Folder Structure

### Backend Structure (After Migration)

```
backend/
├── src/
│   ├── auth.ts                    # NEW: Better Auth configuration
│   ├── config/
│   │   ├── db.ts
│   │   ├── env.ts
│   ├── middleware/
│   │   ├── auth.ts                # UPDATED: Better Auth middleware
│   │   └── multer.ts
│   ├── models/
│   │   ├── user.model.ts          # UPDATED: Add betterAuthUserId
│   │   └── ...
│   ├── routes/
│   │   ├── protected.ts          # UPDATED: Use new middleware
│   │   ├── posts.ts               # UPDATED: Use userId instead of clerkId
│   │   └── ...
│   ├── scripts/
│   │   └── migrate-users.ts       # NEW: User migration script
│   ├── utils/
│   └── index.ts                  # UPDATED: Mount Better Auth
├── package.json                  # UPDATED: ESM + Better Auth
└── .env                          # UPDATED: Better Auth vars
```

### Mobile Structure (After Migration)

```
mobile/
├── src/
│   ├── lib/
│   │   └── auth-client.ts        # NEW: Better Auth client
│   ├── hooks/
│   │   ├── useAuth.ts             # REPLACED: Better Auth hooks
│   │   └── useSocket.ts           # UPDATED: Cookie-based auth
│   ├── services/
│   │   └── api/
│   │       └── client.ts          # UPDATED: Cookie-based requests
│   └── screens/
│       ├── SignInScreen.tsx       # UPDATED: Better Auth sign in
│       └── SignUpScreen.tsx       # UPDATED: Better Auth sign up
├── App.tsx                        # UPDATED: Remove ClerkProvider
└── package.json                   # UPDATED: Better Auth deps
```

---

## Breaking Changes & Risks

### Critical Breaking Changes

1. **Authentication Method**
   - **Before:** Bearer token in `Authorization` header
   - **After:** Session cookies (automatic with Better Auth)
   - **Impact:** All API clients must support cookies
   - **Risk:** HIGH - Mobile apps need significant updates

2. **User ID Format**
   - **Before:** Clerk user ID (format: `user_xxx`)
   - **After:** Better Auth user ID (format: `xxx`)
   - **Impact:** User IDs will change
   - **Risk:** HIGH - Need data migration strategy

3. **Module System**
   - **Before:** CommonJS (`"type": "commonjs"`)
   - **After:** ESM (`"type": "module"`)
   - **Impact:** All imports/exports must use ESM syntax
   - **Risk:** MEDIUM - Requires code updates

4. **Socket.IO Authentication**
   - **Before:** Token in `auth.token`
   - **After:** Cookies in `extraHeaders.Cookie`
   - **Impact:** Socket.IO connection method changes
   - **Risk:** MEDIUM - Real-time features need testing

5. **User Creation Flow**
   - **Before:** Automatic via Clerk webhook
   - **After:** Manual creation or Better Auth hooks
   - **Impact:** User sync logic changes
   - **Risk:** MEDIUM - Need new user creation flow

### Migration Risks

1. **Data Loss Risk:** MEDIUM
   - User IDs change - need careful migration
   - Link old Clerk IDs to new Better Auth IDs

2. **Downtime Risk:** LOW
   - Can run both systems in parallel
   - Gradual migration possible

3. **Mobile App Compatibility:** HIGH
   - Expo app needs complete rewrite of auth
   - Testing required on real devices

4. **Session Management:** MEDIUM
   - Cookie-based sessions work differently
   - Need to handle cookie storage in mobile

5. **Social Login:** HIGH
   - If using social providers, need to reconfigure
   - OAuth flow changes

### Mitigation Strategies

1. **Parallel Running**
   - Keep Clerk active during migration
   - Support both auth methods temporarily
   - Gradual cutover

2. **User Migration**
   - Create migration script
   - Link old and new user IDs
   - Preserve all user data

3. **Testing**
   - Comprehensive test suite
   - Test on staging first
   - Mobile device testing

4. **Rollback Plan**
   - Keep Clerk code in version control
   - Can revert if issues arise
   - Database backups

---

## Testing Checklist

### Backend Testing

- [ ] Better Auth handler mounted correctly
- [ ] `/api/auth/ok` endpoint returns 200
- [ ] User can sign up via `/api/auth/sign-up`
- [ ] User can sign in via `/api/auth/sign-in`
- [ ] Session cookie is set correctly
- [ ] `requireAuth` middleware works
- [ ] `requireAdmin` middleware works
- [ ] All protected routes accessible with valid session
- [ ] All protected routes reject invalid session
- [ ] Socket.IO authentication works
- [ ] User suspension check works
- [ ] User creation in MongoDB works
- [ ] User profile update works

### Mobile App Testing

- [ ] Better Auth client initializes
- [ ] User can sign up
- [ ] User can sign in
- [ ] Session persists after app restart
- [ ] API calls include cookies
- [ ] Socket.IO connects with cookies
- [ ] Sign out works
- [ ] Suspension check works
- [ ] Error handling works

### Integration Testing

- [ ] End-to-end sign up flow
- [ ] End-to-end sign in flow
- [ ] Protected API calls work
- [ ] Real-time features work
- [ ] User profile sync works
- [ ] Admin functions work

### Performance Testing

- [ ] Session validation performance
- [ ] Database query performance
- [ ] Socket.IO connection performance
- [ ] Mobile app performance

---

## Additional Notes

### Environment Variables

**Backend `.env`:**
```env
# Better Auth
BETTER_AUTH_SECRET=<generate-with-openssl-rand-base64-32>
BETTER_AUTH_URL=http://localhost:5000

# Remove:
# CLERK_SECRET_KEY
# CLERK_ISSUER
# CLERK_WEBHOOK_SECRET
```

### User ID Migration Strategy

**Option 1: Use Better Auth ID as Primary**
- Pros: Clean, no legacy data
- Cons: All existing user IDs change

**Option 2: Keep Legacy IDs, Link Better Auth**
- Pros: No data migration needed
- Cons: More complex queries

**Recommended:** Option 1 with migration script

### Cookie Handling in Mobile

Better Auth Expo plugin handles cookies automatically via `expo-secure-store`. No manual cookie management needed.

### Social Login

If you need social login, configure in Better Auth:
```typescript
socialProviders: {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  },
}
```

---

## Conclusion

This migration is a significant undertaking but will provide:
- Better control over authentication
- Reduced dependency on third-party service
- Lower costs (no Clerk subscription)
- More flexibility for custom features

**Estimated Timeline:** 4-5 weeks
**Risk Level:** Medium-High
**Complexity:** High

**Recommendation:** 
1. Start with backend setup and testing
2. Create comprehensive test suite
3. Migrate mobile app carefully
4. Test thoroughly before production deployment
5. Have rollback plan ready

---

## Resources

- [Better Auth Documentation](https://www.better-auth.com/docs)
- [Better Auth Express Integration](https://www.better-auth.com/docs/integrations/express)
- [Better Auth MongoDB Adapter](https://www.better-auth.com/docs/adapters/mongo)
- [Better Auth Expo Integration](https://www.better-auth.com/docs/integrations/expo)

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Author:** Migration Planning Team

