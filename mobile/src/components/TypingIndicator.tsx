import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

interface TypingIndicatorProps {
  typingUsers: string[];
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ typingUsers }) => {
  if (!typingUsers || typingUsers.length === 0) return null;
  // TODO: show user names if available
  return (
    <View style={styles.container}>
      <Text style={styles.text} accessibilityLabel="Typing indicator">
        {typingUsers.length === 1 ? 'Typing...' : 'Multiple people typing...'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 8, alignItems: 'flex-start' },
  text: { fontSize: 14, color: Colors.text.secondary, fontStyle: 'italic' },
}); 