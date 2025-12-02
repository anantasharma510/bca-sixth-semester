# Better Auth Testing Guide

## Quick Test Commands

### 1. Start Server
```bash
cd backend
npm run dev
```

### 2. Test Health Endpoint
```bash
curl http://localhost:5000/api/auth/ok
```
**Expected:** `{"ok":true}`

### 3. Sign Up a User
```bash
curl -X POST http://localhost:5000/api/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }' \
  -v
```
**Expected:** 
- Status: 200 or 201
- `Set-Cookie` header with `better-auth.session_token`
- User created in MongoDB

### 4. Sign In
```bash
curl -X POST http://localhost:5000/api/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }' \
  -c cookies.txt \
  -v
```
**Expected:**
- Status: 200
- `Set-Cookie` header
- Cookie saved to `cookies.txt`

### 5. Test Protected Route
```bash
curl http://localhost:5000/api/protected \
  -b cookies.txt \
  -v
```
**Expected:**
- Status: 200
- JSON response with user data
- User created in MongoDB if first time

### 6. Test Session Endpoint
```bash
curl http://localhost:5000/api/auth/session \
  -b cookies.txt
```
**Expected:**
- Status: 200
- Session data with user info

### 7. Sign Out
```bash
curl -X POST http://localhost:5000/api/auth/sign-out \
  -b cookies.txt
```
**Expected:**
- Status: 200
- Cookie cleared

---

## Testing with Postman/Insomnia

### Sign Up
1. Method: `POST`
2. URL: `http://localhost:5000/api/auth/sign-up`
3. Headers: `Content-Type: application/json`
4. Body:
```json
{
  "email": "test@example.com",
  "password": "password123",
  "name": "Test User"
}
```

### Sign In
1. Method: `POST`
2. URL: `http://localhost:5000/api/auth/sign-in`
3. Headers: `Content-Type: application/json`
4. Body:
```json
{
  "email": "test@example.com",
  "password": "password123"
}
```
5. **Important:** Check "Save cookies" or copy the `Set-Cookie` header value

### Protected Route
1. Method: `GET`
2. URL: `http://localhost:5000/api/protected`
3. Headers: 
   - `Cookie: better-auth.session_token=<value-from-sign-in>`
   - Or use cookie manager in Postman/Insomnia

---

## Common Issues

### "Better Auth not initialized"
- **Cause:** MongoDB not connected
- **Fix:** Ensure `connectDB()` is called before `initializeAuth()`
- **Check:** Server logs should show "MongoDB connected" before "Better Auth initialized"

### "Invalid session"
- **Cause:** Cookie not sent or expired
- **Fix:** 
  - Make sure cookies are enabled in your client
  - Check that `credentials: true` is set in CORS
  - Verify cookie is being sent in requests

### "User not found"
- **Cause:** User not created in MongoDB
- **Fix:** 
  - Check MongoDB connection
  - Check User model schema
  - Look for errors in console

### "Cannot find module 'better-auth'"
- **Cause:** Package not installed
- **Fix:** Run `npm install` in backend directory

---

## Verification Checklist

After testing, verify:

- [ ] Better Auth health endpoint returns `{"ok":true}`
- [ ] Can sign up new user
- [ ] User appears in MongoDB `users` collection
- [ ] Can sign in with email/password
- [ ] Session cookie is set
- [ ] Protected route `/api/protected` works with cookie
- [ ] User data is returned correctly
- [ ] Admin routes work (if you have admin user)
- [ ] Socket.IO connects with cookies
- [ ] All API endpoints work

---

## Database Verification

Check MongoDB to verify:

```javascript
// Connect to MongoDB
use your_database_name

// Check Better Auth collections
db.getCollectionNames()
// Should include: better-auth_user, better-auth_session, better-auth_account

// Check your User collection
db.users.find()
// Should show users with betterAuthUserId field

// Check a specific user
db.users.findOne({ email: "test@example.com" })
// Should show betterAuthUserId linking to better-auth_user collection
```

---

## Next Steps After Testing

1. ✅ Verify all endpoints work
2. ✅ Test with multiple users
3. ✅ Test admin functionality
4. ✅ Test Socket.IO real-time features
5. ✅ Update mobile app to use Better Auth
6. ✅ Update frontend to use Better Auth
7. ✅ Remove Clerk dependencies completely

---

**Happy Testing!** 🚀

