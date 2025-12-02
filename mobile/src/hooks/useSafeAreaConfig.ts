import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';

interface SafeAreaConfig {
  top?: boolean;
  bottom?: boolean;
  left?: boolean;
  right?: boolean;
}

export const useSafeAreaConfig = (config: SafeAreaConfig = {}) => {
  const insets = useSafeAreaInsets();
  const {
    top = true,
    bottom = true,
    left = true,
    right = true
  } = config;

  return {
    paddingTop: top ? insets.top : 0,
    paddingBottom: bottom ? insets.bottom : 0,
    paddingLeft: left ? insets.left : 0,
    paddingRight: right ? insets.right : 0,
    safeAreaInsets: insets,
    isAndroid: Platform.OS === 'android',
    isIOS: Platform.OS === 'ios',
  };
};

// Hook specifically for screens with tab navigation
export const useSafeAreaForTabScreen = () => {
  const insets = useSafeAreaInsets();
  
  return {
    // Only apply top and side safe areas for tab screens
    // Bottom is handled by the tab navigator
    paddingTop: insets.top,
    paddingLeft: insets.left,
    paddingRight: insets.right,
    paddingBottom: 0, // Tab navigator handles this
    safeAreaInsets: insets,
  };
};

// Hook for full screen content (like modals)
export const useSafeAreaForFullScreen = () => {
  const insets = useSafeAreaInsets();
  
  return {
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
    paddingLeft: insets.left,
    paddingRight: insets.right,
    safeAreaInsets: insets,
  };
};

// Hook specifically for header components
export const useSafeAreaForHeader = () => {
  const insets = useSafeAreaInsets();
  
  return {
    // Only apply top safe area for headers (status bar)
    paddingTop: insets.top,
    paddingLeft: 0,
    paddingRight: 0,
    paddingBottom: 0,
    safeAreaInsets: insets,
  };
};

// Hook for screen content (below header)
export const useSafeAreaForContent = () => {
  const insets = useSafeAreaInsets();
  
  return {
    // Only apply side safe areas for content
    // Top is handled by header, bottom by tab navigator
    paddingTop: 0,
    paddingLeft: insets.left,
    paddingRight: insets.right,
    paddingBottom: 0,
    safeAreaInsets: insets,
  };
}; 