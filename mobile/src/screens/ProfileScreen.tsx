import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, StatusBar, Modal, Share, Alert } from 'react-native';
import { Image } from 'expo-image';
// import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../constants/colors';
import { useApiService } from '../services/api';
import { Header } from '../components/Header';
import { Post } from '../components/Post';
import { useCurrentUser, useRefreshUser } from '../hooks/useUser';
import { getResponsiveFontSize } from '../utils/responsive';
import { useSafeAreaForTabScreen } from '../hooks/useSafeAreaConfig';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FollowersList } from '../components/FollowersList';
import { FollowingList } from '../components/FollowingList';
import { useSocket } from '../hooks/useSocket';
import { getDisplayName, getUserInitials } from '../utils/user';
import { useUserStore } from '../stores/userStore';
import { getCacheBustedUrl, getBaseUrl } from '../utils/imageCache';
import { useSocketUserUpdates } from '../hooks/useSocketUserUpdates';
import { useMySubscription } from '../services/api/style';

export default function ProfileScreen({ navigation }: any) {
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const { isSignedIn, user: authUser } = useAuth();
  const { get: getApi } = useApiService();
  const { theme } = useTheme();
  const colors = getColors(theme);
  const safeArea = useSafeAreaForTabScreen();
  const { socket, isConnected, on, off } = useSocket();
  const { handleUserProfileUpdated, handleProfileImageUpdated, handleFollowerCountUpdated } = useSocketUserUpdates(isSignedIn);
  const { data: mySubscription } = useMySubscription();
  
  // Subscribe to store changes for immediate updates (re-render when images change)
  const currentUserImages = useUserStore((state) => state.currentUserImages);
  const getUserImage = useUserStore((state) => state.getUserImage);
  const responsiveFontSize = getResponsiveFontSize();
  const isProUser =
    !!mySubscription?.subscription &&
    !!mySubscription.subscription.currentPeriodEnd &&
    new Date(mySubscription.subscription.currentPeriodEnd) > new Date();
  
  // Removed debug logging to reduce re-renders and prevent flickering

  // Add follower/following counts to state
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });

  // Memoize cover image URL to prevent flickering during scroll
  const coverImageMemo = useMemo(() => {
    const storeCoverImage = currentUserImages.coverImageUrl || getUserImage('current', 'cover', null);
    const profileStateImage = profile?.coverImageUrl;
    const authUserImage = authUser?.coverImageUrl;
    const coverImageUrl = storeCoverImage || profileStateImage || authUserImage;
    const finalCoverUrl = coverImageUrl ? getCacheBustedUrl(coverImageUrl, false) : null;
    const baseUrl = getBaseUrl(coverImageUrl);
    return {
      imageUrl: finalCoverUrl,
      baseUrl: baseUrl,
      imageKey: baseUrl ? `cover-${baseUrl}` : 'cover-placeholder'
    };
  }, [currentUserImages.coverImageUrl, profile?.coverImageUrl, authUser?.coverImageUrl, getUserImage]);

  // Memoize profile image URL to prevent flickering during scroll
  const profileImageMemo = useMemo(() => {
    const storeProfileImage = currentUserImages.profileImageUrl || getUserImage('current', 'profile', null);
    const profileStateImage = profile?.profileImageUrl;
    const authUserImage = authUser?.profileImageUrl;
    const profileImageUrl = storeProfileImage || profileStateImage || authUserImage;
    const finalProfileUrl = profileImageUrl ? getCacheBustedUrl(profileImageUrl, false) : null;
    const baseUrl = getBaseUrl(profileImageUrl);
    return {
      imageUrl: finalProfileUrl,
      baseUrl: baseUrl,
      imageKey: baseUrl ? `profile-${baseUrl}` : 'profile-placeholder'
    };
  }, [currentUserImages.profileImageUrl, profile?.profileImageUrl, authUser?.profileImageUrl, getUserImage]);

  // Use React Query for user data - prevents duplicate API calls
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const { refreshUser } = useRefreshUser();
  
  // Update profile state when React Query user data changes
  // Prioritize React Query data over authUser to avoid conflicts
  useEffect(() => {
    if (currentUser) {
      setProfile(currentUser);
      setFollowCounts({
        followers: currentUser?.followerCount || 0,
        following: currentUser?.followingCount || 0,
      });
      
      // Sync with global store
      const { updateCurrentUserImage } = useUserStore.getState();
      if (currentUser.profileImageUrl) {
        updateCurrentUserImage('profile', currentUser.profileImageUrl);
      }
      if (currentUser.coverImageUrl) {
        updateCurrentUserImage('cover', currentUser.coverImageUrl);
      }
    } else if (authUser && !currentUser && !userLoading) {
      // Only use authUser as fallback if React Query hasn't loaded yet and is not loading
      setProfile(authUser);
      setFollowCounts({
        followers: authUser.followerCount || 0,
        following: authUser.followingCount || 0,
      });
      
      // Sync with global store when authUser changes
      const { updateCurrentUserImage } = useUserStore.getState();
      if (authUser.profileImageUrl) {
        updateCurrentUserImage('profile', authUser.profileImageUrl);
      }
      if (authUser.coverImageUrl) {
        updateCurrentUserImage('cover', authUser.coverImageUrl);
      }
    }
  }, [currentUser, authUser, userLoading]);
  
  // Update loading state
  useEffect(() => {
    setIsLoading(userLoading);
  }, [userLoading]);

  // REMOVED first useFocusEffect - React Query handles caching automatically

  const fetchUserPosts = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      if (!profile?._id) return;
      try {
        setPostsLoading(true);
        const response = await getApi(`/posts/user/${profile._id}?page=${pageNum}&limit=10`);
        if (append) {
          setPosts(prev => [...prev, ...response.posts]);
        } else {
          setPosts(response.posts);
        }
        setHasMore(response.pagination?.hasNextPage ?? false);
      } catch (error) {
        console.error('Error loading posts:', error);
      } finally {
        setPostsLoading(false);
      }
    },
    [getApi, profile?._id]
  );

  // REMOVED - React Query useCurrentUser handles fetching automatically

  useEffect(() => {
    if (profile?._id) {
      fetchUserPosts(1, false);
    }
  }, [profile?._id, fetchUserPosts]);

  // Update images from store when they change (no API call - React Query handles that)
  useEffect(() => {
    if (!isSignedIn || !profile) return;
    
    // Only update images from store if they're different (no API call)
    const storeProfile = currentUserImages.profileImageUrl;
    const storeCover = currentUserImages.coverImageUrl;
    const profileStateProfile = profile.profileImageUrl;
    const profileStateCover = profile.coverImageUrl;
    
    const hasProfileUpdate = storeProfile && storeProfile !== profileStateProfile;
    const hasCoverUpdate = storeCover && storeCover !== profileStateCover;
    
    if (hasProfileUpdate || hasCoverUpdate) {
      setProfile((prev: any) => ({
        ...prev,
        ...(hasProfileUpdate && { profileImageUrl: storeProfile }),
        ...(hasCoverUpdate && { coverImageUrl: storeCover }),
      }));
    }
  }, [isSignedIn, currentUserImages.profileImageUrl, currentUserImages.coverImageUrl, profile?.profileImageUrl, profile?.coverImageUrl]);

  // Listen for real-time user profile and follower count updates
  useEffect(() => {
    if (!socket || !isConnected || !isSignedIn || !profile?._id) {
      return;
    }

    console.log('🔌 [ProfileScreen] Setting up WebSocket listeners for user/follow updates');

    // Handle profileImageUpdated (backend currently emits this)
    const handleProfileImageUpdate = (data: { userId: string; type: 'profile' | 'cover'; imageUrl: string }) => {
      // Only handle if it's for the current user's profile
      if (data.userId === profile._id) {
        // Call the hook handler to update React Query cache
        handleProfileImageUpdated(data);
        
        // Also update local state
        setProfile((prev: any) => {
          if (!prev || prev._id !== data.userId) return prev;
          const updateField = data.type === 'profile' ? 'profileImageUrl' : 'coverImageUrl';
          return { ...prev, [updateField]: data.imageUrl };
        });
      }
    };

    // Handle userProfileUpdated (future event - backend may emit this later)
    const handleUserProfileUpdate = (updatedUser: any) => {
      // Only handle if it's for the current user's profile
      if (updatedUser?._id === profile._id) {
        // Call the hook handler to update React Query cache
        handleUserProfileUpdated(updatedUser);
        
        // Also update local state
        setProfile(updatedUser);
        setFollowCounts({
          followers: updatedUser.followerCount || 0,
          following: updatedUser.followingCount || 0,
        });
      }
    };

    // Handle followerCountUpdated (future event - backend may emit this later)
    const handleFollowerCountUpdate = (data: { userId: string; followerCount: number; followingCount: number }) => {
      // Only handle if it's for the current user's profile
      if (data.userId === profile._id) {
        // Call the hook handler to update React Query cache
        handleFollowerCountUpdated(data);
        
        // Also update local state
        setFollowCounts({
          followers: data.followerCount,
          following: data.followingCount,
        });
      }
    };

    // Set up event listeners
    // Backend currently emits: profileImageUpdated
    on('profileImageUpdated', handleProfileImageUpdate);
    
    // Future events (if backend adds them):
    on('userProfileUpdated', handleUserProfileUpdate);
    on('followerCountUpdated', handleFollowerCountUpdate);

    return () => {
      // Clean up event listeners
      off('profileImageUpdated', handleProfileImageUpdate);
      off('userProfileUpdated', handleUserProfileUpdate);
      off('followerCountUpdated', handleFollowerCountUpdate);
    };
  }, [socket, isConnected, isSignedIn, profile?._id, on, off, handleUserProfileUpdated, handleProfileImageUpdated, handleFollowerCountUpdated]);

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
      console.log('🗑️ Post deleted via socket in ProfileScreen:', data.postId);
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
      console.log('🗑️ Repost deleted via socket in ProfileScreen:', data.repostId);
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

  const handleProfileUpdated = useCallback(
    (updatedUser?: any) => {
      console.log('🔄 Profile updated - refreshing profile data');
      if (updatedUser) {
        setProfile((prev: any) => ({
          ...(prev || {}),
          ...updatedUser,
        }));
        setFollowCounts((prev: { followers: number; following: number }) => ({
          followers:
            typeof updatedUser.followerCount === 'number'
              ? updatedUser.followerCount
              : prev.followers,
          following:
            typeof updatedUser.followingCount === 'number'
              ? updatedUser.followingCount
              : prev.following,
        }));
      }
      // Invalidate React Query cache to trigger refetch
      refreshUser();
    },
    [refreshUser]
  );

  const loadMore = () => {
    if (!postsLoading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchUserPosts(nextPage, true);
    }
  };

  // Share handler - must be defined before early returns to maintain hook order
  const handleShare = useCallback(async () => {
    try {
      if (!profile) {
        Alert.alert('Error', 'Profile information not available');
        return;
      }

      const username = profile.username || 'user';
      const profileName = getDisplayName(profile);
      const bio = profile.bio ? `\n\n${profile.bio}` : '';
      
      // Create share message
      let shareMessage = `Check out ${profileName}'s profile!\n\n@${username}${bio}`;
      
      // Add profile URL if available (you can customize this based on your app's URL structure)
      // const profileUrl = `https://yourapp.com/profile/${profile._id}`;
      // shareMessage += `\n\n${profileUrl}`;
      
      shareMessage += '\n\nShared from our social media app';

      const shareOptions: any = {
        message: shareMessage,
        title: `Share ${profileName}'s Profile`,
      };

      const result = await Share.share(shareOptions);

      if (result.action === Share.sharedAction) {
        // Successfully shared - optional feedback
        // Alert.alert('Success', 'Profile shared successfully!');
      }
    } catch (error: any) {
      console.error('Error sharing profile:', error);
      Alert.alert('Error', 'Failed to share profile. Please try again.');
    }
  }, [profile]);

  // Calculate display values before early returns (after all hooks)
  const displayName = getDisplayName(profile);
  const profileInitial = getUserInitials(profile || authUser);

  // Early returns must come AFTER all hooks
  if (!isSignedIn) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background.primary }]}>
        <Text style={[styles.title, { color: colors.text.primary, fontSize: responsiveFontSize.xxl }]}>Profile</Text>
        <Text style={[styles.subtitle, { color: colors.text.secondary, fontSize: responsiveFontSize.md }]}>Sign in to view your profile</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background.primary }]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={[styles.loadingText, { color: colors.text.secondary, fontSize: responsiveFontSize.md }]}>Loading profile...</Text>
      </View>
    );
  }

  const insets = safeArea.safeAreaInsets;

  return (
    <SafeAreaView
      edges={['left', 'right', 'bottom']}
      style={[
        styles.safeArea,
        {
          backgroundColor: colors.background.primary,
          paddingLeft: safeArea.paddingLeft,
          paddingRight: safeArea.paddingRight,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.background.primary} />
      
      {/* Use the existing Header component */}
      <Header 
        navigation={navigation} 
        title={displayName}
        showBackButton={false}
        showNotificationsIcon={false}
        showMessagesIcon={false}
      />
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: Math.max(insets.bottom, 16) + 32,
          },
        ]}
      >
        {/* Profile Title, Pro badge and Post Count */}
        <View style={styles.profileHeader}>
          <View style={styles.profileTitleSection}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.profileTitle, { color: colors.text.primary }]}>{displayName}</Text>
              {isProUser && (
                <View style={styles.proBadge}>
                  <Ionicons name="diamond" size={14} color="#FBBF24" />
                  <Text style={styles.proBadgeText}>PRO</Text>
                </View>
              )}
            </View>
            <Text style={[styles.postCount, { color: colors.text.secondary }]}>{posts.length} posts</Text>
          </View>
          <TouchableOpacity 
            style={styles.editProfileButton}
            onPress={() => navigation.navigate('EditProfile', { 
              profile,
              onProfileUpdated: handleProfileUpdated,
            })}
          >
            <Ionicons name="create-outline" size={20} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

          {/* Cover Photo */}
          <View style={styles.coverPhotoContainer}>
            {coverImageMemo.imageUrl ? (
              <Image 
                key={coverImageMemo.imageKey}
                source={{ uri: coverImageMemo.imageUrl }} 
                style={styles.coverPhoto}
                contentFit="cover"
                cachePolicy="disk"
                transition={200}
                onError={(error: any) => {
                  console.error('❌ ProfileScreen: Cover image failed to load:', {
                    url: coverImageMemo.imageUrl?.substring(0, 50) + '...',
                    error,
                  });
                }}
              />
            ) : (
              <View style={[styles.coverPhoto, styles.gradientCover]} />
            )}
          </View>

          {/* Profile Picture and Share Button Row */}
          <View style={styles.profileShareRow}>
            {/* Profile Picture - Left Side */}
            <View style={styles.profilePictureContainer}>
              <View style={styles.profilePicture}>
                {profileImageMemo.imageUrl ? (
                  <Image 
                    key={profileImageMemo.imageKey}
                    source={{ uri: profileImageMemo.imageUrl }} 
                    style={styles.profileImage}
                    contentFit="cover"
                    cachePolicy="disk"
                    transition={200}
                    onError={(error: any) => {
                      console.error('❌ ProfileScreen: Profile image failed to load:', {
                        url: profileImageMemo.imageUrl?.substring(0, 50) + '...',
                        error,
                      });
                    }}
                  />
                ) : (
                  <View style={styles.profileImagePlaceholder}>
                    <Text style={styles.profileImageText}>{profileInitial}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Share Button - Right Side */}
            <TouchableOpacity 
              style={[styles.shareButton, { backgroundColor: colors.background.secondary }]}
              onPress={handleShare}
            >
              <Ionicons name="share-outline" size={16} color={colors.text.primary} />
              <Text style={[styles.shareButtonText, { color: colors.text.primary }]}>Share</Text>
            </TouchableOpacity>
          </View>

          {/* Profile Info Section */}
          <View style={styles.profileInfoSection}>
            <Text style={[styles.profileName, { color: colors.text.primary }]}>{displayName}</Text>
            <Text style={[styles.profileUsername, { color: colors.text.secondary }]}>@{profile?.username || 'username'}</Text>
            <View style={styles.joinedSection}>
              <Ionicons name="calendar-outline" size={16} color={colors.text.secondary} />
              <Text style={[styles.joinedTextNew, { color: colors.text.secondary }]}>Joined July 2025</Text>
            </View>
            <View style={styles.statsSection}>
              <TouchableOpacity activeOpacity={1}>
                <Text style={[styles.statsText, { color: colors.text.primary }]}> 
                  <Text style={styles.statsNumber}>{profile?.postCount || posts.length || 0}</Text>
                  <Text style={{ color: colors.text.secondary }}> Posts</Text>
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowFollowing(true)} activeOpacity={0.7}>
                <Text style={[styles.statsText, { color: colors.text.primary }]}> 
                  <Text style={styles.statsNumber}>{followCounts.following}</Text>
                  <Text style={{ color: colors.text.secondary }}> Following</Text>
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowFollowers(true)} activeOpacity={0.7}>
                <Text style={[styles.statsText, { color: colors.text.primary }]}> 
                  <Text style={styles.statsNumber}>{followCounts.followers}</Text>
                  <Text style={{ color: colors.text.secondary }}> Followers</Text>
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.settingsShortcut}
                onPress={() => navigation.navigate('Settings')}
                activeOpacity={0.7}
              >
                <Ionicons name="settings-outline" size={16} color={colors.text.primary} />
                <Text style={[styles.settingsText, { color: colors.text.primary }]}>Settings</Text>
              </TouchableOpacity>
            </View>
          </View>

        <View style={styles.postsContainer}>
          {postsLoading && posts.length === 0 ? (
            <View style={styles.loadingPostsContainer}>
              <ActivityIndicator size="large" color="#7c3aed" />
              <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Loading posts...</Text>
            </View>
          ) : posts.length > 0 ? (
            posts.map((post: any) => (
              <Post 
                key={post._id} 
                post={post} 
                onPostUpdate={(updatedPost) => {
                  // Update the post in the list
                  const updatedPosts = posts.map(p => 
                    p._id === updatedPost._id ? updatedPost : p
                  );
                  setPosts(updatedPosts);
                }}
                onPostDelete={(deletedPostId) => {
                  // Remove the post from the list
                  const updatedPosts = posts.filter(p => p && p._id !== deletedPostId);
                  setPosts(updatedPosts);
                }}
              />
            ))
          ) : (
            <View style={styles.emptyPostsContainer}>
              <Text style={[styles.emptyPostsText, { color: colors.text.secondary }]}>No posts yet.</Text>
            </View>
          )}
          
          {hasMore && (
            <View style={styles.loadMoreContainer}>
              <TouchableOpacity 
                onPress={loadMore} 
                disabled={postsLoading} 
                style={styles.loadMoreButton}
              >
                <Text style={styles.loadMoreText}>
                  {postsLoading ? 'Loading...' : 'Load More'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          {!hasMore && posts.length > 0 && (
            <View style={styles.noMorePostsContainer}>
              <Text style={[styles.noMorePostsText, { color: colors.text.secondary }]}>No more posts to load</Text>
            </View>
          )}
        </View>
      </ScrollView>
      {/* Followers Modal */}
      <Modal
        visible={showFollowers && !!profile?._id}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFollowers(false)}
      >
        {!!profile?._id && (
          <FollowersList 
            userId={profile._id} 
            onClose={() => setShowFollowers(false)} 
          />
        )}
      </Modal>
      {/* Following Modal */}
      <Modal
        visible={showFollowing && !!profile?._id}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFollowing(false)}
      >
        {!!profile?._id && (
          <FollowingList 
            userId={profile._id} 
            onClose={() => setShowFollowing(false)} 
          />
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
  },

  
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  profileTitleSection: {
    flex: 1,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
  },
  proBadgeText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '700',
    color: '#FBBF24',
  },
  profileShareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginTop: -60,
    marginBottom: 20,
    zIndex: 1,
  },
  profilePictureContainer: {
    alignSelf: 'flex-start',
  },
  coverPhotoContainer: {
    height: 200,
    position: 'relative',
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gradientCover: {
    backgroundColor: '#7c3aed',
  },

  profileTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  postCount: {
    fontSize: 14,
  },
  editButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 8,
  },

  // Profile Picture Section
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#1a1a2e',
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#7c3aed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  profileInfoSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  editProfileButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  profileUsername: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  joinedSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  joinedTextNew: {
    fontSize: 14,
  },
  statsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  statsText: {
    fontSize: 14,
  },
  statsNumber: {
    fontWeight: 'bold',
  },
  settingsShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settingsText: {
    fontSize: 14,
    fontWeight: '600',
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Profile Content
  profileContent: {
    flex: 1,
  },

  // Posts
  postsContainer: {
    paddingHorizontal: 20,
    marginTop: 32,
  },
  loadingPostsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyPostsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyPostsText: {
    fontSize: 16,
  },
  loadMoreContainer: {
    padding: 16,
    alignItems: 'center',
  },
  loadMoreButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#3b82f6',
    borderRadius: 20,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  noMorePostsContainer: {
    padding: 16,
    alignItems: 'center',
  },
  noMorePostsText: {
    fontSize: 14,
  },

}); 