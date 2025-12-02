# Deep Bug Analysis - Image Caching Implementation

## Files Analyzed (9 files)
1. `mobile/src/stores/userStore.ts`
2. `mobile/src/utils/imageCache.ts`
3. `mobile/src/screens/EditProfileScreen.tsx`
4. `mobile/src/components/Post.tsx`
5. `mobile/src/navigation/MainTabNavigator.tsx`
6. `mobile/src/screens/HomeScreen.tsx`
7. `mobile/src/hooks/auth/useAuth.ts`
8. `mobile/src/screens/ProfileScreen.tsx`
9. `backend/src/routes/protected.ts`

---

## 🐛 CRITICAL BUGS FOUND

### 1. **HomeScreen.tsx - Syntax Error (Line 207)**
**Location:** `mobile/src/screens/HomeScreen.tsx:207`
**Issue:** Missing closing brace in `handleProfileImageUpdated` function
**Code:**
```typescript
// Line 205-207
return post;
}
}
```
**Problem:** Extra closing brace causes syntax error
**Fix:** Remove the extra closing brace

---

### 2. **userStore.ts - Missing URL Validation in updateUserImage**
**Location:** `mobile/src/stores/userStore.ts:60-73`
**Issue:** `updateUserImage` doesn't validate URL before storing
**Code:**
```typescript
updateUserImage: (userId, type, url) => {
  const timestamp = Date.now();
  set((state) => ({
    userImageCache: {
      ...state.userImageCache,
      [userId]: {
        ...(state.userImageCache[userId] || {}),
        [type === 'profile' ? 'profileImageUrl' : 'coverImageUrl']: url,
        lastUpdated: timestamp,
      },
    },
  }));
}
```
**Problem:** 
- No validation for empty/null URLs
- No validation for userId
- Could store invalid data
**Fix:** Add validation like in `updateCurrentUserImage`

---

### 3. **ProfileScreen.tsx - useFocusEffect Dependency Array Issue**
**Location:** `mobile/src/screens/ProfileScreen.tsx:148-177`
**Issue:** `profile` in dependency array can cause infinite re-renders
**Code:**
```typescript
useFocusEffect(
  useCallback(() => {
    // ... code that uses profile
    if (storeProfile && storeProfile !== profileStateProfile) {
      setProfile((prev: any) => ({ ...prev, profileImageUrl: storeProfile }));
    }
    // ...
  }, [isSignedIn, loadProfile, currentUserImages, profile]) // ⚠️ profile in deps
);
```
**Problem:** 
- `profile` object reference changes frequently
- Causes `useFocusEffect` to re-run unnecessarily
- Could cause infinite loops if `setProfile` triggers re-render
**Fix:** Remove `profile` from deps, use `profile?.profileImageUrl` and `profile?.coverImageUrl` instead

---

### 4. **EditProfileScreen.tsx - Unnecessary Delay (Race Condition Risk)**
**Location:** `mobile/src/screens/EditProfileScreen.tsx:286-287`
**Issue:** Artificial delay that doesn't guarantee store propagation
**Code:**
```typescript
// Force a small delay to ensure store update propagates before navigation
await new Promise(resolve => setTimeout(resolve, 100));
```
**Problem:**
- 100ms delay is arbitrary and doesn't guarantee store update
- Could cause race conditions
- Unnecessary delay for user
**Fix:** Remove delay - Zustand updates are synchronous

---

### 5. **HomeScreen.tsx - Missing userId Type Validation**
**Location:** `mobile/src/screens/HomeScreen.tsx:154-163`
**Issue:** `data.userId` might not be string, causing issues in store
**Code:**
```typescript
const handleProfileImageUpdated = (data: any) => {
  if (!data || !data.userId || !data.imageUrl) {
    console.warn('Invalid profile image update data via socket:', data);
    return;
  }
  // ...
  updateUserImage(data.userId, data.type, data.imageUrl);
}
```
**Problem:**
- `data.userId` could be number (from backend)
- Store expects string for userId key
- Could cause cache key mismatch
**Fix:** Convert to string: `updateUserImage(String(data.userId), ...)`

---

## ⚠️ MEDIUM PRIORITY ISSUES

