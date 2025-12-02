# AIRWIG Mobile App

A React Native mobile application for the AIRWIG social media platform, built with Expo and Clerk authentication.

## Features

- 🔐 **Clerk Authentication** - Secure user authentication and session management
- 📱 **Cross-Platform** - Works on both iOS and Android
- 🎨 **Modern UI** - Beautiful, responsive design with custom components
- 🔄 **Real-time Updates** - Live notifications and updates
- 🛡️ **Security** - Secure token storage and API communication
- 📊 **Type Safety** - Full TypeScript support

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (for iOS development) or Android Studio (for Android development)
- Clerk account and API keys

## Environment Setup

Before running the app, you need to set up your environment variables:

1. **Create a `.env` file** in the mobile directory:
```bash
# Clerk Configuration
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=your_actual_clerk_publishable_key_here

# API Configuration  
EXPO_PUBLIC_API_URL=http://localhost:5000
```

2. **Get your Clerk publishable key**:
   - Go to [Clerk Dashboard](https://dashboard.clerk.com/last-active?path=api-keys)
   - Copy your publishable key (starts with `pk_test_` or `pk_live_`)
   - Replace `your_actual_clerk_publishable_key_here` with your actual key

3. **Update API URL** if your backend is running on a different port or host

## Installation

1. **Install dependencies**:
```bash
npm install
```

2. **Start the development server**:
```bash
npx expo start
```

3. **Run on device/simulator**:
   - Press `a` for Android
   - Press `i` for iOS
   - Scan QR code with Expo Go app

## Project Structure

```
mobile/
├── src/
│   ├── components/     # Reusable UI components
│   ├── constants/      # App constants (colors, sizes)
│   ├── hooks/          # Custom React hooks
│   ├── screens/        # App screens
│   ├── services/       # API and external services
│   └── types/          # TypeScript type definitions
├── assets/             # Images, fonts, etc.
├── App.tsx            # Main app component
└── app.config.ts      # Expo configuration
```

## Key Components

### Authentication
- **ClerkProvider** - Wraps the app with Clerk authentication
- **useAuth Hook** - Custom hook for auth state management
- **AuthPromptScreen** - Sign-in/sign-up interface
- **SuspendedScreen** - Account suspension handling

### Navigation
- **NavigationContainer** - React Navigation setup
- **Stack Navigator** - Screen navigation
- **Tab Navigator** - Bottom tab navigation (coming soon)

### API Integration
- **API Client** - Axios-based HTTP client with retry logic
- **Token Management** - Automatic token handling for API calls
- **Error Handling** - Comprehensive error handling and user feedback

## Development

### Adding New Screens
1. Create screen component in `src/screens/`
2. Add to navigation in `App.tsx`
3. Update types if needed

### Styling
- Use the design system in `src/constants/`
- Follow the component patterns in `src/components/`
- Use TypeScript for type safety

### API Calls
- Use the API client in `src/services/api/`
- Handle loading and error states
- Use React Query for caching (coming soon)

## Troubleshooting

### Common Issues

1. **"Missing publishable key" error**:
   - Make sure you have a `.env` file with `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - Verify the key is correct in your Clerk dashboard

2. **Metro bundler cache issues**:
   ```bash
   npx expo start --clear
   ```

3. **Package version conflicts**:
   ```bash
   npx expo install --fix
   ```

4. **iOS build issues**:
   - Make sure you have Xcode installed
   - Run `npx expo run:ios` for native build

5. **Android build issues**:
   - Make sure you have Android Studio installed
   - Run `npx expo run:android` for native build

### Environment Variables
- All environment variables must start with `EXPO_PUBLIC_` to be accessible in the app
- Changes to `.env` require restarting the development server
- Never commit your actual API keys to version control

## Production Build

### Building for Production
```bash
# Build for iOS
npx expo build:ios

# Build for Android  
npx expo build:android
```

### Environment Setup for Production
- Use production Clerk keys (`pk_live_` instead of `pk_test_`)
- Set production API URL
- Configure app signing certificates

## Profile Management Configuration

The mobile app now supports editing Clerk-managed profile fields (first name, last name, username) directly within the app. 

### Required Environment Variables

Add the following to your `.env` file:

```
# Existing variables
EXPO_PUBLIC_API_URL=http://your-backend-url:5000
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key

# New variable for profile management
EXPO_PUBLIC_CLERK_FRONTEND_API=https://your-app.clerk.accounts.dev
```

Replace `your-app.clerk.accounts.dev` with your actual Clerk frontend API domain. You can find this in your Clerk dashboard under "API Keys" -> "Frontend API".

### Password Changes

Password changes are handled by redirecting to Clerk's secure web interface. When users tap "Change Password", they will be redirected to their browser to complete the password change process.

## Contributing

1. Follow the existing code structure
2. Use TypeScript for all new code
3. Add proper error handling
4. Test on both iOS and Android
5. Update documentation as needed

## License

This project is part of the AIRWIG social media platform. 