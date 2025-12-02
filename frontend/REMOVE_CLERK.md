# Remove Clerk - Quick Fix Guide

To fix the ChunkLoadError, we need to replace all Clerk imports with Better Auth.

## Pattern to Replace:

**Find:**
```typescript
import { useAuth } from "@clerk/nextjs"
import { useUser } from "@clerk/nextjs"
import { useAuth, useUser } from "@clerk/nextjs"
```

**Replace with:**
```typescript
import { useAuth } from "@/hooks/use-auth"
```

**Then update usage:**
- `const { userId } = useAuth()` → `const { user } = useAuth(); const userId = user?.id`
- `const { isSignedIn } = useUser()` → `const { isSignedIn } = useAuth()`
- `const { user } = useUser()` → `const { user } = useAuth()`

## Files that need updating:
- All component files in `components/`
- All page files in `app/`
- All hook files in `hooks/`


