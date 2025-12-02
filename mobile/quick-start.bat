@echo off
echo 🚀 AIRWIG Mobile App Publishing - Quick Start
echo ==============================================

REM Check if EAS CLI is installed
where eas >nul 2>nul
if %errorlevel% neq 0 (
    echo 📦 Installing EAS CLI...
    npm install -g @expo/eas-cli
) else (
    echo ✅ EAS CLI already installed
)

REM Check if logged in to Expo
echo 🔐 Checking Expo login status...
eas whoami >nul 2>nul
if %errorlevel% neq 0 (
    echo ⚠️  Not logged in to Expo. Please run:
    echo    eas login
    echo.
    echo 📝 Then run this script again
    pause
    exit /b 1
) else (
    echo ✅ Logged in to Expo
)

REM Configure EAS build
echo ⚙️  Configuring EAS build...
eas build:configure

REM Show next steps
echo.
echo 🎯 NEXT STEPS:
echo ==============
echo.
echo 1. 📱 iOS App Store:
echo    - Sign up for Apple Developer Program ($99/year)
echo    - Visit: https://developer.apple.com
echo    - Create app in App Store Connect
echo    - Run: eas build --platform ios --profile production
echo.
echo 2. 🤖 Google Play Store:
echo    - Sign up for Google Play Console ($25 one-time)
echo    - Visit: https://play.google.com/console
echo    - Create app in Play Console
echo    - Run: eas build --platform android --profile production
echo.
echo 3. 🌐 Backend Setup:
echo    - SSH to your VPS: ssh root@137.184.175.9
echo    - Set up SSL certificate for HTTPS
echo    - Update environment variables
echo.
echo 4. 📋 Complete the checklist in DEPLOYMENT_GUIDE.md
echo.
echo 💰 Total estimated cost: $124 (first year)
echo ⏱️  Estimated timeline: 2-3 weeks
echo.
echo 🚀 Ready to launch AIRWIG! 🎉
pause
