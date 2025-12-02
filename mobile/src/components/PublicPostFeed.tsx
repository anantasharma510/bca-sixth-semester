import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { Post } from './Post';
import { WhoToFollow } from './WhoToFollow';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../constants/colors';
import Icon from 'react-native-vector-icons/Feather';

interface PublicPostFeedProps {
  posts: any[];
  loading: boolean;
  refreshing: boolean;
  loadingMore?: boolean;
  hasNextPage?: boolean;
  error: string | null;
  onRefresh: () => void;
  onLoadMore?: () => void;
  onScroll?: (event: any) => void; // Simple scroll handler for compose post visibility
  onPostUpdate?: (updatedPost: any) => void;
  onPostDelete?: (postId: string) => void;
  showNewPostsBanner?: boolean;
  newPostsCount?: number;
  onNewPostsBannerPress?: () => void;
  contentContainerStyle?: any;
}

export const PublicPostFeed = ({ 
  posts, 
  loading, 
  refreshing, 
  loadingMore = false,
  hasNextPage = false,
  error, 
  onRefresh, 
  onLoadMore,
  onScroll,
  onPostUpdate, 
  onPostDelete,
  showNewPostsBanner = false,
  newPostsCount = 0,
  onNewPostsBannerPress,
  contentContainerStyle,
}: PublicPostFeedProps) => {
  const { theme } = useTheme();
  const colors = getColors(theme);
  const renderPost = ({ item }: { item: any }) => (
    <Post 
      post={item} 
      onPostUpdate={onPostUpdate}
      onPostDelete={onPostDelete}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Text style={styles.emptyIconText}>📝</Text>
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No posts available</Text>
      <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>
        Sign up to see more content and start sharing!
      </Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <View style={styles.errorIcon}>
        <Text style={styles.errorIconText}>⚠️</Text>
      </View>
      <Text style={[styles.errorTitle, { color: colors.text.primary }]}>Something went wrong</Text>
      <Text style={[styles.errorText, { color: colors.text.secondary }]}>{error}</Text>
      <TouchableOpacity onPress={onRefresh}>
        <Text style={[styles.retryText, { color: colors.primary[500] }]}>
          Tap to try again
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoadingItem = () => (
    <View style={[styles.loadingItem, { backgroundColor: colors.background.primary, borderBottomColor: colors.border.light }]}>
      <View style={styles.loadingHeader}>
        <View style={[styles.loadingAvatar, { backgroundColor: colors.neutral[200] }]} />
        <View style={styles.loadingHeaderText}>
          <View style={[styles.loadingTextShort, { backgroundColor: colors.neutral[200] }]} />
          <View style={[styles.loadingTextShorter, { backgroundColor: colors.neutral[200] }]} />
        </View>
      </View>
      <View style={styles.loadingContent}>
        <View style={[styles.loadingTextLong, { backgroundColor: colors.neutral[200] }]} />
        <View style={[styles.loadingTextMedium, { backgroundColor: colors.neutral[200] }]} />
      </View>
    </View>
  );

  // Footer component for load more functionality
  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary[500]} />
        <Text style={[styles.footerText, { color: colors.text.secondary }]}>Loading more posts...</Text>
      </View>
    );
  };

  // New posts banner - matches frontend functionality
  const renderNewPostsBanner = () => {
    if (!showNewPostsBanner || newPostsCount === 0) return null;
    
    return (
      <TouchableOpacity
        style={[styles.newPostsBanner, { backgroundColor: colors.primary[500] }]}
        onPress={onNewPostsBannerPress}
        activeOpacity={0.8}
      >
        <Icon name="chevron-up" size={16} color="white" />
        <Text style={styles.newPostsBannerText}>
          {newPostsCount} new post{newPostsCount !== 1 ? 's' : ''}
        </Text>
      </TouchableOpacity>
    );
  };

  // Handle end reached for infinite scroll
  const handleEndReached = () => {
    if (hasNextPage && onLoadMore && !loadingMore && !loading) {
      console.log('📱 End reached, loading more posts...');
      onLoadMore();
    }
  };

  if (loading && posts.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
        <FlatList
          data={[1, 2, 3, 4, 5]} // Show 5 skeleton items
          renderItem={renderLoadingItem}
          keyExtractor={(_, index) => `loading-${index}`}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
        />
      </View>
    );
  }

  if (error && posts.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
        {renderErrorState()}
      </View>
    );
  }

  // Interleave WhoToFollow every 6 posts
  const interleavedData = [];
  for (let i = 0; i < posts.length; i++) {
    interleavedData.push({ type: 'post', data: posts[i], key: posts[i]?._id || `post-${i}` });
    if ((i + 1) % 6 === 0) {
      interleavedData.push({ type: 'whoToFollow', key: `who-to-follow-${i}` });
    }
  }

  const renderItem = ({ item }: { item: any }) => {
    if (item.type === 'post') {
      return (
        <Post 
          post={item.data} 
          onPostUpdate={onPostUpdate}
          onPostDelete={onPostDelete}
        />
      );
    } else if (item.type === 'whoToFollow') {
      return <WhoToFollow />;
    }
    return null;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      {/* New posts banner */}
      {renderNewPostsBanner()}
      
      <FlatList
        data={interleavedData}
        renderItem={renderItem}
        keyExtractor={(item, index) => item.key || `item-${item.type}-${item.data?._id || index}`}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary[500]]}
            tintColor={colors.primary[500]}
            progressBackgroundColor={colors.background.primary}
          />
        }
        onScroll={onScroll} // Simple scroll handler for compose post visibility
        scrollEventThrottle={16}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.1}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={8}
        windowSize={5}
        initialNumToRender={8}
        updateCellsBatchingPeriod={100}
        disableVirtualization={false}
        getItemLayout={undefined}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ 
          backgroundColor: colors.background.primary, 
          paddingTop: 10,
          paddingBottom: 80,
          ...(contentContainerStyle || {}),
        }}
        style={{ backgroundColor: colors.background.primary }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Loading skeleton styles
  loadingItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  loadingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  loadingAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  loadingHeaderText: {
    flex: 1,
  },
  loadingTextShort: {
    height: 16,
    borderRadius: 8,
    width: '30%',
    marginBottom: 4,
  },
  loadingTextShorter: {
    height: 12,
    borderRadius: 6,
    width: '20%',
  },
  loadingContent: {
    marginLeft: 52,
  },
  loadingTextLong: {
    height: 16,
    borderRadius: 8,
    width: '90%',
    marginBottom: 8,
  },
  loadingTextMedium: {
    height: 16,
    borderRadius: 8,
    width: '70%',
  },
  // Empty state styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyIconText: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
  // Error state styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorIconText: {
    fontSize: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
    maxWidth: 280,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  // Footer styles
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  footerText: {
    marginLeft: 8,
    fontSize: 14,
  },
  // New posts banner styles
  newPostsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 10,
    marginHorizontal: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  newPostsBannerText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
}); 