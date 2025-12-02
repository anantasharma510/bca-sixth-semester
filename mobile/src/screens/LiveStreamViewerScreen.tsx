/* 
 * COMMENTED OUT - Live streaming functionality disabled
 * This screen is for viewing live streams using Agora.io
 * To re-enable, uncomment this file
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../constants/colors';

interface LiveStreamViewerScreenProps {
  route: {
    params: {
      streamId: string;
    };
  };
  navigation: any;
}

export const LiveStreamViewerScreen: React.FC<LiveStreamViewerScreenProps> = ({
  route,
  navigation,
}) => {
  const { theme } = useTheme();
  const colors = getColors(theme);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <View style={[styles.content, { paddingTop: insets.top + 60, padding: 20 }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#ef4444" />
          <Text style={[styles.errorText, { color: colors.text.primary, marginTop: 16 }]}>
            Live streaming is disabled
          </Text>
          <Text style={[styles.errorText, { color: colors.text.secondary, marginTop: 8, fontSize: 14, textAlign: 'center' }]}>
            Live streaming functionality using Agora.io has been disabled.
            {'\n\n'}
            To re-enable this feature, restore the live streaming code.
          </Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.background.secondary, marginTop: 24 }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.backButtonText, { color: colors.text.primary }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
