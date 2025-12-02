# 🚀 AIRWIG Mobile App Deployment Guide

## 📱 Complete Guide to Publish on App Store & Google Play Store

### **Phase 1: iOS App Store Publishing**

#### **1.1 Apple Developer Account Setup**
```bash
# Cost: $99/year
# Visit: https://developer.apple.com
# Sign up for Apple Developer Program
```

**Required:**
- Apple Developer Account ($99/year)
- Valid credit card
- Legal entity verification
- D-U-N-S number (for business accounts)

#### **1.2 iOS App Preparation**

1. **Update Bundle Identifier**
   - Current: `com.airwig.app`
   - Must be unique across App Store

2. **App Store Connect Setup**
   ```bash
   # Visit: https://appstoreconnect.apple.com
   # Create new app
   # Fill in app information:
   # - App Name: AIRWIG
   # - Bundle ID: com.airwig.app
   # - SKU: airwig-ios-001
   # - User Access: Full Access
   ```

3. **App Information Required:**
   - App description
   - Keywords
   - Screenshots (6.5" iPhone, 5.5" iPhone, 12.9" iPad)
   - App icon (1024x1024)
   - Privacy policy URL
   - Support URL

#### **1.3 Build & Submit iOS App**

```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Login to Expo
eas login

# Configure EAS (first time)
eas build:configure

# Build for iOS production
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios --profile production
```

---

### **Phase 2: Google Play Store Publishing**

#### **2.1 Google Play Console Setup**
```bash
# Cost: $25 (one-time)
# Visit: https://play.google.com/console
# Sign up for Google Play Console
```

**Required:**
- Google Play Console account ($25 one-time)
- Google account
- Developer verification

#### **2.2 Android App Preparation**

1. **Update Package Name**
   - Current: `com.airwig.app`
   - Must be unique across Play Store

2. **Play Console Setup**
   ```bash
   # Create new app
   # Fill in app information:
   # - App name: AIRWIG
   # - Package name: com.airwig.app
   # - App type: Application
   # - Free or paid: Free
   ```

3. **App Information Required:**
   - App description
   - Short description
   - Screenshots (phone, 7" tablet, 10" tablet)
   - Feature graphic (1024x500)
   - App icon (512x512)
   - Privacy policy URL

#### **2.3 Build & Submit Android App**

```bash
# Build for Android production
eas build --platform android --profile production

# Generate upload keystore (first time)
eas build:configure

# Submit to Play Store
eas submit --platform android --profile production
```

---

### **Phase 3: Production Backend Configuration**

#### **3.1 Update Backend Environment**
```bash
# SSH to your VPS: 137.184.175.9
ssh root@137.184.175.9

# Update backend environment variables
cd /path/to/your/backend
nano .env

# Set production values:
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://yourdomain.com
MOBILE_APP_URL=https://yourdomain.com
```

#### **3.2 SSL Certificate Setup**
```bash
# Install Certbot for SSL
sudo apt update
sudo apt install certbot

# Get SSL certificate for your domain
sudo certbot certonly --standalone -d yourdomain.com

# Configure Nginx with SSL
sudo nano /etc/nginx/sites-available/airwig
```

**Nginx SSL Configuration:**
```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

#### **3.3 Update Mobile App API URL**
```typescript
// In app.config.ts
apiUrl: 'https://yourdomain.com', // Use HTTPS with your domain
```

---

### **Phase 4: Pre-Publishing Checklist**

#### **4.1 App Store Requirements**
- [ ] App icon (1024x1024)
- [ ] Screenshots for all device sizes
- [ ] App description & keywords
- [ ] Privacy policy URL
- [ ] Support URL
- [ ] App review information
- [ ] Content rights declaration

#### **4.2 Play Store Requirements**
- [ ] App icon (512x512)
- [ ] Feature graphic (1024x500)
- [ ] Screenshots for all device sizes
- [ ] App description & short description
- [ ] Privacy policy URL
- [ ] Content rating questionnaire
- [ ] App signing setup

#### **4.3 Technical Requirements**
- [ ] HTTPS backend (SSL certificate)
- [ ] Production environment variables
- [ ] App version & build numbers
- [ ] Bundle identifiers unique
- [ ] Permissions properly configured
- [ ] Privacy policy compliance

---

### **Phase 5: Publishing Commands**

#### **5.1 Complete iOS Publishing**
```bash
# 1. Build iOS app
eas build --platform ios --profile production

# 2. Submit to App Store
eas submit --platform ios --profile production

# 3. Wait for Apple review (1-7 days)
# 4. App goes live on App Store
```

#### **5.2 Complete Android Publishing**
```bash
# 1. Build Android app
eas build --platform android --profile production

# 2. Submit to Play Store
eas submit --platform android --profile production

# 3. Wait for Google review (1-3 days)
# 4. App goes live on Play Store
```

---

### **Phase 6: Post-Publishing**

#### **6.1 Monitor & Analytics**
- [ ] App Store Connect analytics
- [ ] Google Play Console analytics
- [ ] Crash reporting setup
- [ ] User feedback monitoring

#### **6.2 Updates & Maintenance**
```bash
# For app updates:
# 1. Update version numbers
# 2. Build new version
# 3. Submit for review
# 4. Release to users
```

---

### **💰 Estimated Costs**
- **Apple Developer Program**: $99/year
- **Google Play Console**: $25 (one-time)
- **Domain & SSL**: $10-20/year
- **VPS Hosting**: $5-20/month

### **⏱️ Estimated Timeline**
- **Setup & Preparation**: 1-2 weeks
- **App Review Process**: 1-7 days (iOS), 1-3 days (Android)
- **Total Time to Live**: 2-3 weeks

---

### **🚨 Important Notes**

1. **Backend Security**: Ensure your VPS (137.184.175.9) is properly secured
2. **HTTPS Required**: Both app stores require HTTPS for production
3. **Privacy Policy**: Required for both stores
4. **App Review**: Follow store guidelines to avoid rejection
5. **Testing**: Test thoroughly before submission

### **📞 Support Resources**
- [Apple Developer Documentation](https://developer.apple.com/documentation/)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
- [Expo EAS Documentation](https://docs.expo.dev/eas/)
- [React Native Documentation](https://reactnative.dev/docs/publishing)

---

**Good luck with your app launch! 🚀**
