#!/bin/bash

echo "🚀 AIRWIG Mobile App Publishing - Quick Start"
echo "=============================================="

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "📦 Installing EAS CLI..."
    npm install -g @expo/eas-cli
else
    echo "✅ EAS CLI already installed"
fi

# Check if logged in to Expo
echo "🔐 Checking Expo login status..."
if ! eas whoami &> /dev/null; then
    echo "⚠️  Not logged in to Expo. Please run:"
    echo "   eas login"
    echo ""
    echo "📝 Then run this script again"
    exit 1
else
    echo "✅ Logged in to Expo"
fi

# Configure EAS build
echo "⚙️  Configuring EAS build..."
eas build:configure

# Show next steps
echo ""
echo "🎯 NEXT STEPS:"
echo "=============="
echo ""
echo "1. 📱 iOS App Store:"
echo "   - Sign up for Apple Developer Program ($99/year)"
echo "   - Visit: https://developer.apple.com"
echo "   - Create app in App Store Connect"
echo "   - Run: eas build --platform ios --profile production"
echo ""
echo "2. 🤖 Google Play Store:"
echo "   - Sign up for Google Play Console ($25 one-time)"
echo "   - Visit: https://play.google.com/console"
echo "   - Create app in Play Console"
echo "   - Run: eas build --platform android --profile production"
echo ""
echo "3. 🌐 Backend Setup:"
echo "   - SSH to your VPS: ssh root@137.184.175.9"
echo "   - Set up SSL certificate for HTTPS"
echo "   - Update environment variables"
echo ""
echo "4. 📋 Complete the checklist in DEPLOYMENT_GUIDE.md"
echo ""
echo "💰 Total estimated cost: $124 (first year)"
echo "⏱️  Estimated timeline: 2-3 weeks"
echo ""
echo "🚀 Ready to launch AIRWIG! 🎉"
