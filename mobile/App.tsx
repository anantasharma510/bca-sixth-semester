import './src/utils/polyfills';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/MainTabNavigator';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { ThemeProvider } from './src/context/ThemeContext';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { NotificationProvider } from './src/context/NotificationContext';
import { AuthProvider } from './src/context/AuthContext';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/lib/queryClient';

export default function App() {
  // Configure Android navigation bar
  useEffect(() => {
    // Complete pending auth sessions for Expo AuthSession-based flows (Better Auth OAuth)
    WebBrowser.maybeCompleteAuthSession();

    if (Platform.OS === 'android') {
      // Set navigation bar to transparent to work with safe area
      NavigationBar.setBackgroundColorAsync('transparent');
      NavigationBar.setButtonStyleAsync('dark');
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationProvider>
          <SafeAreaProvider initialMetrics={initialWindowMetrics}>
            <StatusBar style="auto" />
            <ThemeProvider>
              <ActionSheetProvider>
                <NavigationContainer>
                  <RootNavigator />
                </NavigationContainer>
              </ActionSheetProvider>
            </ThemeProvider>
          </SafeAreaProvider>
        </NotificationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
