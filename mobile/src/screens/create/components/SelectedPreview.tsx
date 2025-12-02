import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Video, ResizeMode } from 'expo-av';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { SelectedMediaItem } from '../types';
import { useTheme } from '../../../context/ThemeContext';
import { getColors } from '../../../constants/colors';

interface SelectedPreviewProps {
  asset?: SelectedMediaItem;
  placeholderLabel?: string;
  onPlaceholderPress?: () => void;
}

export const SelectedPreview: React.FC<SelectedPreviewProps> = ({
  asset,
  placeholderLabel = 'Choose moments to share',
  onPlaceholderPress,
}) => {
  const scale = useSharedValue(0.96);
  const opacity = useSharedValue(0);
  const { theme } = useTheme();
  const colors = getColors(theme);

  useEffect(() => {
    scale.value = 0.96;
    opacity.value = 0;
    scale.value = withSpring(1, { damping: 14, stiffness: 160 });
    opacity.value = withSpring(1, { damping: 18, stiffness: 150 });
  }, [asset?.id, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!asset) {
    const Wrapper = onPlaceholderPress ? TouchableOpacity : View;
    return (
      <Wrapper
        style={[
          styles.placeholder,
          {
            backgroundColor: colors.background.secondary,
            borderColor: theme === 'light' ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.08)',
          },
        ]}
        onPress={onPlaceholderPress}
        activeOpacity={onPlaceholderPress ? 0.85 : undefined}
      >
        <Feather name="image" size={48} color={colors.text.muted} />
        <Text style={[styles.placeholderTitle, { color: colors.text.primary }]}>
          Select media
        </Text>
        <Text style={[styles.placeholderSubtitle, { color: colors.text.secondary }]}>
          {placeholderLabel}
        </Text>
      </Wrapper>
    );
  }

  const isVideo = asset.mediaType === 'video';

  return (
    <Animated.View
      style={[
        styles.previewContainer,
        animatedStyle,
        {
          backgroundColor: colors.background.secondary,
          borderColor: theme === 'light' ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.08)',
        },
      ]}
    >
      {isVideo ? (
        <Video
          source={{ uri: asset.displayUri || asset.localUri }}
          style={styles.previewMedia}
          resizeMode={ResizeMode.COVER}
          shouldPlay={false}
          isLooping
          useNativeControls={false}
          posterSource={{ uri: asset.displayUri }}
        />
      ) : (
        <Image
          source={{ uri: asset.displayUri }}
          style={styles.previewMedia}
        />
      )}

      <LinearGradient
        colors={['rgba(15,23,42,0.0)', 'rgba(15,23,42,0.45)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.previewOverlay}
      >
        <View style={styles.previewMeta}>
          <View style={styles.metaDot} />
          <Text style={[styles.metaText, { color: '#ffffff' }]}>
            {isVideo ? 'Video' : 'Photo'}
          </Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  previewContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 18,
  },
  previewMedia: {
    width: '100%',
    height: '100%',
  },
  previewOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  previewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.32)',
  },
  metaDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22d3ee',
    marginRight: 6,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  placeholder: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    paddingHorizontal: 20,
  },
  placeholderTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '600',
  },
  placeholderSubtitle: {
    marginTop: 6,
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
});

