import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../context/ThemeContext';
import { getColors } from '../../../constants/colors';

interface CreationHeaderProps {
  title: string;
  rightLabel?: string;
  onBack?: () => void;
  onRightPress?: () => void;
  rightDisabled?: boolean;
}

export const CreationHeader: React.FC<CreationHeaderProps> = ({
  title,
  rightLabel,
  onBack,
  onRightPress,
  rightDisabled,
}) => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const colors = getColors(theme);

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 12,
          backgroundColor: colors.background.primary,
          borderBottomColor: theme === 'light' ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.06)',
          shadowColor: '#0f172a',
        },
      ]}
    >
      <View style={styles.inner}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.iconButton}
          onPress={onBack}
          activeOpacity={0.8}
        >
          <Feather
            name="arrow-left"
            size={22}
            color={colors.text.primary}
          />
        </TouchableOpacity>

        <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={rightLabel}
          style={[
            styles.iconButton,
            rightDisabled && { opacity: 0.4 },
          ]}
          onPress={rightDisabled ? undefined : onRightPress}
          activeOpacity={0.9}
        >
          {rightLabel ? (
            <Text
              style={[
                styles.rightLabel,
                {
                  color: rightDisabled ? colors.text.muted : '#FF6B2C',
                },
              ]}
            >
              {rightLabel}
            </Text>
          ) : (
            <Feather
              name="more-horizontal"
              size={22}
              color={colors.text.secondary}
            />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: Platform.OS === 'ios' ? StyleSheet.hairlineWidth : 0.5,
    shadowOpacity: Platform.OS === 'ios' ? 0.08 : 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  inner: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  rightLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});


