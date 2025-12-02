# EAS Build Guide - Android APK for Live Streaming Testing

This guide will help you build an Android APK using EAS (Expo Application Services) to test live streaming features.

## Prerequisites

- Expo account (free account is fine)
- EAS CLI installed globally
- Android device or emulator for testing

## Step-by-Step Instructions

### 1. Install EAS CLI (if not already installed)

```bash
npm install -g eas-cli
```

### 2. Login to EAS

Navigate to the mobile directory and login:

```bash
cd mobile
eas login
```

This will:
- Open your browser to login to Expo
- Or prompt you to enter your Expo credentials in the terminal
- Link your account to EAS

**Note:** If you're already logged in, you can check with:
```bash
eas whoami
```

### 3. Configure EAS (Already Done ✅)

Your `eas.json` is already configured with a `preview` profile that builds APK files for internal distribution - perfect for testing!

### 4. Build Standalone Android APK

Build a **standalone APK** that runs directly (no Metro server needed) using the preview profile:

```bash
cd mobile
eas build --platform android --profile preview
```

**To clear cache (recommended for fixing version mismatches like Worklets):**

```bash
cd mobile
eas build --platform android --profile preview --clear-cache
```

**What's the difference between profiles?**

- **`development`**: Development client (requires Metro server) - for active development
- **`preview`**: **Standalone APK** (bundles all code, runs directly) - for testing
- **`production`**: Production build (AAB for Play Store) - for release

**This will:**
- Upload your project to EAS servers
- **Bundle all JavaScript code into the APK** (no Metro server needed!)
- **Clear all cached build artifacts** (if using --clear-cache flag)
- Build a standalone Android APK in the cloud
- Take about 15-20 minutes (first build after clearing cache)
- Give you a download link when complete
- **You can install and run it directly without any development server!**

### 5. Alternative: Build Locally (Faster, but requires setup)

If you want to build locally (requires Android SDK setup):

```bash
cd mobile
eas build --platform android --profile preview --local
```

**Note:** Local builds are faster but require:
- Android SDK installed
- Java Development Kit (JDK)
- More setup complexity

### 6. Download and Install APK

After the build completes:
1. EAS will provide a download link (or QR code)
2. Download the APK file
3. Transfer to your Android device
4. Enable "Install from Unknown Sources" in Android settings
5. Install the APK

**⚠️ IMPORTANT: After Installing the Development Build**

When you first open the installed app, you'll see a **"Development Build" screen with a QR code** asking you to connect to a development server. This is **NORMAL** - the app you installed is just a container that needs to connect to your Metro bundler server to load your app code.

### 6.5. Development Build vs Standalone Build

**If you built with `--profile development`** (development client):
- You'll see a "Development Build" screen asking to connect to Metro server
- You need to start Metro server: `npm start` or `npx expo start --dev-client`
- Connect your phone to the same WiFi and scan QR code
- **Use this for active development with hot reload**

**If you built with `--profile preview`** (standalone APK):
- **No Metro server needed!**
- Just install and open the APK - your app runs directly
- **Use this for testing/standalone builds**

### 7. Test Live Streaming

Once installed:
1. Open the app
2. Sign in with your account
3. Go to Create Post screen
4. Click the "Go Live" button
5. Allow camera/microphone permissions when prompted
6. Enter stream title and description
7. Click "Start Live Stream"
8. Test video/audio controls
9. End stream when done

## Troubleshooting

### Clearing Build Cache (For Version Mismatches)

**When to clear cache:**
- Worklets version mismatch errors (e.g., "Mismatch between JavaScript part and native part of Worklets")
- Native module version conflicts
- After updating native dependencies
- When build behaves unexpectedly

**Clear cache and rebuild:**

```bash
cd mobile

# Clear local cache first (recommended)
rm -rf node_modules
npm install

# Clear Metro bundler cache
npx expo start --clear

# Build with --clear-cache flag (clears EAS server cache)
eas build --platform android --profile development --clear-cache
```

**For local builds:**
```bash
# Clear everything and rebuild locally
cd mobile
rm -rf node_modules
npm install
eas build --platform android --profile development --local --clear-cache
```

### Build Errors

If you get build errors:
1. Check your `app.config.ts` is valid
2. Ensure all dependencies are installed: `npm install`
3. Check `eas.json` configuration
4. Try clearing cache: `eas build --platform android --profile development --clear-cache`

### Permission Issues

If camera/microphone don't work:
1. Check device settings: Settings → Apps → Your App → Permissions
2. Ensure AndroidManifest.xml has CAMERA and RECORD_AUDIO permissions (already added ✅)

### Native Module Issues

If Agora doesn't work:
- Make sure you're NOT using Expo Go (it doesn't support native modules)
- You MUST use an APK built with EAS (development build)
- The APK includes native modules like `react-native-agora`

## Build Profiles

Your `eas.json` has three profiles:

- **development**: Development build with Expo Dev Tools
- **preview**: APK file for testing (what we're using)
- **production**: Production build (AAB for Play Store)

## Quick Reference Commands

```bash
# Login
eas login

# Check login status
eas whoami

# Build APK for testing
eas build --platform android --profile preview

# Build with cache cleared (for fixing version mismatches)
eas build --platform android --profile development --clear-cache

# Build APK locally (faster)
eas build --platform android --profile preview --local

# Build locally with cache cleared
eas build --platform android --profile development --local --clear-cache

# View build status
eas build:list

# Download build
eas build:view
```

## Important Notes

⚠️ **Native Modules**: Since you're using `react-native-agora`, you MUST use a development build (EAS build), NOT Expo Go. The APK built with EAS includes all native modules.

⚠️ **Build Time**: First build takes longer (15-20 min). Subsequent builds are faster (10-15 min) due to caching.

⚠️ **API URL**: Your app is configured to use `https://chinese-airwig-production-0d2d.up.railway.app/api` - make sure your backend is running!

## Next Steps

After testing with the preview APK:
1. Fix any issues found
2. Build again with: `eas build --platform android --profile preview`
3. Test thoroughly
4. When ready, build production version: `eas build --platform android --profile production`

