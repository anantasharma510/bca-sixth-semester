import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ImageBackground,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../constants/colors';
import { ProfileMediaItem } from '../hooks/useProfileMediaFeed';

interface ProfileMediaGridProps {
  data: ProfileMediaItem[];
  loading: boolean;
  loadingMore: boolean;
  error?: string | null;
  onRetry?: () => void;
  onEndReached?: () => void;
  onPressItem?: (item: ProfileMediaItem) => void;
  columns?: number;
}

const SKELETON_COUNT = 9;

export const ProfileMediaGrid: React.FC<ProfileMediaGridProps> = ({
  data,
  loading,
  loadingMore,
  error,
  onRetry,
  onEndReached,
  onPressItem,
  columns = 3,
}) => {
  const { theme } = useTheme();
  const colors = getColors(theme);

  const skeletonItems = useMemo(
    () => Array.from({ length: SKELETON_COUNT }).map((_, index) => `skeleton-${index}`),
    []
  );

  if (error && !loading && data.length === 0) {
    return (
      <View style={[styles.errorContainer, { borderColor: colors.error[200], backgroundColor: colors.error[50] }]}>
        <Icon name="alert-circle" size={20} color={colors.error[500]} />
        <Text style={[styles.errorText, { color: colors.error[600] }]}>Server error. Please try again later.</Text>
        {onRetry && (
          <Pressable onPress={onRetry}>
            <Text style={[styles.retryText, { color: colors.primary[500] }]}>Tap to retry</Text>
          </Pressable>
        )}
      </View>
    );
  }

  if (!loading && data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="image" size={32} color={colors.text.secondary} />
        <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No posts yet</Text>
        <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>
          Share or interact with posts to see them here.
        </Text>
      </View>
    );
  }

  return (
    <FlatList<ProfileMediaItem | string>
      data={loading && data.length === 0 ? skeletonItems : data}
      keyExtractor={(item, index) =>
        typeof item === 'string' ? item : `${item.postId}-${item.mediaIndex}-${index}`
      }
      numColumns={columns}
      showsVerticalScrollIndicator={false}
      scrollEnabled={false}
      renderItem={({ item, index }) => {
        if (typeof item === 'string') {
          return (
            <View
              style={[
                styles.skeleton,
                {
                  backgroundColor: colors.background.tertiary,
                  marginRight: (index % columns) === columns - 1 ? 0 : GRID_GAP,
                  marginBottom: GRID_GAP,
                },
              ]}
            />
          );
        }

        const isVideo = item.type === 'video';

        return (
          <Pressable
            accessibilityRole="imagebutton"
            onPress={() => onPressItem?.(item)}
            style={[
              styles.tile,
              {
                marginRight: (index % columns) === columns - 1 ? 0 : GRID_GAP,
                marginBottom: GRID_GAP,
              },
            ]}
          >
            <ImageBackground
              source={{ uri: item.thumbnailUrl || item.url }}
              style={styles.thumbnail}
              imageStyle={styles.thumbnailImage}
            >
              {isVideo && (
                <View style={styles.videoBadge}>
                  <Icon name="play" size={14} color="#ffffff" />
                </View>
              )}
            </ImageBackground>
          </Pressable>
        );
      }}
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.footer}>
            <ActivityIndicator size="small" color={colors.primary[500]} />
          </View>
        ) : null
      }
      onEndReachedThreshold={0.6}
      onEndReached={() => {
        if (!loading && !loadingMore) {
          onEndReached?.();
        }
      }}
    />
  );
};

const GRID_GAP = Platform.select({ ios: 2, android: 2, default: 6 });

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  thumbnail: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  videoBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  skeleton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 220,
  },
  errorContainer: {
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  errorText: {
    fontSize: 14,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});

