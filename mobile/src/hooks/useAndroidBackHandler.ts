import React, { useEffect } from 'react';
import { BackHandler, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

interface UseAndroidBackHandlerOptions {
  onBackPress?: () => boolean | void;
  showExitConfirmation?: boolean;
  exitConfirmationTitle?: string;
  exitConfirmationMessage?: string;
}

export const useAndroidBackHandler = (options: UseAndroidBackHandlerOptions = {}) => {
  const navigation = useNavigation();
  const {
    onBackPress,
    showExitConfirmation = true,
    exitConfirmationTitle = 'Exit App',
    exitConfirmationMessage = 'Are you sure you want to exit?'
  } = options;

  useFocusEffect(
    React.useCallback(() => {
      const handleBackPress = () => {
        // If custom handler is provided, use it
        if (onBackPress) {
          const result = onBackPress();
          if (result === true) {
            return true; // Prevent default back action
          }
          if (result === false) {
            return false; // Allow default back action
          }
        }

        // Check if we can go back in navigation stack
        if (navigation.canGoBack()) {
          // Let React Navigation handle the back action
          return false;
        }

        // We're at the root level, show exit confirmation
        if (showExitConfirmation) {
          Alert.alert(
            exitConfirmationTitle,
            exitConfirmationMessage,
            [
              {
                text: 'Cancel',
                style: 'cancel',
              },
              {
                text: 'Exit',
                style: 'destructive',
                onPress: () => BackHandler.exitApp(),
              },
            ],
            { cancelable: true }
          );
          return true; // Prevent default back action
        }

        // No confirmation, just exit
        BackHandler.exitApp();
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);

      return () => subscription.remove();
    }, [navigation, onBackPress, showExitConfirmation, exitConfirmationTitle, exitConfirmationMessage])
  );
};

// Hook for screens that should always allow back navigation
export const useAllowBackNavigation = () => {
  useFocusEffect(
    React.useCallback(() => {
      const handleBackPress = () => {
        // Always allow back navigation for these screens
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);

      return () => subscription.remove();
    }, [])
  );
};

// Hook for screens that should prevent back navigation
export const usePreventBackNavigation = (message?: string) => {
  useFocusEffect(
    React.useCallback(() => {
      const handleBackPress = () => {
        if (message) {
          Alert.alert('Cannot Go Back', message);
        }
        return true; // Prevent back navigation
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);

      return () => subscription.remove();
    }, [message])
  );
}; 