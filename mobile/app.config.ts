import { ExpoConfig, ConfigContext } from 'expo/config';

// NOTE: Use extra.apiUrl as the single source of truth for API_BASE_URL throughout the app.
export default ({ config }: ConfigContext): ExpoConfig => {
  return {
    ...config,
    name: 'HamroCircle',
    slug: 'hamro-circle-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/logo.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/logo.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff'
    },
    scheme: '空中维格',
    assetBundlePatterns: [
      '/*'
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.airwig.app',
      buildNumber: '1',
      infoPlist: {
        NSCameraUsageDescription: 'This app needs access to camera to take photos for posts.',
        NSPhotoLibraryUsageDescription: 'This app needs access to photo library to select photos and videos for posts.',
        NSMicrophoneUsageDescription: 'This app needs access to microphone for video recording.',
        // Additional iPad-specific permissions and configurations
        UISupportedInterfaceOrientations: ['UIInterfaceOrientationPortrait', 'UIInterfaceOrientationLandscapeLeft', 'UIInterfaceOrientationLandscapeRight'],
        UISupportedInterfaceOrientations_iPad: ['UIInterfaceOrientationPortrait', 'UIInterfaceOrientationPortraitUpsideDown', 'UIInterfaceOrientationLandscapeLeft', 'UIInterfaceOrientationLandscapeRight'],
        // Enhanced iPad-specific configurations for stability
        UILaunchStoryboardName: 'LaunchScreen',
        UIDeviceFamily: [1, 2], // iPhone and iPad
        // Prevent iPad-specific crashes
        UIRequiredDeviceCapabilities: ['armv7'],
        // Additional iPad stability settings
        UIStatusBarStyle: 'UIStatusBarStyleDefault',
        UIViewControllerBasedStatusBarAppearance: true,
        // Encryption compliance
        ITSAppUsesNonExemptEncryption: false
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/logo.png',
        backgroundColor: '#FFFFFF'
      },
      edgeToEdgeEnabled: true,
      package: 'com.airwig.app',
      versionCode: 1,
      icon: './assets/logo.png'
    },
    web: {
      favicon: './assets/clogo.png',
      meta: {
        viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
    },
    extra: {
      // Use backend machine IP for Expo Go on the same Wi‑Fi
      apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://192.168.101.2:5000/api',
      frontendUrl: process.env.EXPO_PUBLIC_FRONTEND_URL || '',
      // Hard-coded Stripe publishable key for mobile (test mode)
      stripePublishableKey:
        process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
        'pk_test_51SZtPRR7OrapfddMuWCjpnqrQeQQj5bOl8c2O7aekVo0jn5ROqoN977JJlh9c9uIAa2OGFbyuWh85M5g5YkwE0Qj00uBf4CrBN',
      eas: {
        projectId: '69a26088-8f04-4064-b9a7-968e9890e564',
      },
    },
  };
};