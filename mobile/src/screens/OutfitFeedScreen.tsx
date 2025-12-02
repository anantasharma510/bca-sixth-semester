import '../utils/polyfills';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useSyncUserWithBackend } from '../hooks/useSyncUser';
import { Header } from '../components/Header';
import { PublicPostFeed } from '../components/PublicPostFeed';
import { Colors, getColors } from '../constants/colors';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaForTabScreen } from '../hooks/useSafeAreaConfig';
import { useSocket } from '../hooks/useSocket';
import { resolveApiBaseUrl } from '../config/env';
import { useApiService } from '../services/api';
import { useNavigation } from '@react-navigation/native';

const API_BASE_URL = resolveApiBaseUrl();

function isOutfitPostEntry(post: any): boolean {
  if (!post) return false;
  if (post.isOutfitPost && post.outfitId) return true;
  if (post.isRepost && post.originalPost?.isOutfitPost && post.originalPost?.outfitId) return true;
  return false;
}

export default function OutfitFeedScreen({ navigation }: any) {
  const { isSignedIn } = useAuth();
  const { get: apiGet } = useApiService();
  const { theme } = useTheme();
  const colors = getColors(theme);
  const safeArea = useSafeAreaForTabScreen();
  const { socket, isConnected, on, off } = useSocket();
  const rootNavigation = useNavigation();

  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [showNewPostsBanner, setShowNewPostsBanner] = useState(false);
  const [newPostsCount, setNewPostsCount] = useState(0);

  useSyncUserWithBackend();

  const sortByDate = (items: any[]) =>
    [...items].sort((a, b) => {
      const aTime = new Date(a.createdAt || a.repostCreatedAt || 0).getTime();
      const bTime = new Date(b.createdAt || b.repostCreatedAt || 0).getTime();
      return bTime - aTime;
    });

  useEffect(() => {
    if (!socket || !isConnected || !isSignedIn) return;

    const handleNewPost = (newPost: any) => {
      if (!isOutfitPostEntry(newPost)) return;
      setPosts(prev => {
        if (prev.some(p => p && p._id === newPost._id)) return prev;
        const updated = sortByDate([newPost, ...prev]);
        setNewPostsCount(c => c + 1);
        setShowNewPostsBanner(true);
        return updated;
      });
    };

    const handlePostDeleted = (data: any) => {
      if (!data?.postId) return;
      setPosts(prev => prev.filter(p => p && p._id !== data.postId));
    };

    const handlePostUpdated = (updatedPost: any) => {
      if (!updatedPost || !updatedPost._id) return;
      if (!isOutfitPostEntry(updatedPost)) {
        // If it stopped being an outfit post, remove it from this feed
        setPosts(prev => prev.filter(p => p && p._id !== updatedPost._id));
        return;
      }
      setPosts(prev => {
        const next = prev.map(p => (p && p._id === updatedPost._id ? updatedPost : p));
        return sortByDate(next);
      });
    };

    on('newPost', handleNewPost);
    on('postDeleted', handlePostDeleted);
    on('postUpdated', handlePostUpdated);

    return () => {
      off('newPost', handleNewPost);
      off('postDeleted', handlePostDeleted);
      off('postUpdated', handlePostUpdated);
    };
  }, [socket, isConnected, isSignedIn]);

  const fetchPosts = useCallback(
    async (pageNum = 1, isRefresh = false, isLoadMore = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else if (isLoadMore) setLoadingMore(true);
        else setLoading(true);

        setError(null);
        const limit = 20;

        let data: any;
        if (isSignedIn) {
          data = await apiGet(`/posts`, {
            params: { page: pageNum, limit },
          });
        } else {
          const res = await fetch(`${API_BASE_URL}/posts/public?limit=${limit}&page=${pageNum}`);
          if (!res.ok) throw new Error(`Failed to load posts: ${res.status}`);
          data = await res.json();
        }

        const allPosts = data.posts || [];
        const onlyOutfits = sortByDate(allPosts.filter(isOutfitPostEntry));

        if (isRefresh || pageNum === 1) {
          setPosts(onlyOutfits);
          setPage(2);
        } else {
          setPosts(prev => {
            const existingIds = new Set(prev.map(p => p._id));
            const newOnes = onlyOutfits.filter(p => !existingIds.has(p._id));
            return sortByDate([...prev, ...newOnes]);
          });
          setPage(pageNum + 1);
        }

        if (data.pagination) {
          setHasNextPage(data.pagination.hasNextPage);
        } else {
          setHasNextPage(onlyOutfits.length === limit);
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load outfits');
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [isSignedIn, apiGet]
  );

  useEffect(() => {
    fetchPosts(1);
  }, [isSignedIn, fetchPosts]);

  const handleRefresh = () => {
    setPage(1);
    setHasNextPage(true);
    setNewPostsCount(0);
    setShowNewPostsBanner(false);
    fetchPosts(1, true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasNextPage && !loading) {
      fetchPosts(page, false, true);
    }
  };

  const handleNewPostsBannerPress = () => {
    setNewPostsCount(0);
    setShowNewPostsBanner(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <Header navigation={navigation} />

      <View style={styles.hero}>
        <View style={styles.heroTextCol}>
          <Text style={[styles.heroTitle, { color: colors.text.primary }]}>Outfit feed</Text>
          <Text style={[styles.heroSubtitle, { color: colors.text.secondary }]}>
            See AI‑generated outfits shared by the community.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.heroButton}
          onPress={() => (rootNavigation as any).navigate('Generate')}
        >
          <Text style={styles.heroButtonText}>Generate yours</Text>
        </TouchableOpacity>
      </View>

      <PublicPostFeed
        posts={posts}
        loading={loading}
        refreshing={refreshing}
        loadingMore={loadingMore}
        hasNextPage={hasNextPage}
        error={error}
        onRefresh={handleRefresh}
        onLoadMore={handleLoadMore}
        onPostUpdate={(updatedPost) => {
          if (!updatedPost || !updatedPost._id) return;
          if (!isOutfitPostEntry(updatedPost)) {
            setPosts(prev => prev.filter(p => p && p._id !== updatedPost._id));
            return;
          }
          setPosts(prev => {
            const next = prev.map(p => (p && p._id === updatedPost._id ? updatedPost : p));
            return sortByDate(next);
          });
        }}
        onPostDelete={(postId) => {
          if (!postId) return;
          setPosts(prev => prev.filter(p => p && p._id !== postId));
        }}
        showNewPostsBanner={showNewPostsBanner}
        newPostsCount={newPostsCount}
        onNewPostsBannerPress={handleNewPostsBannerPress}
        contentContainerStyle={{
          paddingBottom: Math.max(safeArea.safeAreaInsets.bottom, 16) + 72,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  hero: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroTextCol: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  heroSubtitle: {
    marginTop: 4,
    fontSize: 13,
  },
  heroButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FF7300',
  },
  heroButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
});


