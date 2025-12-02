import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  Platform,
  Pressable,
  ImageBackground,
} from 'react-native';
import { ResizeMode, Video } from 'expo-av';
import ImageViewing from 'react-native-image-viewing';
import Icon from 'react-native-vector-icons/Feather';
import type { getColors } from '../constants/colors';

export interface RecentMediaItem {
  postId: string;
  mediaIndex: number;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  createdAt: string;
  contentSnippet?: string;
}

interface RecentMediaGalleryProps {
  items: RecentMediaItem[];
  isLoading: boolean;
  error?: string | null;
  hasMore?: boolean;
  onRetry?: () => void;
  onSeeAll?: () => void;
  onSelectionChange?: (selected: RecentMediaItem[]) => void;
  colors: ReturnType<typeof getColors>;
}

const GRID_GAP = 2;
const HORIZONTAL_PADDING = 24; // matches profile padding in ComposePost layout

type MediaTab = 'posts' | 'reels' | 'tagged';

const INSTAGRAM_TABS: Array<{ key: MediaTab; icon: string; label: string }> = [
  { key: 'posts', icon: 'grid', label: 'Posts' },
  { key: 'reels', icon: 'film', label: 'Reels' },
  { key: 'tagged', icon: 'user', label: 'Tagged' },
];

