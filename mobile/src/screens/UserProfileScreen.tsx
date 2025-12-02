import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  FlatList, // Import FlatList
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useFollowStatus, useToggleFollow, useRefreshFollowStatus } from '../hooks/useFollows';
import { useSocketUserUpdates } from '../hooks/useSocketUserUpdates';
import { useApiService } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../constants/colors';
import { Post } from '../components/Post';
import { Button } from '../components/ui/Button';
import { FollowersList } from '../components/FollowersList';
import { FollowingList } from '../components/FollowingList';
import { Header } from '../components/Header';
import { ReportModal } from '../components/ReportModal';
import Icon from 'react-native-vector-icons/Feather';
import { LinearGradient } from 'expo-linear-gradient';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../hooks/useAuth';
import { getDisplayName, getUserInitials } from '../utils/user';

// Keep styles organized
const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  // --- Loading & Empty States ---
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.text.secondary,
  },
  emptyStateText: {
    color: colors.text.secondary,
    textAlign: 'center',
    marginVertical: 32,
  },
  // --- Profile Header ---
  headerContainer: {
    // This will contain the cover photo, avatar, and info
  },
  coverPhotoContainer: {
    width: '100%',
    height: 180,
    backgroundColor: colors.neutral[200], // Default to light neutral
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    marginTop: -60, // Overlap effect
    marginBottom: 16,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: colors.background.primary, // Border matches screen background
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholderText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.white,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    minHeight: 40,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  reportButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // --- Profile Info ---
  infoContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    alignItems: 'flex-start',
  },
  username: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  userHandle: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  bio: {
    color: colors.text.primary,
    marginBottom: 8,
  },
  infoText: {
    color: colors.text.secondary,
    fontSize: 14,
  },
  website: {
    color: colors.primary[500],
    fontSize: 14,
  },
  // --- Stats Bar ---
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.neutral[200],
  },
  statItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  // --- List Footer (for loading more indicator) ---
  listFooter: {
    paddingVertical: 20,
  },
});


// --- Child Components for better structure ---

const ProfileSkeleton = ({ colors }: { colors: any }) => (
  // A simple skeleton loader for a better initial loading UX
  <View style={{ padding: 16 }}>
    <View style={{ height: 180, backgroundColor: colors.neutral[200], borderRadius: 8, marginBottom: 16 }} />
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
      <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.neutral[200] }} />
      <View style={{ marginLeft: 16, flex: 1 }}>
        <View style={{ width: '70%', height: 20, backgroundColor: colors.neutral[200], borderRadius: 4, marginBottom: 8 }} />
        <View style={{ width: '50%', height: 16, backgroundColor: colors.neutral[200], borderRadius: 4 }} />
      </View>
    </View>
    <View style={{ width: '90%', height: 14, backgroundColor: colors.neutral[200], borderRadius: 4, marginBottom: 8 }} />
    <View style={{ width: '80%', height: 14, backgroundColor: colors.neutral[200], borderRadius: 4 }} />
  </View>
);


