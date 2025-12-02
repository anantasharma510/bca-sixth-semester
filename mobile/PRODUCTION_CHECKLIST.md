# 🚀 AIRWIG Mobile App - Production Publishing Checklist

## ✅ **Configuration Files Status**

### **app.config.ts** ✅
- [x] App name: AIRWIG
- [x] Bundle identifier: com.airwig.app
- [x] API URL: https://airwig.ca (HTTPS domain)
- [x] Clerk Frontend API: https://clerk.airwig.ca
- [x] Frontend URL: https://airwig.ca

### **app.json** ✅
- [x] App name: AIRWIG
- [x] Bundle identifier: com.airwig.app
- [x] Package name: com.airwig.app
- [x] Version: 1.0.2
- [x] Build number: 6
- [x] Version code: 6
- [x] Permissions configured
- [x] Info.plist descriptions added

### **eas.json** ⚠️ NEEDS UPDATES
- [ ] EAS project ID (replace "your-eas-project-id")
- [ ] Apple ID (replace "your-apple-id@email.com")
- [ ] App Store Connect App ID (replace "your-app-store-connect-app-id")
- [ ] Apple Team ID (replace "your-apple-team-id")
- [ ] Google Service Account JSON path

## 🔑 **Environment Variables Required**

Create a `.env` file in the mobile folder with:

```bash
# Clerk Authentication
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_actual_key_here
EXPO_PUBLIC_CLERK_FRONTEND_API=https://clerk.airwig.ca

# API URLs
EXPO_PUBLIC_API_URL=https://airwig.ca
EXPO_PUBLIC_FRONTEND_URL=https://airwig.ca
```

## 📱 **App Store Requirements**

### **iOS App Store**
- [ ] Apple Developer Account ($99/year)
- [ ] App Store Connect app created
- [ ] App icon (1024x1024)
- [ ] Screenshots for all device sizes
- [ ] App description & keywords
- [ ] Privacy policy URL
- [ ] Support URL

### **Google Play Store**
- [ ] Google Play Console account ($25 one-time)
- [ ] Play Console app created
- [ ] App icon (512x512)
- [ ] Feature graphic (1024x500)
- [ ] Screenshots for all device sizes
- [ ] App description
- [ ] Privacy policy URL

## 🚨 **Critical Issues to Fix Before Publishing**

1. **Update EAS project ID** in app.json
2. **Set up environment variables** (.env file)
3. **Get Clerk production credentials**
4. **Create app store listings**
5. **Test app with production backend**

## 🎯 **Next Steps**

1. **Run EAS setup:**
   ```bash
   cd social-media-app-main/mobile
   eas login
   eas build:configure
   ```

2. **Update EAS configuration** with real values

3. **Set environment variables**

4. **Test build:**
   ```bash
   eas build --platform android --profile production
   eas build --platform ios --profile production
   ```

5. **Submit to stores:**
   ```bash
   eas submit --platform android --profile production
   eas submit --platform ios --profile production
   ```

## 💰 **Costs**
- Apple Developer Program: $99/year
- Google Play Console: $25 (one-time)
- Total first year: $124

## ⏱️ **Timeline**
- Setup: 1-2 weeks
- App review: 1-7 days (iOS), 1-3 days (Android)
- Total: 2-3 weeks

---

**Status: 🟡 READY FOR SETUP - Need to complete EAS configuration and environment variables**
