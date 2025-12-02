import '../utils/polyfills';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, RefreshControl, FlatList, Text, TouchableOpacity, Animated, Alert } from 'react-native';
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
import { useUserStore } from '../stores/userStore';
import { markImageUpdated } from '../utils/imageCache';

const API_BASE_URL = resolveApiBaseUrl();

export default function HomeScreen({ navigation }: any) {
  const { isSignedIn, isLoading, user } = useAuth();
  const { get: apiGet } = useApiService();
  const { theme } = useTheme();
  const colors = getColors(theme);
  const safeArea = useSafeAreaForTabScreen();
  const { socket, isConnected, joinPost, leavePost, on, off, emit } = useSocket();

  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socketStatus, setSocketStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [totalPosts, setTotalPosts] = useState(0);
  const [showNewPostsBanner, setShowNewPostsBanner] = useState(false);
  const [newPostsCount, setNewPostsCount] = useState(0);
  const [isAtTop, setIsAtTop] = useState(true); // Track if user is at top of feed
  const socketUpdateTimeout = useRef<NodeJS.Timeout | null>(null);

  // Sync user data with backend
  useSyncUserWithBackend();

  // Helper function to sort posts by creation date (newest first)
  const sortPostsByDate = (posts: any[]) => {
    return [...posts].sort((a: any, b: any) => {
      const aTime = new Date(a.createdAt || a.repostCreatedAt || 0).getTime();
      const bTime = new Date(b.createdAt || b.repostCreatedAt || 0).getTime();
      return bTime - aTime; // Descending order (newest first)
    });
  };

  // Set up real-time socket events
  useEffect(() => {
    if (!socket || !isConnected || !isSignedIn) {
      setSocketStatus(isConnected ? 'connected' : 'disconnected');
      return;
    }

    setSocketStatus('connected');
    console.log('Setting up socket event listeners...');

    const handleNewPost = (newPost: any) => {
      if (!newPost || !newPost._id) {
        console.warn('Invalid post received via socket:', newPost);
        return;
      }
      console.log('📝 New post received via socket:', newPost._id);
      setPosts(prev => {
        const postExists = prev.some(post => post && post._id === newPost._id);
        if (postExists) {
          console.log('Post already exists, skipping');
          return prev;
        }
        console.log('Adding new post to feed and sorting');
        const updatedPosts = sortPostsByDate([newPost, ...prev]);
        setTotalPosts(prevTotal => prevTotal + 1);
        
        // Show new posts banner only if user is not at the top
        if (!isAtTop) {
          setNewPostsCount(prev => prev + 1);
          setShowNewPostsBanner(true);
        }
        
        return updatedPosts;
      });
    };

    const handlePostDeleted = (data: any) => {
      if (!data || !data.postId) {
        console.warn('Invalid post deletion data via socket:', data);
        return;
      }
      console.log('🗑️ Post deleted via socket:', data.postId);
      setPosts(prev => {
        const filteredPosts = prev.filter(post => post && post._id !== data.postId);
        setTotalPosts(prevTotal => Math.max(0, prevTotal - 1));
        return filteredPosts;
      });
    };

    const handlePostUpdated = (updatedPost: any) => {
      if (!updatedPost || !updatedPost._id) {
        console.warn('Invalid post update via socket:', updatedPost);
        return;
      }
      console.log('✏️ Post updated via socket:', updatedPost._id);
      setPosts(prev => {
        const updatedPosts = prev.map(post => post && post._id === updatedPost._id ? updatedPost : post);
        return sortPostsByDate(updatedPosts);
      });
    };

    const handleNewRepost = (newRepost: any) => {
      if (!newRepost || !newRepost._id) {
        console.warn('Invalid repost received via socket:', newRepost);
        return;
      }
      console.log('🔄 New repost received via socket:', newRepost._id);
      setPosts(prev => {
        const repostExists = prev.some(post => post && post._id === newRepost._id);
        if (repostExists) {
          console.log('Repost already exists, skipping');
          return prev;
        }
        console.log('Adding new repost to feed and sorting');
        const updatedPosts = sortPostsByDate([newRepost, ...prev]);
        setTotalPosts(prevTotal => prevTotal + 1);
        
        // Show new posts banner only if user is not at the top
        if (!isAtTop) {
          setNewPostsCount(prev => prev + 1);
          setShowNewPostsBanner(true);
        }
        
        return updatedPosts;
      });
    };

    const handleRepostDeleted = (data: any) => {
      if (!data || !data.repostId) {
        console.warn('Invalid repost deletion data via socket:', data);
        return;
      }
      console.log('🗑️ Repost deleted via socket:', data.repostId);
      setPosts(prev => {
        const filteredPosts = prev.filter(post => post && post._id !== data.repostId);
        setTotalPosts(prevTotal => Math.max(0, prevTotal - 1));
        return filteredPosts;
      });
    };

    // Handle profile image updates from other users (delayed updates are OK)
    const handleProfileImageUpdated = (data: any) => {
      if (!data || !data.userId || !data.imageUrl) {
        console.warn('Invalid profile image update data via socket:', data);
        return;
      }
      console.log('🖼️ Profile image updated via socket for user:', data.userId, 'type:', data.type);
      
      try {
        // Update user image cache (for other devices - delayed is OK)
        // Convert userId to string to ensure consistent cache keys
        const { updateUserImage } = useUserStore.getState();
        updateUserImage(String(data.userId), data.type, data.imageUrl);
        markImageUpdated(data.imageUrl);
      } catch (error) {
        console.error('❌ Error updating user image from socket:', error);
        return;
      }
      
      // Update posts in feed that show this user's image
      setPosts(prev => {
        return prev.map(post => {
          // Update original post author
          if (post?.author?._id === data.userId) {
            return {
              ...post,
              author: {
                ...post.author,
                profileImageUrl: data.type === 'profile' ? data.imageUrl : post.author.profileImageUrl,
                coverImageUrl: data.type === 'cover' ? data.imageUrl : post.author.coverImageUrl,
              }
            };
          }
          // Update repost user
          if (post?.isRepost && post?.repostUser?._id === data.userId) {
            return {
              ...post,
              repostUser: {
                ...post.repostUser,
                profileImageUrl: data.type === 'profile' ? data.imageUrl : post.repostUser.profileImageUrl,
                coverImageUrl: data.type === 'cover' ? data.imageUrl : post.repostUser.coverImageUrl,
              }
            };
          }
          // Update original post author in reposts
          if (post?.isRepost && post?.originalPost?.author?._id === data.userId) {
            return {
              ...post,
              originalPost: {
                ...post.originalPost,
                author: {
                  ...post.originalPost.author,
                  profileImageUrl: data.type === 'profile' ? data.imageUrl : post.originalPost.author.profileImageUrl,
                  coverImageUrl: data.type === 'cover' ? data.imageUrl : post.originalPost.author.coverImageUrl,
                }
              }
            };
          }
          return post;
        });
      });
    };

    // --- Real-time count update handlers ---
    const handlePostLikeCountUpdated = (data: { postId: string, likeCount: number }) => {
      console.log('❤️ HomeScreen: Received postLikeCountUpdated event:', data);
      setPosts(prev => prev.map(post => {
        if (!post) return post;
        // Handle both original posts and reposts
        if (post._id === data.postId) {
          return { ...post, likeCount: data.likeCount };
        } else if (post.isRepost && post.originalPost && post.originalPost._id === data.postId) {
          return {
            ...post,
            originalPost: { ...post.originalPost, likeCount: data.likeCount }
          };
        }
        return post;
      }));
    };

    const handleRepostCountUpdated = (data: { postId: string, repostCount: number }) => {
      setPosts(prev => prev.map(post => {
        if (!post) return post;
        if (post._id === data.postId) {
          return { ...post, repostCount: data.repostCount };
        } else if (post.isRepost && post.originalPost && post.originalPost._id === data.postId) {
          return {
            ...post,
            originalPost: { ...post.originalPost, repostCount: data.repostCount }
          };
        }
        return post;
      }));
    };

    const handleCommentCountUpdated = (data: { postId: string, commentCount: number }) => {
      console.log('💬 HomeScreen: Received commentCountUpdated event:', data);
      setPosts(prev => prev.map(post => {
        if (!post) return post;
        if (post._id === data.postId) {
          console.log(`💬 HomeScreen: Updating comment count for post ${data.postId}: ${post.commentCount} -> ${data.commentCount}`);
          return { ...post, commentCount: data.commentCount };
        } else if (post.isRepost && post.originalPost && post.originalPost._id === data.postId) {
          console.log(`💬 HomeScreen: Updating comment count for repost's original post ${data.postId}: ${post.originalPost.commentCount} -> ${data.commentCount}`);
          return {
            ...post,
            originalPost: { ...post.originalPost, commentCount: data.commentCount }
          };
        }
        return post;
      }));
    };

    // Set up event listeners
    on('newPost', handleNewPost);
    on('postDeleted', handlePostDeleted);
    on('postUpdated', handlePostUpdated);
    on('newRepost', handleNewRepost);
    on('repostDeleted', handleRepostDeleted);
    // Add new real-time count listeners
    on('postLikeCountUpdated', handlePostLikeCountUpdated);
    on('repostCountUpdated', handleRepostCountUpdated);
    on('commentCountUpdated', handleCommentCountUpdated);
    on('profileImageUpdated', handleProfileImageUpdated);

    // Join user room if user is available
    if (user?.id) {
      console.log('📍 Joining user room:', user.id);
      emit('joinUserRoom', user.id);
    }

    // Join post rooms for all current posts
    posts.forEach(post => {
      if (post && post._id) {
        joinPost(post._id);
      } else if (post && post.isRepost && post.originalPost && post.originalPost._id) {
        joinPost(post.originalPost._id);
      }
    });

    return () => {
      // Clean up event listeners
      off('newPost', handleNewPost);
      off('postDeleted', handlePostDeleted);
      off('postUpdated', handlePostUpdated);
      off('newRepost', handleNewRepost);
      off('repostDeleted', handleRepostDeleted);
      // Remove new real-time count listeners
      off('postLikeCountUpdated', handlePostLikeCountUpdated);
      off('repostCountUpdated', handleRepostCountUpdated);
      off('commentCountUpdated', handleCommentCountUpdated);
      off('profileImageUpdated', handleProfileImageUpdated);

      // Leave post rooms
      posts.forEach(post => {
        if (post && post._id) {
          leavePost(post._id);
        } else if (post && post.isRepost && post.originalPost && post.originalPost._id) {
          leavePost(post.originalPost._id);
        }
      });
    };
  }, [socket, isConnected, isSignedIn, user?.id, posts, on, off, emit, joinPost, leavePost]);

  const fetchPosts = useCallback(async (pageNum = 1, isRefresh = false, isLoadMore = false) => {
    try {
      console.log('📱 Fetching posts:', { pageNum, isRefresh, isLoadMore, isSignedIn });
      
      if (isRefresh) setRefreshing(true);
      else if (isLoadMore) setLoadingMore(true);
      else setLoading(true);
      
      setError(null);
      
      let data;
      const limit = 20; // Consistent limit for both authenticated and public
      
      if (isSignedIn) {
        data = await apiGet(`/posts`, {
          params: { page: pageNum, limit },
        });
      } else {
        // Public posts with higher limit and pagination support
        const res = await fetch(`${API_BASE_URL}/posts/public?limit=${limit}&page=${pageNum}`);
        if (!res.ok) throw new Error(`Failed to load posts: ${res.status}`);
        data = await res.json();
      }
      
      console.log('📱 Fetch response:', {
        postsReceived: data.posts?.length || 0,
        page: pageNum,
        pagination: data.pagination
      });
      
      // Sort posts by creation date (newest first) to ensure latest posts are on top
      const sortedPosts = sortPostsByDate(data.posts || []);
      
      if (isRefresh || pageNum === 1) {
        // Reset posts for refresh or initial load
        setPosts(sortedPosts);
        setPage(2); // Next page to load
      } else {
        // Append posts for load more
        setPosts(prev => {
          // Avoid duplicates by filtering out posts that already exist
          const existingIds = new Set(prev.map(p => p._id));
          const newPosts = sortedPosts.filter(p => !existingIds.has(p._id));
          const combined = [...prev, ...newPosts];
          return sortPostsByDate(combined);
        });
        setPage(pageNum + 1);
      }
      
      // Update pagination info
      if (data.pagination) {
        setHasNextPage(data.pagination.hasNextPage);
        setTotalPosts(data.pagination.totalPosts || sortedPosts.length);
      } else {
        // For endpoints without pagination info, assume there might be more if we got a full page
        setHasNextPage(sortedPosts.length === limit);
        setTotalPosts(prev => isRefresh ? sortedPosts.length : prev + sortedPosts.length);
      }
      
    } catch (e: any) {
      setError(e.message || 'Failed to load posts');
      console.error('Feed fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [isSignedIn, apiGet]);

  // Load more posts when user reaches the end
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasNextPage && !loading) {
      console.log('📱 Loading more posts, page:', page);
      fetchPosts(page, false, true);
    }
  }, [loadingMore, hasNextPage, loading, page, fetchPosts]);

  useEffect(() => {
    fetchPosts(1);
  }, [isSignedIn, fetchPosts]);

  const handleRefresh = () => {
    console.log('📱 Refreshing posts');
    setPage(1);
    setHasNextPage(true);
    setNewPostsCount(0);
    setShowNewPostsBanner(false);
    fetchPosts(1, true);
  };

  // Handle new posts banner press
  const handleNewPostsBannerPress = () => {
    setNewPostsCount(0);
    setShowNewPostsBanner(false);
    // Scroll to top is handled by the FlatList's scrollToTop method
  };

  // Handle scroll to track if user is at top
  const handleScroll = (event: any) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    const isNearTop = scrollY <= 50; // Consider "at top" if within 50px of top
    setIsAtTop(isNearTop);
  };

  // Restore proper debounced post update
  const debouncedPostUpdate = useCallback((updatedPost: any) => {
    if (socketUpdateTimeout.current) {
      clearTimeout(socketUpdateTimeout.current);
    }
    
    socketUpdateTimeout.current = setTimeout(() => {
      if (!updatedPost || !updatedPost._id) return;
      setPosts(prev => {
        const updatedPosts = prev.map(post => 
          post && post._id === updatedPost._id ? updatedPost : post
        );
        return sortPostsByDate(updatedPosts); // Re-sort to maintain chronological order
      });
    }, 100); // Debounce socket updates
  }, [sortPostsByDate]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <Header navigation={navigation} />
     
      {/* Post feed - no scroll handler needed */}
      <PublicPostFeed
        posts={posts}
        loading={loading}
        refreshing={refreshing}
        loadingMore={loadingMore}
        hasNextPage={hasNextPage}
        error={error}
        onRefresh={handleRefresh}
        onLoadMore={handleLoadMore}
        contentContainerStyle={{ paddingBottom: Math.max(safeArea.safeAreaInsets.bottom, 16) + 72 }}
        onScroll={handleScroll}
        onPostUpdate={debouncedPostUpdate}
        onPostDelete={(postId) => {
          if (!postId) return;
          setPosts(prev => {
            const filteredPosts = prev.filter(post => post && post._id !== postId);
            setTotalPosts(prevTotal => Math.max(0, prevTotal - 1));
            return filteredPosts;
          });
        }}
        showNewPostsBanner={showNewPostsBanner}
        newPostsCount={newPostsCount}
        onNewPostsBannerPress={handleNewPostsBannerPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 