const UserProfileHeader = ({ profile, colors, isFollowing, isFollowedBy, isBlocked, onFollow, onBlock, onReport, onMessage, followLoading, blockLoading, isOwnProfile }: any) => {
  const styles = createStyles(colors);
  const displayName = getDisplayName(profile, profile?.username || 'User');
  const profileInitial = getUserInitials(profile);

  const formatJoinDate = (dateString?: string | null): string => {
    if (!dateString) return '';
    return `Joined ${new Date(dateString).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
  };

  return (
    <View style={styles.headerContainer}>
      {/* Cover Photo */}
      <View style={styles.coverPhotoContainer}>
        {profile?.coverImageUrl ? (
          <Image source={{ uri: profile.coverImageUrl }} style={styles.coverPhoto} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={["#60a5fa", "#a78bfa"]} // from-blue-400 to-purple-500
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.coverPhoto}
          />
        )}
      </View>

      {/* Avatar and Action Buttons */}
      <View style={styles.profileRow}>
        <View style={styles.avatarContainer}>
          {profile?.profileImageUrl ? (
            <Image source={{ uri: profile.profileImageUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarPlaceholderText}>{profileInitial}</Text>
          )}
        </View>
        {!isOwnProfile && (
          <View style={styles.actionButtonsContainer}>
            <Button
              title={isFollowing ? 'Following' : (!isFollowing && isFollowedBy ? 'Follow Back' : 'Follow')}
              onPress={onFollow}
              loading={followLoading}
              variant={isFollowing ? 'outline' : 'primary'}
              style={styles.actionButton}
              textStyle={styles.actionButtonText}
            />
            <Button
              title={isBlocked ? 'Unblock' : 'Block'}
              onPress={onBlock}
              loading={blockLoading}
              variant="outline"
              style={styles.actionButton}
              textStyle={styles.actionButtonText}
            />
            <TouchableOpacity
              style={[styles.reportButton, { borderColor: colors.border.medium }]}
              onPress={onReport}
            >
              <Icon name="flag" size={16} color={colors.text.secondary} />
              <Text style={[styles.reportButtonText, { color: colors.text.secondary }]}>Report</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* User Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.username}>{displayName}</Text>
        <Text style={styles.userHandle}>@{profile?.username}</Text>
        {profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 }}>
          {profile?.location && <Text style={styles.infoText}><Icon name="map-pin" /> {profile.location}</Text>}
          {profile?.createdAt && <Text style={styles.infoText}><Icon name="calendar" /> {formatJoinDate(profile.createdAt)}</Text>}
        </View>
        {profile?.website && <TouchableOpacity><Text style={styles.website}><Icon name="link" /> {profile.website}</Text></TouchableOpacity>}
      </View>
    </View>
  );
};


const UserProfileStats = ({ profile, colors, onFollowersPress, onFollowingPress }: any) => {
  const styles = createStyles(colors);
  return (
    <View style={styles.statsContainer}>
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>{profile?.postCount || 0}</Text>
        <Text style={styles.statLabel}>Posts</Text>
      </View>
      <TouchableOpacity style={styles.statItem} onPress={onFollowersPress} activeOpacity={0.7}>
        <Text style={styles.statNumber}>{profile?.followerCount || 0}</Text>
        <Text style={styles.statLabel}>Followers</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.statItem} onPress={onFollowingPress} activeOpacity={0.7}>
        <Text style={styles.statNumber}>{profile?.followingCount || 0}</Text>
        <Text style={styles.statLabel}>Following</Text>
      </TouchableOpacity>
    </View>
  );
};


export default function UserProfileScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { userId } = route.params as { userId?: string };
  const apiService = useApiService();
  const { socket, isConnected, on, off } = useSocket();
  const { isSignedIn, user: currentUser } = useAuth();

  const { theme } = useTheme();
  const colors = getColors(theme);
  const styles = useMemo(() => createStyles(colors), [colors]);

  // --- State Management ---
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [postsStatus, setPostsStatus] = useState<'idle' | 'loading' | 'loadingMore'>('idle');
  const [hasMore, setHasMore] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [actionLoading, setActionLoading] = useState<'follow' | 'block' | null>(null);
  const [modalVisible, setModalVisible] = useState<'followers' | 'following' | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false); // <-- for pull-to-refresh only
  const [showReportModal, setShowReportModal] = useState(false);

  // Use React Query for follow status - prevents duplicate API calls
  // Use empty string as fallback to prevent hook errors (enabled: false will prevent actual calls)
  const validUserId = userId && typeof userId === 'string' && userId.trim() !== '' ? userId : '';
  const { isFollowing, isFollowedBy, isLoading: followStatusLoading } = useFollowStatus(validUserId);
  const toggleFollow = useToggleFollow(validUserId);
  const { refreshStatus } = useRefreshFollowStatus();
  
  // WebSocket for real-time follow status updates
  const { handleFollowStatusChanged, handleFollowerCountUpdated, handleProfileImageUpdated } = useSocketUserUpdates(isSignedIn);
  
  // Use mutation loading state for follow button
  const followLoading = toggleFollow.isPending || actionLoading === 'follow';

  // Track last processed events to prevent duplicate processing
  const lastProcessedEventRef = useRef<{ userId: string; followerId: string; timestamp: number } | null>(null);
  const EVENT_DEDUP_WINDOW = 1000; // 1 second deduplication window

  // --- Debug: Track renders and fetches ---
  useEffect(() => {
    console.log('[UserProfileScreen] MOUNT userId:', userId);
    return () => {
      console.log('[UserProfileScreen] UNMOUNT userId:', userId);
    };
  }, [userId]);

  // --- Data Fetching ---
  const fetchData = useCallback(async (isRefresh = false) => {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      setStatus('error');
      return;
    }
    
    if (isRefresh) setIsRefreshing(true);
    else setStatus('loading');
    console.log('[UserProfileScreen] fetchData called. isRefresh:', isRefresh, 'userId:', userId);
    try {
      // Don't fetch follow status here - React Query handles it
      const [profileRes, postsRes, blockRes] = await Promise.all([
        apiService.get(`/protected/users/${userId}`),
        apiService.get(`/posts/user/${userId}?page=1&limit=10`),
        apiService.get(`/blocks/${userId}/blocked`),
      ]);
      setProfile(profileRes);
      setPosts(postsRes.posts);
      setHasMore(postsRes.pagination?.hasNextPage ?? false);
      setIsBlocked(blockRes.isBlocked);
      setPage(1);
      setStatus('success');
      console.log('[UserProfileScreen] fetchData SUCCESS userId:', userId);
    } catch (error) {
      setStatus('error');
      console.log('[UserProfileScreen] fetchData ERROR userId:', userId, error);
    } finally {
      if (isRefresh) setIsRefreshing(false);
    }
  }, [userId, apiService]);

  useEffect(() => {
    console.log('[UserProfileScreen] useEffect fetchData on userId:', userId);
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // REMOVED useFocusEffect - React Query handles caching and refetching automatically
  // Follow status is now managed by React Query hooks with proper caching

  // Listen for real-time follow status and follower count updates
  useEffect(() => {
    if (!socket || !isConnected || !isSignedIn || !validUserId) {
      return;
    }

    console.log('🔌 [UserProfileScreen] Setting up WebSocket listeners for follow updates');

    // Handle profileImageUpdated (backend currently emits this)
    const handleProfileImageUpdate = (data: { userId: string; type: 'profile' | 'cover'; imageUrl: string }) => {
      // Only handle if it's for the current profile user
      if (data.userId === validUserId) {
        // Update local profile state
        setProfile((prev: any) => {
          if (!prev || prev._id !== data.userId) return prev;
          const updateField = data.type === 'profile' ? 'profileImageUrl' : 'coverImageUrl';
          return { ...prev, [updateField]: data.imageUrl };
        });
      }
    };

    // Handle followStatusChanged (backend emits this when follow/unfollow happens)
    const handleFollowStatusChange = (data: { userId: string; followerId?: string; isFollowing?: boolean; isFollowedBy?: boolean }) => {
      // FIXED: Allow events where isFollowing is undefined (e.g., when someone follows current user)
      if (!data.followerId) {
        console.warn('⚠️ [UserProfileScreen] Invalid followStatusChanged event (missing followerId):', data);
        return;
      }

      // CRITICAL FIX: Deduplicate events - ignore if we just processed the same event
      const eventKey = `${data.userId}-${data.followerId}`;
      const now = Date.now();
      if (lastProcessedEventRef.current && 
          lastProcessedEventRef.current.userId === data.userId &&
          lastProcessedEventRef.current.followerId === data.followerId &&
          (now - lastProcessedEventRef.current.timestamp) < EVENT_DEDUP_WINDOW) {
        console.log('⏭️ [UserProfileScreen] Skipping duplicate followStatusChanged event (deduplication):', data);
        return;
      }
      lastProcessedEventRef.current = { userId: data.userId, followerId: data.followerId, timestamp: now };

      console.log('🔔 [UserProfileScreen] Received followStatusChanged:', {
        userId: data.userId,
        followerId: data.followerId,
        validUserId,
        currentUserId: currentUser?._id,
        isFollowing: data.isFollowing,
        isFollowedBy: data.isFollowedBy,
        matchesCurrentUser: data.followerId === currentUser?._id,
        matchesProfileUser: data.userId === validUserId
      });

      // Case 1: Current user (viewing profile) followed/unfollowed the profile user
      // Event: { userId: profileUser, followerId: currentUser, isFollowing: true/false, isFollowedBy: mutual }
      // This updates the "Following" button state - THIS IS THE KEY CASE
      if (data.followerId === currentUser?._id && data.userId === validUserId) {
        console.log('✅ [UserProfileScreen] Updating follow status: current user action on profile being viewed');
        handleFollowStatusChanged({
          userId: validUserId,
          isFollowing: data.isFollowing,
          isFollowedBy: data.isFollowedBy,
        });
        return; // Early return to avoid double processing
      }
      
      // Case 2: Profile user followed/unfollowed the current user (when viewing profile user's profile)
      // Event structure:
      //   Follow: { userId: currentUser, followerId: profileUser, isFollowing: false, isFollowedBy: true }
      //   Unfollow: { userId: currentUser, followerId: profileUser, isFollowing: false, isFollowedBy: false }
      // This means: profileUser followed/unfollowed currentUser
      // We need to update: followKeys.followedBy(profileUser) using the event's isFollowedBy value
      // This is critical for "Follow Back" button to show correctly
      if (data.userId === currentUser?._id && data.followerId === validUserId) {
        console.log('✅ [UserProfileScreen] Updating followedBy status: profile user followed/unfollowed current user');
        // FIXED: Use event's isFollowedBy value (true for follow, false for unfollow), not hardcoded true
        handleFollowStatusChanged({
          userId: validUserId,
          isFollowing: undefined, // Don't update - we don't know if current user follows profile user
          isFollowedBy: data.isFollowedBy ?? false, // Use event's isFollowedBy value
        });
        return; // Early return to avoid double processing
      }
      
      // Case 3: Someone else followed/unfollowed the profile user
      // This doesn't affect current user's follow status, so we skip it
      if (data.userId === validUserId && data.followerId !== currentUser?._id) {
        console.log('ℹ️ [UserProfileScreen] Someone else\'s action on profile user - skipping cache update (doesn\'t affect current user\'s follow status)');
      }
    };

    // Handle followerCountUpdated (future event - backend may emit this later)
    const handleFollowerCountUpdate = (data: { userId: string; followerCount: number; followingCount: number }) => {
      // Only handle if it's for the current profile user
      if (data.userId === validUserId) {
        handleFollowerCountUpdated(data);
        
        // Also update local profile state
        setProfile((prev: any) => {
          if (!prev || prev._id !== data.userId) return prev;
          return {
            ...prev,
            followerCount: data.followerCount,
            followingCount: data.followingCount,
          };
        });
      }
    };

    // Set up event listeners
    // Backend currently emits: profileImageUpdated
    on('profileImageUpdated', handleProfileImageUpdate);
    
    // Future events (if backend adds them):
    on('followStatusChanged', handleFollowStatusChange);
    on('followerCountUpdated', handleFollowerCountUpdate);

    return () => {
      // Clean up event listeners
      off('profileImageUpdated', handleProfileImageUpdate);
      off('followStatusChanged', handleFollowStatusChange);
      off('followerCountUpdated', handleFollowerCountUpdate);
    };
  }, [socket, isConnected, isSignedIn, validUserId, currentUser?._id, on, off, handleFollowStatusChanged, handleFollowerCountUpdated]);

  // --- Posts Infinite Scroll ---
  const loadMorePosts = useCallback(async () => {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') return;
    if (postsStatus === 'loadingMore' || !hasMore) return;
    setPostsStatus('loadingMore');
    try {
      const nextPage = page + 1;
      const response = await apiService.get(`/posts/user/${userId}?page=${nextPage}&limit=10`);
      setPosts(prev => [...prev, ...response.posts]);
      setHasMore(response.pagination?.hasNextPage ?? false);
      setPage(nextPage);
      console.log('[UserProfileScreen] loadMorePosts page:', nextPage, 'userId:', userId);
    } catch (error) {
      Alert.alert('Error', 'Failed to load more posts');
    } finally {
      setPostsStatus('idle');
    }
  }, [page, hasMore, postsStatus, userId, apiService]);

  // --- User Actions ---
  const handleFollow = useCallback(async () => {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      Alert.alert('Error', 'Invalid user ID');
      return;
    }
    
    setActionLoading('follow');
    try {
      // Use React Query mutation with optimistic updates
      await toggleFollow.mutateAsync(isFollowing);
      // React Query will automatically invalidate and refetch
    } catch (error) {
      Alert.alert('Error', 'Failed to update follow status');
    } finally {
      setActionLoading(null);
    }
  }, [isFollowing, toggleFollow, userId]);

  const handleBlock = useCallback(() => {
    // UX Improvement: Add confirmation for destructive actions.
    Alert.alert(
      `${isBlocked ? 'Unblock' : 'Block'} User`,
      `Are you sure you want to ${isBlocked ? 'unblock' : 'block'} ${profile?.username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isBlocked ? 'Unblock' : 'Block',
          style: 'destructive',
          onPress: async () => {
            setActionLoading('block');
            try {
              if (isBlocked) {
                await apiService.delete(`/blocks/${userId}/block`);
              } else {
                await apiService.post(`/blocks/block`, { blockedId: userId });
              }
              setIsBlocked(prev => !prev);
            } catch (error) {
              Alert.alert('Error', 'Failed to update block status');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  }, [isBlocked, userId, profile?.username, apiService]);

  // Listen for real-time post deletions
  useEffect(() => {
    if (!socket || !isConnected || !isSignedIn) {
      return;
    }

    const handlePostDeleted = (data: any) => {
      if (!data || !data.postId) {
        console.warn('Invalid post deletion data via socket:', data);
        return;
      }
      console.log('🗑️ Post deleted via socket in UserProfileScreen:', data.postId);
      setPosts(prev => {
        const filteredPosts = prev.filter(post => post && post._id !== data.postId);
        return filteredPosts;
      });
    };

    const handleRepostDeleted = (data: any) => {
      if (!data || !data.repostId) {
        console.warn('Invalid repost deletion data via socket:', data);
        return;
      }
      console.log('🗑️ Repost deleted via socket in UserProfileScreen:', data.repostId);
      setPosts(prev => {
        const filteredPosts = prev.filter(post => post && post._id !== data.repostId);
        return filteredPosts;
      });
    };

    // --- Real-time count update handlers ---
    const handlePostLikeCountUpdated = (data: { postId: string, likeCount: number }) => {
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
      setPosts(prev => prev.map(post => {
        if (!post) return post;
        if (post._id === data.postId) {
          return { ...post, commentCount: data.commentCount };
        } else if (post.isRepost && post.originalPost && post.originalPost._id === data.postId) {
          return {
            ...post,
            originalPost: { ...post.originalPost, commentCount: data.commentCount }
          };
        }
        return post;
      }));
    };

    // Set up event listeners
    on('postDeleted', handlePostDeleted);
    on('repostDeleted', handleRepostDeleted);
    on('postLikeCountUpdated', handlePostLikeCountUpdated);
    on('repostCountUpdated', handleRepostCountUpdated);
    on('commentCountUpdated', handleCommentCountUpdated);

    return () => {
      // Clean up event listeners
      off('postDeleted', handlePostDeleted);
      off('repostDeleted', handleRepostDeleted);
      off('postLikeCountUpdated', handlePostLikeCountUpdated);
      off('repostCountUpdated', handleRepostCountUpdated);
      off('commentCountUpdated', handleCommentCountUpdated);
    };
  }, [socket, isConnected, isSignedIn, on, off]);

  // --- Render Functions ---
  // UI Improvement: Use FlatList for better performance with long lists.
  const renderItem = useCallback(({ item }: { item: any }) => {
    console.log('[UserProfileScreen] renderItem postId:', item._id);
    return (
      <Post
        post={item}
        onPostUpdate={(updatedPost) => {
          // Only update the specific post in the list, don't refetch everything
          setPosts(prev => prev.map(post => 
            post && post._id === updatedPost._id ? updatedPost : post
          ));
        }}
        onPostDelete={(deletedPostId) => {
          // Remove the post immediately from local state
          setPosts(prev => prev.filter(post => post && post._id !== deletedPostId));
        }}
      />
    );
  }, [fetchData]);

  // Check if viewing own profile
  const currentUserId = currentUser?._id || currentUser?.id;
  const isOwnProfile = currentUserId === userId;

  const renderListHeader = () => (
    <>
      <UserProfileHeader
        profile={profile}
        colors={colors}
        isFollowing={isFollowing}
        isFollowedBy={isFollowedBy}
        isBlocked={isBlocked}
        onFollow={handleFollow}
        onBlock={handleBlock}
        onReport={() => setShowReportModal(true)}
        followLoading={followLoading}
        blockLoading={actionLoading === 'block'}
        isOwnProfile={isOwnProfile}
      />
      <UserProfileStats
        profile={profile}
        colors={colors}
        onFollowersPress={() => setModalVisible('followers')}
        onFollowingPress={() => setModalVisible('following')}
      />
    </>
  );

  const renderListFooter = () => {
    if (postsStatus !== 'loadingMore') return null;
    return (
      <View style={styles.listFooter}>
        <ActivityIndicator size="small" color={colors.primary[500]} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Profile" showBackButton />
      {status === 'loading' && !isRefreshing ? (
        <ProfileSkeleton colors={colors} />
      ) : status === 'error' || !profile ? (
        <View style={styles.loaderContainer}>
          <Text style={[styles.loadingText, { color: colors.text.primary, fontSize: 18 }]}>Profile Not Found</Text>
          <Text style={styles.loadingText}>Could not load user profile.</Text>
          <Button title="Try Again" onPress={() => fetchData()} style={{ marginTop: 20 }} />
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={<Text style={styles.emptyStateText}>This user hasn't posted anything yet.</Text>}
          ListFooterComponent={renderListFooter}
          onEndReached={loadMorePosts}
          onEndReachedThreshold={0.5}
          onRefresh={() => fetchData(true)}
          refreshing={isRefreshing}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      )}

      {/* Followers/Following Modals */}
      <Modal
        visible={modalVisible === 'followers'}
        animationType="slide"
        onRequestClose={() => setModalVisible(null)}
      >
        {userId && <FollowersList userId={userId} onClose={() => setModalVisible(null)} />}
      </Modal>

      <Modal
        visible={modalVisible === 'following'}
        animationType="slide"
        onRequestClose={() => setModalVisible(null)}
      >
        {userId && <FollowingList userId={userId} onClose={() => setModalVisible(null)} />}
      </Modal>

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        reportedUserId={userId}
        reporterUsername={profile?.username}
      />
    </View>
  );
}