export const RecentMediaGallery: React.FC<RecentMediaGalleryProps> = ({
  items,
  isLoading,
  error,
  hasMore,
  onRetry,
  onSeeAll,
  onSelectionChange,
  colors,
}) => {
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<MediaTab>('posts');
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const [activeVideo, setActiveVideo] = useState<RecentMediaItem | null>(null);
  const [selectedItems, setSelectedItems] = useState<RecentMediaItem[]>([]);
  const [isMultiSelect, setIsMultiSelect] = useState(false);

  const columns = useMemo(() => {
    if (width >= 1280) return 6;
    if (width >= 1024) return 5;
    if (width >= 840) return 4;
    return 3; // Instagram keeps 3 columns on phones
  }, [width]);

  const itemSize = useMemo(() => {
    const availableWidth = width - HORIZONTAL_PADDING - GRID_GAP * (columns - 1);
    return Math.max(96, Math.floor(availableWidth / columns));
  }, [width, columns]);

  const imageItems = useMemo(
    () => items.filter((item) => item.type === 'image'),
    [items]
  );

  const filteredItems = useMemo(() => {
    switch (activeTab) {
      case 'reels':
        return items.filter((item) => item.type === 'video');
      case 'tagged':
        // Placeholder until tagged media is supported
        return [];
      default:
        return items;
    }
  }, [items, activeTab]);

  useEffect(() => {
    if (!filteredItems.length) {
      setSelectedItems([]);
      onSelectionChange?.([]);
      return;
    }

    if (!selectedItems.length) {
      const primary = filteredItems[0];
      setSelectedItems([primary]);
      onSelectionChange?.([primary]);
    }
  }, [filteredItems, onSelectionChange, selectedItems.length]);

  useEffect(() => {
    if (!isMultiSelect && selectedItems.length > 1) {
      const primary = selectedItems[selectedItems.length - 1];
      setSelectedItems([primary]);
      onSelectionChange?.([primary]);
    }
  }, [isMultiSelect, onSelectionChange, selectedItems]);

  const handlePress = useCallback(
    (item: RecentMediaItem) => {
      setSelectedItems((prev) => {
        let updated: RecentMediaItem[] = [];
        const exists = prev.some(
          (candidate) =>
            candidate.postId === item.postId && candidate.mediaIndex === item.mediaIndex
        );

        if (isMultiSelect) {
          if (exists) {
            updated = prev.filter(
              (candidate) =>
                !(candidate.postId === item.postId && candidate.mediaIndex === item.mediaIndex)
            );
          } else {
            updated = [...prev, item];
          }
        } else {
          updated = exists && prev.length === 1 ? prev : [item];
        }

        if (!isMultiSelect && item.type === 'image') {
          const index = imageItems.findIndex(
            (candidate) =>
              candidate.postId === item.postId && candidate.mediaIndex === item.mediaIndex
          );
          if (index >= 0) {
            setActiveImageIndex(index);
          }
        }

        if (item.type === 'video' && !isMultiSelect) {
          setActiveVideo(item);
        }

        onSelectionChange?.(updated);
        return updated;
      });

      if (isMultiSelect) {
        return;
      }

      if (item.type === 'image') {
        const index = imageItems.findIndex(
          (candidate) =>
            candidate.postId === item.postId && candidate.mediaIndex === item.mediaIndex
        );
        if (index >= 0) {
          setActiveImageIndex(index);
        }
      } else {
        setActiveVideo(item);
      }
    },
    [imageItems]
  );

  const renderHeader = useCallback(() => (
    <View style={styles.headerRow}>
      <Text style={[styles.title, { color: colors.text.primary }]}>Recent Media</Text>
      {hasMore && onSeeAll ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="See all recent media"
          style={({ pressed }) => [
            styles.seeAllButton,
            {
              opacity: pressed ? 0.6 : 1,
            },
          ]}
          onPress={onSeeAll}
        >
          <Text style={[styles.seeAllText, { color: colors.primary[500] }]}>See all</Text>
          <Icon name="chevron-right" size={16} color={colors.primary[500]} />
        </Pressable>
      ) : null}
    </View>
  ), [colors.primary, colors.text.primary, hasMore, onSeeAll]);

  const renderTab = useCallback(
    (tab: (typeof INSTAGRAM_TABS)[number]) => {
      const isActive = activeTab === tab.key;
      return (
        <Pressable
          key={tab.key}
          style={styles.tabButton}
          onPress={() => setActiveTab(tab.key)}
          accessibilityRole="button"
          accessibilityLabel={tab.label}
        >
          <Icon
            name={tab.icon}
            size={18}
            color={isActive ? colors.text.primary : colors.text.secondary}
          />
          {isActive ? (
            <View style={[styles.tabIndicator, { backgroundColor: colors.text.primary }]} />
          ) : null}
        </Pressable>
      );
    },
    [activeTab, colors.text.primary, colors.text.secondary]
  );

  const renderModeSwitcher = useCallback(
    () => (
      <View style={styles.modeSwitcher}>
        {['Post', 'Story', 'Reel'].map((label) => {
          const isActive = label === 'Post';
          return (
            <View
              key={label}
              style={[
                styles.modePill,
                isActive && { backgroundColor: colors.text.primary },
              ]}
            >
              <Text
                style={[
                  styles.modePillText,
                  { color: isActive ? colors.background.primary : colors.text.secondary },
                ]}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    ),
    [colors.background.primary, colors.text.primary, colors.text.secondary]
  );

  const keyExtractor = useCallback(
    (item: RecentMediaItem) => `${item.postId}-${item.mediaIndex}`,
    []
  );

  const renderMediaItem = useCallback(
    ({ item, index }: { item: RecentMediaItem; index: number }) => {
      const isLastInRow = (index + 1) % columns === 0;
      const isSelected = selectedItems.some(
        (candidate) =>
          candidate.postId === item.postId && candidate.mediaIndex === item.mediaIndex
      );
      return (
        <TouchableOpacity
          style={[
            styles.gridItem,
            {
              width: itemSize,
              height: itemSize,
              marginRight: isLastInRow ? 0 : GRID_GAP,
              marginBottom: GRID_GAP,
              borderWidth: isSelected ? 2 : 0,
              borderColor: isSelected ? colors.primary[500] : 'transparent',
            },
          ]}
          onPress={() => handlePress(item)}
          activeOpacity={0.85}
          accessibilityRole="imagebutton"
          accessibilityLabel={
            item.contentSnippet
              ? `${item.type === 'video' ? 'Video' : 'Photo'} uploaded on ${new Date(
                  item.createdAt
                ).toLocaleDateString()}. ${item.contentSnippet}`
              : `${item.type === 'video' ? 'Video' : 'Photo'} uploaded on ${new Date(
                  item.createdAt
                ).toLocaleDateString()}`
          }
        >
          <ImageBackground
            source={{ uri: item.thumbnailUrl || item.url }}
            style={styles.thumbnailBackground}
            imageStyle={styles.thumbnailImage}
          >
            <View style={styles.thumbnailOverlay} />
            {isSelected ? (
              <View style={styles.selectionBadge}>
                <Text style={styles.selectionBadgeText}>
                  {selectedItems.findIndex(
                    (candidate) =>
                      candidate.postId === item.postId && candidate.mediaIndex === item.mediaIndex
                  ) + 1}
                </Text>
              </View>
            ) : null}
            {item.type === 'video' ? (
              <View style={styles.videoBadge}>
                <Icon name="play" size={14} color="#ffffff" />
              </View>
            ) : null}
          </ImageBackground>
        </TouchableOpacity>
      );
    },
    [columns, colors.primary, handlePress, itemSize, selectedItems]
  );

  const renderEmptyState = useCallback(() => {
    const message =
      activeTab === 'tagged'
        ? 'When someone tags you in a photo, it will appear here.'
        : 'Share a post to fill your grid.';

    return (
      <View style={styles.emptyState}>
        <View style={[styles.emptyStateIconRing, { borderColor: colors.border.light }]}>
          <Icon
            name={activeTab === 'tagged' ? 'user' : 'image'}
            size={24}
            color={colors.text.secondary}
          />
        </View>
        <Text style={[styles.emptyStateTitle, { color: colors.text.primary }]}>
          {activeTab === 'tagged' ? 'No tagged photos yet' : 'No posts yet'}
        </Text>
        <Text style={[styles.emptyStateSubtitle, { color: colors.text.secondary }]}>
          {message}
        </Text>
        {activeTab === 'tagged' ? null : (
          <TouchableOpacity
            style={[styles.createPostButton, { borderColor: colors.border.light }]}
            onPress={onSeeAll}
            activeOpacity={0.8}
          >
            <Text style={[styles.createPostButtonText, { color: colors.text.primary }]}>
              Create a Post
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [activeTab, colors.border.light, colors.text.primary, colors.text.secondary, onSeeAll]);

  const renderGrid = () => (
    <FlatList
      data={filteredItems}
      keyExtractor={keyExtractor}
      renderItem={renderMediaItem}
      numColumns={columns}
      scrollEnabled={false}
      ListEmptyComponent={renderEmptyState}
      contentContainerStyle={styles.gridContent}
    />
  );

  const selectedPrimary = selectedItems[0];

  if (isLoading) {
    return (
      <View
        style={[
          styles.wrapper,
          {
            backgroundColor: colors.background.secondary,
            borderColor: colors.border.light,
          },
        ]}
      >
        {renderHeader()}
        <View style={styles.tabBar}>{INSTAGRAM_TABS.map(renderTab)}</View>
        <View style={styles.loadingGrid}>
          {Array.from({ length: columns * 2 }).map((_, index) => {
            const isLastInRow = (index + 1) % columns === 0;
            return (
              <View
                key={`skeleton-${index}`}
                style={[
                  styles.loadingTile,
                  {
                    width: itemSize,
                    height: itemSize,
                    marginRight: isLastInRow ? 0 : GRID_GAP,
                    marginBottom: GRID_GAP,
                    backgroundColor: colors.background.tertiary,
                  },
                ]}
              >
                <ActivityIndicator size="small" color={colors.primary[500]} />
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[
          styles.wrapper,
          {
            backgroundColor: colors.background.secondary,
            borderColor: colors.border.light,
          },
        ]}
      >
        {renderHeader()}
        <View style={styles.tabBar}>{INSTAGRAM_TABS.map(renderTab)}</View>
        <TouchableOpacity
          style={[
            styles.errorBox,
            {
              borderColor: colors.error[500],
              backgroundColor: colors.error[50] || 'rgba(248, 113, 113, 0.08)',
            },
          ]}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry loading recent media"
          activeOpacity={0.8}
        >
          <Icon name="alert-circle" size={18} color={colors.error[500]} />
          <Text style={[styles.errorText, { color: colors.text.primary }]} numberOfLines={2}>
            {error}
          </Text>
          {onRetry ? (
            <Text style={[styles.retryText, { color: colors.primary[500] }]}>Tap to retry</Text>
          ) : null}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: colors.background.secondary,
          borderColor: colors.border.light,
        },
      ]}
    >
      {renderHeader()}

      <View style={styles.previewSection}>
        {selectedPrimary ? (
          <>
            {selectedPrimary.type === 'video' ? (
              <Video
                source={{ uri: selectedPrimary.url }}
                style={styles.previewVideo}
                resizeMode={ResizeMode.COVER}
                shouldPlay={false}
                isLooping
              />
            ) : (
              <ImageBackground
                source={{ uri: selectedPrimary.url }}
                style={styles.previewImage}
              >
                <View style={styles.previewOverlay} />
              </ImageBackground>
            )}
          </>
        ) : (
          <View style={styles.previewPlaceholder}>
            <Icon name="image" size={28} color={colors.text.secondary} />
            <Text style={[styles.previewPlaceholderText, { color: colors.text.secondary }]}>
              Select media to preview
            </Text>
          </View>
        )}
      </View>

      <View style={styles.libraryToolbar}>
        <Pressable style={styles.libraryPicker}>
          <Text style={[styles.libraryLabel, { color: colors.text.primary }]}>Recents</Text>
          <Icon name="chevron-down" size={16} color={colors.text.primary} />
        </Pressable>

        <Pressable
          style={[
            styles.multiSelectButton,
            isMultiSelect && {
              backgroundColor: colors.text.primary,
            },
          ]}
          onPress={() => setIsMultiSelect((prev) => !prev)}
        >
          <Icon
            name="copy"
            size={14}
            color={isMultiSelect ? colors.background.primary : colors.text.primary}
          />
          <Text
            style={[
              styles.multiSelectText,
              { color: isMultiSelect ? colors.background.primary : colors.text.primary },
            ]}
          >
            Select multiple
          </Text>
        </Pressable>
      </View>

      <View style={styles.tabBar}>{INSTAGRAM_TABS.map(renderTab)}</View>
      {renderGrid()}
      {renderModeSwitcher()}

      <ImageViewing
        images={imageItems.map((media) => ({ uri: media.url }))}
        imageIndex={activeImageIndex ?? 0}
        visible={activeImageIndex !== null}
        onRequestClose={() => setActiveImageIndex(null)}
        HeaderComponent={() => (
          <View style={styles.viewerHeader}>
            <Text style={styles.viewerHeaderText}>Recent</Text>
          </View>
        )}
      />

      <Modal
        visible={!!activeVideo}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setActiveVideo(null)}
      >
        <View style={styles.videoModalBackdrop}>
          <TouchableOpacity
            style={styles.videoModalClose}
            onPress={() => setActiveVideo(null)}
            accessibilityRole="button"
            accessibilityLabel="Close video"
          >
            <Icon name="x" size={22} color="#ffffff" />
          </TouchableOpacity>
          {activeVideo ? (
            <Video
              source={{ uri: activeVideo.url }}
              style={[
                styles.videoPlayer,
                {
                  maxWidth: width - 48,
                  maxHeight: width >= 720 ? 520 : 360,
                },
              ]}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              isLooping={false}
            />
          ) : null}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
  },
  previewSection: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#111827',
    marginBottom: 12,
  },
  previewImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  previewVideo: {
    flex: 1,
  },
  previewPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  previewPlaceholderText: {
    fontSize: 14,
    fontWeight: '500',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(148, 163, 184, 0.3)',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: '40%',
    height: 2,
    borderRadius: 1,
  },
  modeSwitcher: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginTop: 12,
    paddingHorizontal: 8,
  },
  modePill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(148, 163, 184, 0.4)',
  },
  modePillText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  gridContent: {
    paddingTop: GRID_GAP,
    paddingHorizontal: 4,
  },
  gridItem: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1f2937',
  },
  thumbnailBackground: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  thumbnailImage: {
    borderRadius: 8,
  },
  thumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  selectionBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f8fafc',
  },
  selectionBadgeText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '600',
  },
  videoBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyStateIconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyStateSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    width: '80%',
  },
  createPostButton: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  createPostButtonText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  loadingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: GRID_GAP,
    paddingHorizontal: 4,
  },
  loadingTile: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  libraryToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  libraryPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  libraryLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  multiSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(148, 163, 184, 0.4)',
  },
  multiSelectText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  errorBox: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 8,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  retryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  viewerHeader: {
    marginTop: Platform.OS === 'ios' ? 48 : 32,
    alignItems: 'center',
  },
  viewerHeaderText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  videoModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  videoModalClose: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 32,
    right: 24,
    padding: 8,
  },
  videoPlayer: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 16,
    backgroundColor: '#000000',
  },
});

