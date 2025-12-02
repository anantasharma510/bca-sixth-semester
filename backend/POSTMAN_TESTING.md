# Postman Testing Guide - Better Auth Signup & Login

## 🔐 Better Auth Endpoints

Better Auth automatically provides these endpoints at `/api/auth/*`:

---

## 1. ✅ Health Check (Test First!)

**Method:** `GET`  
**URL:** `http://localhost:5000/api/auth/ok`

**Headers:** None needed

**Expected Response:**
```json
{
  "ok": true
}
```

**Status Code:** `200 OK`

---

## 2. 📝 Sign Up (Create New User)

**Method:** `POST`  
**URL:** `http://localhost:5000/api/auth/sign-up`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "email": "test@example.com",
  "password": "password123",
  "name": "Test User"
}
```

**Expected Response:**
```json
{
  "user": {
    "id": "cm3abc123xyz",
    "email": "test@example.com",
    "name": "Test User",
    "emailVerified": false,
    "image": null,
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "session": {
    "id": "session_abc123",
    "expiresAt": "2024-01-08T00:00:00.000Z",
    "token": "session_token_here",
    "ipAddress": "::1",
    "userAgent": "PostmanRuntime/7.32.3"
  }
}
```

**Status Code:** `200 OK` or `201 Created`

**Important:** 
- Check the **Response Headers** for `Set-Cookie: better-auth.session_token=...`
- Save this cookie for authenticated requests!

---

## 3. 🔑 Sign In (Login)

**Method:** `POST`  
**URL:** `http://localhost:5000/api/auth/sign-in`

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "email": "test@example.com",
  "password": "password123"
}
```

**Expected Response:**
```json
{
  "user": {
    "id": "cm3abc123xyz",
    "email": "test@example.com",
    "name": "Test User",
    "emailVerified": false,
    "image": null,
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "session": {
    "id": "session_abc123",
    "expiresAt": "2024-01-08T00:00:00.000Z",
    "token": "session_token_here",
    "ipAddress": "::1",
    "userAgent": "PostmanRuntime/7.32.3"
  }
}
```

**Status Code:** `200 OK`

**Important:**
- Check **Response Headers** for `Set-Cookie: better-auth.session_token=...`
- Copy this cookie value for protected routes!

---

## 4. 👤 Get Current Session

**Method:** `GET`  
**URL:** `http://localhost:5000/api/auth/session`

**Headers:**
```
Cookie: better-auth.session_token=<cookie-value-from-sign-in>
```

**OR in Postman:**
- Go to **Cookies** tab
- Add cookie: `better-auth.session_token` = `<value>`
- Domain: `localhost`
- Path: `/`

**Expected Response:**
```json
{
  "user": {
    "id": "cm3abc123xyz",
    "email": "test@example.com",
    "name": "Test User",
    "emailVerified": false,
    "image": null,
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "session": {
    "id": "session_abc123",
    "expiresAt": "2024-01-08T00:00:00.000Z"
  }
}
```

**Status Code:** `200 OK`

---

## 5. 🔒 Test Protected Route

**Method:** `GET`  
**URL:** `http://localhost:5000/api/protected`

**Headers:**
```
Cookie: better-auth.session_token=<cookie-value-from-sign-in>
```

**Expected Response:**
```json
{
  "message": "You are authenticated!",
  "user": {
    "_id": "cm3abc123xyz",
    "username": "test",
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User",
    "followerCount": 0,
    "followingCount": 0,
    "postCount": 0,
    "role": "user",
    "status": "active"
  }
}
```

**Status Code:** `200 OK`

---

## 6. 🚪 Sign Out

**Method:** `POST`  
**URL:** `http://localhost:5000/api/auth/sign-out`

**Headers:**
```
Cookie: better-auth.session_token=<cookie-value>
```

**Expected Response:**
```json
{
  "message": "Signed out successfully"
}
```

**Status Code:** `200 OK`

---

## 📋 Postman Setup Instructions

### Step 1: Create Environment (Optional but Recommended)

1. Click **Environments** → **+**
2. Name: `Better Auth Local`
3. Add variables:
   - `base_url`: `http://localhost:5000`
   - `cookie`: (leave empty, will be set automatically)

### Step 2: Create Collection

1. Click **Collections** → **+**
2. Name: `Better Auth Tests`

### Step 3: Create Requests

#### Request 1: Health Check
- **Name:** `Health Check`
- **Method:** `GET`
- **URL:** `{{base_url}}/api/auth/ok`

#### Request 2: Sign Up
- **Name:** `Sign Up`
- **Method:** `POST`
- **URL:** `{{base_url}}/api/auth/sign-up`
- **Headers:**
  - `Content-Type`: `application/json`
- **Body:** (select **raw** → **JSON**)
```json
{
  "email": "test@example.com",
  "password": "password123",
  "name": "Test User"
}
```

#### Request 3: Sign In
- **Name:** `Sign In`
- **Method:** `POST`
- **URL:** `{{base_url}}/api/auth/sign-in`
- **Headers:**
  - `Content-Type`: `application/json`
- **Body:** (select **raw** → **JSON**)
```json
{
  "email": "test@example.com",
  "password": "password123"
}
```

#### Request 4: Get Session
- **Name:** `Get Session`
- **Method:** `GET`
- **URL:** `{{base_url}}/api/auth/session`
- **Headers:**
  - `Cookie`: `better-auth.session_token={{cookie}}`

#### Request 5: Protected Route
- **Name:** `Protected Route`
- **Method:** `GET`
- **URL:** `{{base_url}}/api/protected`
- **Headers:**
  - `Cookie`: `better-auth.session_token={{cookie}}`

---

## 🔧 Postman Cookie Setup (Automatic)

### Option 1: Use Postman Cookie Manager

1. After **Sign In** request, go to **Cookies** tab
2. Click **Manage Cookies**
3. Find `localhost:5000`
4. You should see `better-auth.session_token`
5. Postman will automatically send it with requests!

### Option 2: Manual Cookie Header

1. After **Sign In**, check **Response Headers**
2. Find `Set-Cookie: better-auth.session_token=abc123...`
3. Copy the value after `=`
4. Add to **Headers** tab:
   - Key: `Cookie`
   - Value: `better-auth.session_token=<pasted-value>`

### Option 3: Use Postman Script (Automatic)

Add this to **Sign In** request → **Tests** tab:

```javascript
// Extract cookie from response
const cookies = pm.response.headers.get("Set-Cookie");
if (cookies) {
    const sessionCookie = cookies.match(/better-auth\.session_token=([^;]+)/);
    if (sessionCookie) {
        pm.environment.set("cookie", sessionCookie[1]);
        console.log("Cookie saved:", sessionCookie[1]);
    }
}
```

Then use `{{cookie}}` in other requests!

---

## 📝 Complete Test Flow

### 1. Test Health
```
GET http://localhost:5000/api/auth/ok
```
✅ Should return: `{"ok":true}`

### 2. Sign Up
```
POST http://localhost:5000/api/auth/sign-up
Body: {
  "email": "newuser@example.com",
  "password": "password123",
  "name": "New User"
}
```
✅ Should return user and session data  
✅ Check for `Set-Cookie` header

### 3. Sign In
```
POST http://localhost:5000/api/auth/sign-in
Body: {
  "email": "newuser@example.com",
  "password": "password123"
}
```
✅ Should return user and session data  
✅ **Copy the cookie value!**

### 4. Test Protected Route
```
GET http://localhost:5000/api/protected
Headers: Cookie: better-auth.session_token=<cookie-value>
```
✅ Should return your user data  
✅ User should be created in MongoDB automatically

### 5. Get Session
```
GET http://localhost:5000/api/auth/session
Headers: Cookie: better-auth.session_token=<cookie-value>
```
✅ Should return current session info

---

## ⚠️ Common Issues

### Issue: "Better Auth not initialized"
**Solution:** 
- Make sure MongoDB is connected
- Check server logs for "MongoDB connected"
- Check server logs for "Better Auth initialized"

### Issue: "Invalid email or password"
**Solution:**
- Make sure you signed up first
- Check email format is valid
- Password must be at least 8 characters (Better Auth default)

### Issue: "Session not found"
**Solution:**
- Make sure you copied the full cookie value
- Cookie format: `better-auth.session_token=abc123...`
- Include the entire value after `=`

### Issue: "CORS error"
**Solution:**
- Make sure CORS is configured in your server
- Check `FRONTEND_URL` in `.env`
- Better Auth CORS is configured in `auth.ts`

---

## 🎯 Quick Test Commands (cURL)

If you prefer command line:

```bash
# 1. Health check
curl http://localhost:5000/api/auth/ok

# 2. Sign up
curl -X POST http://localhost:5000/api/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}' \
  -c cookies.txt \
  -v

# 3. Sign in
curl -X POST http://localhost:5000/api/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt \
  -v

# 4. Protected route (uses saved cookies)
curl http://localhost:5000/api/protected \
  -b cookies.txt

# 5. Get session
curl http://localhost:5000/api/auth/session \
  -b cookies.txt
```

---

## ✅ Success Indicators

You'll know it's working when:

1. ✅ Health check returns `{"ok":true}`
2. ✅ Sign up creates user and returns session
3. ✅ Sign in returns session with cookie
4. ✅ Protected route returns your user data
5. ✅ User appears in MongoDB `users` collection
6. ✅ Better Auth collections created in MongoDB

---

## 📊 Expected MongoDB Collections

After first signup, you should see:

- `better-auth_user` - Better Auth user records
- `better-auth_session` - Active sessions
- `better-auth_account` - Account linking
- `users` - Your app's user records (with `betterAuthUserId`)

---

**Ready to test!** 🚀

Start your server with `npm run dev` and try the endpoints above!

