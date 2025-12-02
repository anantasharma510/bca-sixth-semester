# Mobile Real-Time Notifications Issue - In-Depth Analysis

## Problem Summary
Real-time notifications are not working in the mobile app. The notification icon doesn't show real-time notification numbers, and users only see notification numbers after closing and reopening the app.

## Root Cause Analysis

### Issue #1: Socket Reconnection Doesn't Auto-Rejoin User Room
**Location**: `mobile/src/hooks/useSocket.ts` (lines 132-153)

**Problem**: 
When the socket reconnects after the app goes to background and comes back to foreground, it automatically rejoins conversations and posts rooms, but **NOT the user room** (`user_${userId}`) which is critical for receiving notifications.

**Current Code**:
```typescript
this.socket.on('connect', () => {
  // Auto-rejoin conversations
  if (this.joinedConversations.size > 0) {
    this.socket.emit('joinConversations', conversationIds);
  }
  
  // Auto-rejoin posts
  if (this.joinedPosts.size > 0) {
    this.joinedPosts.forEach(postId => {
      this.socket!.emit('joinPost', postId);
    });
  }
  
  // ❌ MISSING: Auto-rejoin user room for notifications
});
```

**Impact**: 
- Backend emits notifications to `user_${userId}` room (see `backend/src/utils/notification-utils.ts` line 62)
- Mobile socket is NOT in that room after reconnection
- Notifications are sent but never received by the mobile app
- User only sees notifications when they reload the app (which reloads notifications from server)

---

### Issue #2: NotificationContext Doesn't Reload Notifications on Socket Reconnect
**Location**: `mobile/src/context/NotificationContext.tsx` (lines 97-101)

**Problem**: 
The notification count is only loaded on initial mount. When the socket reconnects after being disconnected, the notification count is **NOT reloaded** from the server to catch any missed notifications.

**Current Code**:
```typescript
useEffect(() => {
  if (userId && isSignedIn) {
    loadNotifications(1, false);  // Only runs on mount or when userId/isSignedIn changes
  }
}, [userId, isSignedIn, loadNotifications]);
```

**Impact**: 
- If user received notifications while app was in background/offline, they won't see the updated count until app is restarted
- The unread count becomes stale

---

### Issue #3: No AppState Listener in NotificationContext
**Location**: `mobile/src/context/NotificationContext.tsx`

**Problem**: 
The NotificationContext doesn't listen to `AppState` changes to reload notifications when the app comes to foreground. This means missed notifications while the app was in background are not synced.

**Missing**: 
- No `AppState.addEventListener` to detect when app comes to foreground
- No automatic notification reload when app becomes active

**Impact**: 
- Notifications received while app is in background are not reflected in the count until app restart
- Users must manually restart the app to see updates

---

### Issue #4: joinUserRoom Timing and Reliability
**Location**: `mobile/src/context/NotificationContext.tsx` (lines 104-110)

**Problem**: 
The `joinUserRoom` is called when `socket`, `isConnected`, or `userId` changes. However:
1. If socket reconnects quickly, the effect might not re-run
2. There's no guarantee `joinUserRoom` is called after socket is fully connected
3. The effect doesn't specifically react to socket reconnection events

**Current Code**:
```typescript
useEffect(() => {
  if (!socket || !isConnected || !userId) return;
  socket.emit('joinUserRoom', userId);  // Only runs when dependencies change
}, [socket, isConnected, userId]);
```

**Impact**: 
- User room might not be joined reliably after reconnection
- Race condition where notifications arrive before room is joined

---

### Issue #5: Socket Event Listeners May Not Be Attached in Time
**Location**: `mobile/src/context/NotificationContext.tsx` (lines 112-149)

**Problem**: 
Socket event listeners are attached when `isConnected` becomes true, but:
- There might be a timing issue where notifications arrive before listeners are attached
- The listeners depend on `socket`, `isConnected`, and `userId` - if any of these change during reconnection, listeners are removed and re-added, potentially missing notifications during that window

---

## Flow Diagram of Current Behavior

```
App Opens
  ↓
Socket Connects
  ↓
Backend auto-joins user to `user_${userId}` room ✅
NotificationContext loads notifications ✅
Socket listeners attached ✅
  ↓
App Goes to Background
  ↓
Socket Disconnects ❌
  ↓
App Returns to Foreground
  ↓
Socket Reconnects
  ↓
SocketService auto-rejoins conversations ✅
SocketService auto-rejoins posts ✅
SocketService does NOT rejoin user room ❌
  ↓
NotificationContext: joinUserRoom effect might run (timing dependent) ⚠️
NotificationContext: Does NOT reload notifications ❌
  ↓
Result: Notifications emitted to `user_${userId}` room but socket not in room
        → Notifications lost, count not updated
        → User only sees updates after app restart (which reloads from server)
```

## Backend Verification

**Backend automatically joins user room on initial connection**:
- `backend/src/index.ts` line 396: `socket.join(`user_${userId}`)`
- This happens automatically when user connects

**Backend emits notifications to user room**:
- `backend/src/utils/notification-utils.ts` line 62: `io.to(`user_${data.recipient}`).emit('newNotification', ...)`
- `backend/src/utils/notification-utils.ts` line 78: `io.to(`user_${data.recipient}`).emit('unreadCountUpdate', ...)`

**Backend handles joinUserRoom event**:
- `backend/src/index.ts` line 738: `socket.on('joinUserRoom', (userId) => { socket.join(`user_${userId}`) })`

So the backend is working correctly. The issue is purely on the mobile side.

---

## Why It Works After App Restart

When the app restarts:
1. Socket connects fresh
2. Backend automatically joins user to `user_${userId}` room (line 396)
3. NotificationContext loads notifications from server (line 99)
4. Socket listeners are attached
5. Everything works because it's a fresh connection

When app just returns from background:
1. Socket reconnects
2. Backend might auto-join again (if connection handler runs), but mobile might have timing issues
3. SocketService doesn't explicitly rejoin user room
4. NotificationContext doesn't reload notifications
5. Result: notifications lost

---

## Recommended Fixes

### Fix 1: Auto-Rejoin User Room on Socket Reconnection
Add user room rejoin in `useSocket.ts` when socket connects.

### Fix 2: Reload Notifications When Socket Reconnects
Add a listener in `NotificationContext` to detect socket reconnection and reload notifications.

### Fix 3: Add AppState Listener
Add AppState listener in `NotificationContext` to reload notifications when app comes to foreground.

### Fix 4: Ensure joinUserRoom is Called After Reconnection
Make sure `joinUserRoom` is called reliably after socket reconnects, possibly with a small delay to ensure socket is fully ready.

### Fix 5: Add Socket Reconnection Tracking
Track socket reconnection state to trigger notification reload and room rejoin.

---

## Summary

The core issue is that **socket reconnection doesn't properly restore notification functionality**. The socket disconnects when the app goes to background, and when it reconnects, it doesn't:
1. Rejoin the user room for notifications
2. Reload the notification count from the server
3. Handle AppState changes to sync missed notifications

This causes notifications to be lost in transit and the count to become stale, requiring an app restart to see updates.

