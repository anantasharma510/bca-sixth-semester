import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Colors, getColors } from '../constants/colors';
import Icon from 'react-native-vector-icons/Feather';
import { useTheme } from '../context/ThemeContext';

interface MessageInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  sending?: boolean;
  placeholder?: string;
  disabled?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  value,
  onChangeText,
  onSend,
  sending,
  placeholder = 'Type a message...',
  disabled,
  onFocus,
  onBlur,
}) => {
  const { theme } = useTheme();
  const colors = getColors(theme);
  return (
    <View style={[styles.inputContainer, { 
      borderColor: colors.border.light, 
      backgroundColor: colors.background.primary 
    }]}>
      {/* TODO: emoji picker, file/image/video upload, reply/edit UI */}
      <TextInput
        style={[styles.input, { 
          backgroundColor: colors.background.secondary, 
          color: colors.text.primary 
        }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.text.secondary}
        editable={!sending && !disabled}
        onSubmitEditing={onSend}
        returnKeyType="send"
        onFocus={onFocus}
        onBlur={onBlur}
        accessibilityLabel="Message input"
      />
      <TouchableOpacity
        style={styles.sendButton}
        onPress={onSend}
        disabled={sending || !value.trim() || disabled}
        accessibilityLabel="Send message"
      >
        {sending ? (
          <ActivityIndicator size="small" color={Colors.primary[500]} />
        ) : (
          <Icon name="send" size={22} color={sending || !value.trim() || disabled ? colors.neutral[400] : Colors.primary[500]} />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderTopWidth: 1,
    // borderColor and backgroundColor will be set dynamically
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 10,
    borderRadius: 20,
    // backgroundColor and color will be set dynamically
    marginRight: 8,
  },
  sendButton: {
    padding: 8,
    borderRadius: 20,
  },
}); 