### 6. **EditProfileScreen.tsx - Missing getCacheBustedUrl Import**
**Location:** `mobile/src/screens/EditProfileScreen.tsx`
**Issue:** Uses `getCacheBustedUrl` but might not be imported everywhere needed
**Check:** Verify all usages have import

---

### 7. **Post.tsx - Potential Null Reference**
**Location:** `mobile/src/components/Post.tsx:772-784`
**Issue:** `currentUserId` could be undefined when comparing
**Code:**
```typescript
const isCurrentUser = authorId && currentUserId && authorId === currentUserId;
```
**Problem:** If `currentUserId` is undefined, comparison still works but could be clearer
**Fix:** Already handled, but could add explicit check

---

### 8. **ProfileScreen.tsx - Potential State Update Race Condition**
**Location:** `mobile/src/screens/ProfileScreen.tsx:160-173`
**Issue:** Multiple `setProfile` calls in same effect
**Code:**
```typescript
if (storeProfile && storeProfile !== profileStateProfile) {
  setProfile((prev: any) => ({ ...prev, profileImageUrl: storeProfile }));
}
if (storeCover && storeCover !== profileStateCover) {
  setProfile((prev: any) => ({ ...prev, coverImageUrl: storeCover }));
}
```
**Problem:** Two separate `setProfile` calls could cause double re-render
**Fix:** Combine into single `setProfile` call

---

### 9. **useAuth.ts - Store Initialization Race Condition**
**Location:** `mobile/src/hooks/auth/useAuth.ts:177-190`
**Issue:** Store initialization happens after state update
**Code:**
```typescript
setAuthState(prev => ({ ...prev, user: userResponse.user, ... }));
// Then initialize store
const { updateCurrentUserImage } = useUserStore.getState();
```
**Problem:** If component unmounts between state update and store init, store won't be updated
**Fix:** Initialize store before or in same transaction

---

## 🔍 MINOR ISSUES / CODE QUALITY

### 10. **imageCache.ts - Memory Leak Potential**
**Location:** `mobile/src/utils/imageCache.ts:6`
**Issue:** `imageVersionCache` grows unbounded
**Problem:** Old URLs never cleared, could cause memory issues over time
**Fix:** Add LRU cache or periodic cleanup

---

### 11. **EditProfileScreen.tsx - Redundant Store Updates**
**Location:** `mobile/src/screens/EditProfileScreen.tsx:485-495`
**Issue:** Updates store twice (from `updatedUser` and `formData`)
**Code:**
```typescript
if (updatedUser?.profileImageUrl) {
  updateCurrentUserImage('profile', updatedUser.profileImageUrl);
}
// ...
if (formData.profileImageUrl && !updatedUser?.profileImageUrl) {
  updateCurrentUserImage('profile', formData.profileImageUrl);
}
```
**Problem:** Could update with stale data if `formData` has old URL
**Fix:** Only update from `updatedUser`, `formData` is fallback

---

### 12. **HomeScreen.tsx - Missing Error Handling in Socket Handler**
**Location:** `mobile/src/screens/HomeScreen.tsx:154-208`
**Issue:** No try-catch in `handleProfileImageUpdated`
**Problem:** If store update fails, entire handler fails silently
**Fix:** Add try-catch with error logging

---

### 13. **backend/protected.ts - Socket Emission Without Validation**
**Location:** `backend/src/routes/protected.ts:414-420`
**Issue:** Emits socket event without checking if `io` is available
**Code:**
```typescript
io.emit('profileImageUpdated', {
  userId: userId,
  type: type,
  imageUrl: imageUrl,
  updatedAt: new Date().toISOString()
});
```
**Problem:** If `io` is undefined, will throw error
**Fix:** Add check: `if (io) { io.emit(...) }`

---

## 📊 SUMMARY

**Critical Bugs:** 5
**Medium Priority:** 4
**Minor Issues:** 4

**Total Issues Found:** 13

---

## 🔧 RECOMMENDED FIXES PRIORITY

1. **IMMEDIATE:** Fix HomeScreen syntax error (Bug #1)
2. **HIGH:** Fix ProfileScreen dependency array (Bug #3)
3. **HIGH:** Add URL validation to updateUserImage (Bug #2)
4. **MEDIUM:** Remove unnecessary delay in EditProfileScreen (Bug #4)
5. **MEDIUM:** Fix userId type conversion in HomeScreen (Bug #5)
6. **LOW:** Address other medium/minor issues

