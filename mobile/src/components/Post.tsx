import React, { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions, Modal, FlatList, Share } from 'react-native';
import { Image } from 'expo-image';
import { useAuth } from '../hooks/auth/useAuth';
import { postsAPI } from '../services/api/posts';
import { Colors, getColors } from '../constants/colors';
import Icon from 'react-native-vector-icons/Feather';
import { RepostModal } from './RepostModal';
import { CommentSection } from './CommentSection';

import { EditPostModal } from './EditPostModal';
import { EditRepostModal } from './EditRepostModal';
import { FollowButton } from './FollowButton';
import { ReportModal } from './ReportModal';
import { useNavigation } from '@react-navigation/native';
import ImageViewing from 'react-native-image-viewing';
import { useTheme } from '../context/ThemeContext';
import { Video, ResizeMode } from 'expo-av';
import { getDisplayName, getUserInitials } from '../utils/user';
import { useUserStore } from '../stores/userStore';
import { getCacheBustedUrl, getBaseUrl } from '../utils/imageCache';
import { useSound } from '../hooks/useSound';
interface PostProps {
  post: any;
  onPostUpdate?: (updatedPost: any) => void;
  onPostDelete?: (postId: string) => void;
}

const { width: screenWidth } = Dimensions.get('window');

// Extract PostMedia as a separate memoized component to prevent re-creation on every render
const PostMedia = memo(({ media }: { media: Array<{ type: 'image' | 'video'; url: string; thumbnailUrl?: string }> }) => {
  const [visible, setVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [videoErrors, setVideoErrors] = useState<Set<string>>(new Set());
  const [videoTimeouts, setVideoTimeouts] = useState<Map<string, NodeJS.Timeout>>(new Map());

  // Memoize media URLs to prevent unnecessary re-renders
  const memoizedMedia = useMemo(() => {
    if (!media || media.length === 0) return null;
    return media.map(item => ({
      ...item,
      // Create stable key based on URL
      key: `media-${item.url}`,
    }));
  }, [media]);

  if (!memoizedMedia || memoizedMedia.length === 0) return null;

  // Filter only images for the image viewer
  const images = useMemo(() => 
    memoizedMedia.filter(item => item.type === 'image').map(item => item.url),
    [memoizedMedia]
  );

  // Set up timeouts for videos to prevent indefinite loading
  useEffect(() => {
    const videoItems = memoizedMedia.filter(item => item.type === 'video');
    
    // Clear existing timeouts first
    videoTimeouts.forEach(timeout => clearTimeout(timeout));
    
    const newTimeouts = new Map<string, NodeJS.Timeout>();
    
    videoItems.forEach(video => {
      // Set a 10-second timeout for each video
      const timeout = setTimeout(() => {
        setVideoErrors(prev => {
          if (!prev.has(video.url)) {
            console.log('Video timeout for:', video.url);
            return new Set(prev).add(video.url);
          }
          return prev;
        });
      }, 10000);
      
      newTimeouts.set(video.url, timeout);
    });
    
    setVideoTimeouts(newTimeouts);
    
    // Cleanup timeouts when component unmounts or media changes
    return () => {
      newTimeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [memoizedMedia]);
  
  // Cleanup effect for component unmount
  useEffect(() => {
    return () => {
      videoTimeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  const openImageViewer = useCallback((index: number) => {
    setCurrentIndex(index);
    setVisible(true);
  }, []);

  const nextMedia = useCallback(() => {
    setCurrentMediaIndex((prev) => (prev + 1) % memoizedMedia.length);
  }, [memoizedMedia.length]);

  const prevMedia = useCallback(() => {
    setCurrentMediaIndex((prev) => (prev - 1 + memoizedMedia.length) % memoizedMedia.length);
  }, [memoizedMedia.length]);

  // Single media - preserve aspect ratio like frontend
  if (memoizedMedia.length === 1) {
    const item = memoizedMedia[0];
    
    return (
      <View style={styles.singleMediaContainer}>
        {item.type === 'video' ? (
          <View style={styles.videoContainer}>
            {videoErrors.has(item.url) ? (
              <View style={[styles.singleVideo, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: 'white', textAlign: 'center' }}>Video unavailable</Text>
                <Text style={{ color: 'white', textAlign: 'center', fontSize: 12, marginTop: 5 }}>
                  Failed to load video
                </Text>
                <TouchableOpacity 
                  style={{ 
                    backgroundColor: 'rgba(255,255,255,0.2)', 
                    paddingHorizontal: 12, 
                    paddingVertical: 6, 
                    borderRadius: 16, 
                    marginTop: 8 
                  }}
                  onPress={() => {
                    setVideoErrors(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(item.url);
                      return newSet;
                    });
                    
                    const timeout = setTimeout(() => {
                      setVideoErrors(prev => {
                        if (!prev.has(item.url)) {
                          console.log('Video retry timeout for:', item.url);
                          return new Set(prev).add(item.url);
                        }
                        return prev;
                      });
                    }, 10000);
                    
                    setVideoTimeouts(prev => new Map(prev).set(item.url, timeout));
                  }}
                >
                  <Text style={{ color: 'white', fontSize: 12 }}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Video
                key={`video-${item.url}`}
                source={{ uri: item.url }}
                style={styles.singleVideo}
                useNativeControls
                resizeMode={ResizeMode.COVER}
                shouldPlay={false}
                isLooping={false}
                isMuted={false}
                shouldCorrectPitch={false}
                progressUpdateIntervalMillis={1000}
                onError={(error) => {
                  console.log('Video error:', error);
                  if (error && typeof error === 'object' && 'error' in error) {
                    const errorCode = (error as any).error;
                    if (errorCode && typeof errorCode === 'string' && 
                        (errorCode.includes('decoder') || errorCode.includes('playback') || errorCode.includes('format'))) {
                      setVideoErrors(prev => new Set(prev).add(item.url));
                    }
                  }
                  const timeout = videoTimeouts.get(item.url);
                  if (timeout) {
                    clearTimeout(timeout);
                    setVideoTimeouts(prev => {
                      const newMap = new Map(prev);
                      newMap.delete(item.url);
                      return newMap;
                    });
                  }
                }}
                onLoad={() => {
                  console.log('Video loaded successfully');
                  const timeout = videoTimeouts.get(item.url);
                  if (timeout) {
                    clearTimeout(timeout);
                    setVideoTimeouts(prev => {
                      const newMap = new Map(prev);
                      newMap.delete(item.url);
                      return newMap;
                    });
                  }
                }}
              />
            )}
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => openImageViewer(0)}
          >
            <Image
              key={item.key}
              source={{ uri: item.url }}
              style={styles.singleImage}
              resizeMode="cover"
              cachePolicy="disk"
              contentFit="cover"
              transition={0}
              onError={(error) => {
                console.error('Image error:', error);
              }}
              onLoad={() => {
                // Image loaded successfully
              }}
            />
          </TouchableOpacity>
        )}
        {images.length > 0 && (
          <ImageViewing
            images={images.map(uri => ({ uri }))}
            imageIndex={currentIndex}
            visible={visible}
            onRequestClose={() => setVisible(false)}
          />
        )}
      </View>
    );
  }

  // Multiple media - show current media with navigation and count overlay
  const currentItem = memoizedMedia[currentMediaIndex];
  return (
    <View style={styles.multipleMediaContainer}>
      <View style={styles.mediaDisplayContainer}>
        {currentItem.type === 'video' ? (
          <View style={styles.videoContainer}>
            {videoErrors.has(currentItem.url) ? (
              <View style={[styles.currentVideo, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: 'white', textAlign: 'center' }}>Video unavailable</Text>
                <Text style={{ color: 'white', textAlign: 'center', fontSize: 12, marginTop: 5 }}>
                  Failed to load video
                </Text>
                <TouchableOpacity 
                  style={{ 
                    backgroundColor: 'rgba(255,255,255,0.2)', 
                    paddingHorizontal: 12, 
                    paddingVertical: 6, 
                    borderRadius: 16, 
                    marginTop: 8 
                  }}
                  onPress={() => {
                    setVideoErrors(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(currentItem.url);
                      return newSet;
                    });
                    
                    const timeout = setTimeout(() => {
                      setVideoErrors(prev => {
                        if (!prev.has(currentItem.url)) {
                          console.log('Video retry timeout for:', currentItem.url);
                          return new Set(prev).add(currentItem.url);
                        }
                        return prev;
                      });
                    }, 10000);
                    
                    setVideoTimeouts(prev => new Map(prev).set(currentItem.url, timeout));
                  }}
                >
                  <Text style={{ color: 'white', fontSize: 12 }}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Video
                key={`video-${currentItem.url}`}
                source={{ uri: currentItem.url }}
                style={styles.currentVideo}
                useNativeControls
                resizeMode={ResizeMode.COVER}
                shouldPlay={false}
                isLooping={false}
                isMuted={false}
                shouldCorrectPitch={false}
                progressUpdateIntervalMillis={1000}
                onError={(error) => {
                  console.log('Video error:', error);
                  if (error && typeof error === 'object' && 'error' in error) {
                    const errorCode = (error as any).error;
                    if (errorCode && typeof errorCode === 'string' && 
                        (errorCode.includes('decoder') || errorCode.includes('playback') || errorCode.includes('format'))) {
                      setVideoErrors(prev => new Set(prev).add(currentItem.url));
                    }
                  }
                  const timeout = videoTimeouts.get(currentItem.url);
                  if (timeout) {
                    clearTimeout(timeout);
                    setVideoTimeouts(prev => {
                      const newMap = new Map(prev);
                      newMap.delete(currentItem.url);
                      return newMap;
                    });
                  }
                }}
                onLoad={() => {
                  console.log('Video loaded successfully');
                  const timeout = videoTimeouts.get(currentItem.url);
                  if (timeout) {
                    clearTimeout(timeout);
                    setVideoTimeouts(prev => {
                      const newMap = new Map(prev);
                      newMap.delete(currentItem.url);
                      return newMap;
                    });
                  }
                }}
              />
            )}
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => openImageViewer(currentMediaIndex)}
          >
            <Image
              key={currentItem.key}
              source={{ uri: currentItem.url }}
              style={styles.currentImage}
              resizeMode="cover"
              cachePolicy="disk"
              contentFit="cover"
              transition={0}
              onError={(error) => {
                console.error('Image error:', error);
              }}
              onLoad={() => {
                // Image loaded successfully
              }}
            />
          </TouchableOpacity>
        )}
        
        {/* Media count overlay */}
        <View style={styles.mediaCountOverlay}>
          <Text style={styles.mediaCountText}>{memoizedMedia.length} {memoizedMedia.length === 1 ? 'media' : 'media'}</Text>
        </View>
        
        {/* Navigation arrows */}
        <TouchableOpacity
          style={styles.navArrowLeft}
          onPress={prevMedia}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="chevron-left" size={16} color="white" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.navArrowRight}
          onPress={nextMedia}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="chevron-right" size={16} color="white" />
        </TouchableOpacity>
        
        {/* Dot indicators */}
        <View style={styles.dotIndicators}>
          {memoizedMedia.map((_, index) => (
            <View
              key={index}
              style={[
                styles.mediaDot,
                index === currentMediaIndex ? styles.dotActive : styles.dotInactive
              ]}
            />
          ))}
        </View>
      </View>
      
      {images.length > 0 && (
        <ImageViewing
          images={images.map(uri => ({ uri }))}
          imageIndex={currentIndex}
          visible={visible}
          onRequestClose={() => setVisible(false)}
        />
      )}
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for PostMedia
  if (!prevProps.media && !nextProps.media) return true;
  if (!prevProps.media || !nextProps.media) return false;
  if (prevProps.media.length !== nextProps.media.length) return false;
  
  // Compare media URLs - if URLs are the same, don't re-render
  return prevProps.media.every((item, index) => {
    const nextItem = nextProps.media[index];
    return item.url === nextItem?.url && item.type === nextItem?.type;
  });
});

PostMedia.displayName = 'PostMedia';

export const Post = memo(function Post({ post, onPostUpdate, onPostDelete }: PostProps) {
  const { isSignedIn, user } = useAuth();
  const currentUserId = user?._id;
  const navigation = useNavigation();
  
  const { theme } = useTheme();
  const colors = getColors(theme);
  
  // Sound effects hook
  const { playLikeSound } = useSound();
  
  // Get user images from global store for immediate updates
  const getUserImage = useUserStore((state) => state.getUserImage);

  // Safety check: if post is undefined, render nothing
  if (!post) {
    console.warn('Post component received undefined post');
    return null;
  }

  // Determine if this is a repost and get the correct data
  const isRepost = post?.isRepost || post?.type === 'repost';
  const actualPost = isRepost ? post?.originalPost : post;
  const repostUser = isRepost ? post?.repostUser : null;
  const repostComment = isRepost ? post?.repostComment : null;
  const repostCreatedAt = isRepost ? post?.repostCreatedAt || post?.createdAt : null;

  // Memoize repost user image to prevent flickering
  const repostUserImageMemo = useMemo(() => {
    if (!isRepost || !repostUser) return null;
    const repostUserId = repostUser?._id;
    const isCurrentUser = repostUserId && currentUserId && repostUserId === currentUserId;
    const fallbackUrl = repostUser?.profileImageUrl;
    const profileImageUrl = isCurrentUser 
      ? getUserImage('current', 'profile', fallbackUrl)
      : fallbackUrl;
    const finalImageUrl = profileImageUrl || fallbackUrl;
    const imageUrl = finalImageUrl ? getCacheBustedUrl(finalImageUrl, false) : null;
    const baseUrl = getBaseUrl(finalImageUrl);
    return {
      imageUrl,
      imageKey: baseUrl ? `repost-${repostUserId}-${baseUrl}` : `repost-${repostUserId}-placeholder`
    };
  }, [isRepost, repostUser?._id, repostUser?.profileImageUrl, currentUserId, getUserImage]);

  // Memoize author image to prevent flickering
  const authorImageMemo = useMemo(() => {
    const authorId = actualPost?.author?._id;
    const isCurrentUser = authorId && currentUserId && authorId === currentUserId;
    const fallbackUrl = actualPost?.author?.profileImageUrl;
    const profileImageUrl = isCurrentUser 
      ? getUserImage('current', 'profile', fallbackUrl)
      : fallbackUrl;
    const finalImageUrl = profileImageUrl || fallbackUrl;
    const imageUrl = finalImageUrl ? getCacheBustedUrl(finalImageUrl, false) : null;
    const baseUrl = getBaseUrl(finalImageUrl);
    return {
      imageUrl,
      imageKey: baseUrl ? `author-${authorId}-${baseUrl}` : `author-${authorId}-placeholder`
    };
  }, [actualPost?.author?._id, actualPost?.author?.profileImageUrl, currentUserId, getUserImage]);
  

  

  
  // State for optimistic updates (use actualPost for counts)
  const [isLiked, setIsLiked] = useState(actualPost?.isLiked || false);
  const [likeCount, setLikeCount] = useState(actualPost?.likeCount || 0);
  const [repostCount, setRepostCount] = useState(actualPost?.repostCount || 0);
  const [commentCount, setCommentCount] = useState(actualPost?.commentCount || 0);
  
  // Loading states
  const [isLiking, setIsLiking] = useState(false);
  const [isReposting, setIsReposting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Modal states
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showEditPostModal, setShowEditPostModal] = useState(false);
  const [showEditRepostModal, setShowEditRepostModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Update local state when post prop changes (from Socket.IO updates)
  useEffect(() => {
    const newIsLiked = actualPost?.isLiked || false;
    const newLikeCount = actualPost?.likeCount || 0;
    const newRepostCount = actualPost?.repostCount || 0;
    const newCommentCount = actualPost?.commentCount || 0;
    
    // Update state values - always sync from props to ensure Socket.IO updates work
    if (isLiked !== newIsLiked) setIsLiked(newIsLiked);
    if (likeCount !== newLikeCount) {
      console.log(`❤️ Post component: Updating likeCount for post ${actualPost?._id}: ${likeCount} -> ${newLikeCount}`);
      setLikeCount(newLikeCount);
    }
    if (repostCount !== newRepostCount) setRepostCount(newRepostCount);
    if (commentCount !== newCommentCount) {
      console.log(`💬 Post component: Updating commentCount for post ${actualPost?._id}: ${commentCount} -> ${newCommentCount}`);
      setCommentCount(newCommentCount);
    }
  }, [actualPost?.isLiked, actualPost?.likeCount, actualPost?.repostCount, actualPost?.commentCount]);

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'unknown';
    
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'unknown';
      
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'now';
      if (diffInMinutes < 60) return `${diffInMinutes}m`;
      
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours}h`;
      
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays}d`;
      
      return date.toLocaleDateString();
    } catch (error) {
      console.warn('Error formatting timestamp:', timestamp, error);
      return 'unknown';
    }
  };

  const formatCount = (count: number) => {
    if (count < 1000) return count.toString();
    if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
    return `${(count / 1000000).toFixed(1)}M`;
  };

  const isOutfitPost = !!(actualPost as any)?.isOutfitPost && !!(actualPost as any)?.outfitId;

  const handleLike = async () => {
    if (!isSignedIn) {
      Alert.alert('Authentication Required', 'Please sign in to like posts');
      return;
    }

    if (isLiking) return; // Prevent spam
    setIsLiking(true);

    // Store original state for error recovery
    const originalIsLiked = isLiked;
    const originalLikeCount = likeCount;

    // Play sound effect when liking (not when unliking)
    // Don't await - fire and forget to avoid blocking the UI
    if (!originalIsLiked) {
      playLikeSound().catch(() => {
        // Ignore errors - sound is optional
      });
    }

    // Optimistic update
    setIsLiked(!originalIsLiked);
    setLikeCount(originalIsLiked ? originalLikeCount - 1 : originalLikeCount + 1);

    try {
      if (!actualPost?._id) return;
      const response = await postsAPI.likePost(undefined, actualPost._id);
      // Update isLiked from API response, likeCount will come from Socket.IO
      setIsLiked(response.liked);
    } catch (error: any) {
      // Revert optimistic update on error
      setIsLiked(originalIsLiked);
      setLikeCount(originalLikeCount);
      Alert.alert('Error', error.message || 'Failed to like post');
    } finally {
      setIsLiking(false);
    }
  };

  const handleComment = () => {
    setShowCommentModal(true);
  };

  const handleRepost = () => {
    if (!isSignedIn) {
      Alert.alert('Authentication Required', 'Please sign in to repost');
      return;
    }
    setShowRepostModal(true);
  };

  const handleRepostSuccess = () => {
    // Optimistic update
    setRepostCount((prev: number) => prev + 1);
    setShowRepostModal(false);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              if (isRepost && isRepostOwner) {
                // Delete the repost
                if (!post?._id) return;
                await postsAPI.deleteRepost(undefined, post._id);
                onPostDelete?.(post._id);
              } else if (!isRepost && isOwner) {
                // Delete the original post
                if (!actualPost?._id) return;
                await postsAPI.deletePost(undefined, actualPost._id);
                onPostDelete?.(post._id);
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete post');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    try {
      const authorName = getAuthorName();
      const postContent = actualPost?.content || '';
      
      // Create share content
      let shareMessage = '';
      if (isRepost) {
        const repostUserName = getRepostUserName();
        shareMessage = `${repostUserName} reposted:\n\n"${postContent}"\n\n- ${authorName}`;
      } else {
        shareMessage = `"${postContent}"\n\n- ${authorName}`;
      }
      
      // Add media information if present
      if (actualPost?.media && actualPost.media.length > 0) {
        const mediaCount = actualPost.media.length;
        shareMessage += `\n\n📷 ${mediaCount} ${mediaCount === 1 ? 'image' : 'images'} attached`;
      }
      
      // Add app branding
      shareMessage += '\n\nShared from our social media app';
      
      const shareOptions: any = {
        message: shareMessage,
        title: isRepost ? 'Check out this repost' : 'Check out this post',
      };

      // Add URL if we have a web version (optional)
      // shareOptions.url = `https://yourapp.com/post/${actualPost?._id}`;
      
      const result = await Share.share(shareOptions);

      if (result.action === Share.sharedAction) {
        // Successfully shared
        // Optional: Show success feedback
        // Alert.alert('Success', 'Post shared successfully!');
      }
    } catch (error: any) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Failed to share post. Please try again.');
    }
  };

  const handleEdit = () => {
    setShowDropdown(false);
    if (isRepost) {
      setShowEditRepostModal(true);
    } else {
      setShowEditPostModal(true);
    }
  };

  const handlePostUpdated = () => {
    // Refresh the post data after successful update
    onPostUpdate?.(actualPost);
  };

  const renderDropdownMenu = () => {
    if (!showDropdown) return null;

    const canEdit = isRepost ? isRepostOwner : isOwner;
    const canDelete = isRepost ? isRepostOwner : isOwner;

    if (!canEdit && !canDelete) return null;

    return (
      <Modal
        visible={showDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDropdown(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setShowDropdown(false)}
        >
          <View style={[styles.dropdownMenu, { backgroundColor: colors.background.primary }]}>
            {canEdit && (
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={handleEdit}
              >
            <Icon name="edit-3" size={16} color="#FF7300" />
                <Text style={[styles.dropdownItemText, { color: colors.text.primary }]}>
                  {isRepost ? 'Edit Repost' : 'Edit Post'}
                </Text>
              </TouchableOpacity>
            )}
            {canDelete && (
              <TouchableOpacity
                style={[styles.dropdownItem, styles.dropdownItemDanger]}
                onPress={() => {
                  setShowDropdown(false);
                  handleDelete();
                }}
              >
                <Icon name="trash-2" size={16} color={Colors.error[500]} />
                <Text style={[styles.dropdownItemText, styles.dropdownItemTextDanger]}>
                  {isRepost ? 'Delete Repost' : 'Delete Post'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  // Memoize media to prevent unnecessary re-renders
  const memoizedMedia = useMemo(() => {
    if (!actualPost?.media || actualPost.media.length === 0) return null;
    return actualPost.media;
  }, [actualPost?.media]);

  const isOwner = currentUserId && actualPost?.author?._id && currentUserId === actualPost.author._id;
  const isRepostOwner = isRepost && currentUserId && repostUser?._id && currentUserId === repostUser._id;
  
  // Improved author name logic with better fallbacks
  const getAuthorName = () => getDisplayName(actualPost?.author, 'Unknown User');

  // Function to get repost user name
  const getRepostUserName = () => getDisplayName(repostUser, 'Unknown User');
  
  const authorName = getAuthorName();

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary, borderBottomColor: colors.border.light }]}>
      <View style={styles.content}>
        {/* Repost header (if this is a repost) */}
        {isRepost && (
          <View style={styles.repostHeader}>
            <Icon name="repeat" size={16} color={colors.text.secondary} />
            <Text style={[styles.repostText, { color: colors.text.secondary }]}>
              {getRepostUserName()} reposted
            </Text>
            <Text style={[styles.dot, { color: colors.text.secondary }]}>·</Text>
            <Text style={[styles.timestamp, { color: colors.text.secondary }]}>{formatTimestamp(repostCreatedAt)}</Text>
          </View>
        )}

        {/* Repost user profile section (for reposts) */}
        {isRepost && (
          <View style={styles.repostUserSection}>
            <View style={styles.repostUserHeader}>
              <View style={[styles.avatar, { backgroundColor: '#FF7300', justifyContent: 'center', alignItems: 'center' }]}>
                {repostUserImageMemo?.imageUrl ? (
                  <Image
                    key={repostUserImageMemo.imageKey}
                    source={{ uri: repostUserImageMemo.imageUrl }}
                    style={styles.avatarImage}
                    contentFit="cover"
                    cachePolicy="disk"
                    transition={200}
                    onError={() => {
                      // Repost user image failed to load
                    }}
                  />
                ) : (
                  <Text style={styles.avatarText}>{getUserInitials(repostUser)}</Text>
                )}
              </View>
              <View style={styles.repostUserDetails}>
                <View style={styles.repostUserNameRow}>
                  <Text style={[styles.authorName, { color: colors.text.primary }]} numberOfLines={1}>
                    {getRepostUserName()}
                  </Text>
                </View>
              </View>
              {isRepostOwner && (
                <TouchableOpacity 
                  onPress={handleDelete} 
                  disabled={isDeleting}
                  style={styles.deleteButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Icon name="more-horizontal" size={20} color={colors.text.secondary} />
                </TouchableOpacity>
              )}
            </View>
            
            {/* Repost comment (if exists) */}
            {repostComment && (
              <View style={styles.repostCommentContainer}>
                <Text style={[styles.repostComment, { color: colors.text.primary }]}>{repostComment}</Text>
              </View>
            )}
          </View>
        )}

        {/* Original post content (wrapped in card for reposts) */}
        <View style={[isRepost && styles.originalPostCard, isRepost && { borderColor: colors.border.medium }]}>
          {/* Original post header */}
          <View style={styles.header}>
            <View style={styles.authorInfo}>
              <TouchableOpacity onPress={() => (navigation as any).navigate('UserProfile', { userId: actualPost?.author?._id })}>
                <View style={[styles.avatar, isRepost && styles.originalPostAvatar, { backgroundColor: '#FF7300', justifyContent: 'center', alignItems: 'center' }]}>
                  {authorImageMemo?.imageUrl ? (
                    <Image
                      key={authorImageMemo.imageKey}
                      source={{ uri: authorImageMemo.imageUrl }}
                      style={[styles.avatarImage, isRepost && styles.originalPostAvatar]}
                      contentFit="cover"
                      cachePolicy="disk"
                      transition={200}
                      onError={() => {
                        // Author image failed to load
                      }}
                    />
                  ) : (
                    <Text style={styles.avatarText}>{getUserInitials(actualPost?.author)}</Text>
                  )}
                </View>
              </TouchableOpacity>
              <View style={styles.authorDetails}>
                <View style={styles.authorNameRow}>
                  <TouchableOpacity onPress={() => (navigation as any).navigate('UserProfile', { userId: actualPost?.author?._id })}>
                    <Text style={[styles.authorName, isRepost && styles.originalPostAuthorName, { color: colors.text.primary }]} numberOfLines={1}>
                      {authorName}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              {/* Follow button for non-own posts */}
              {currentUserId && actualPost?.author?._id && currentUserId !== actualPost.author._id && (
                <FollowButton 
                  userId={actualPost.author._id} 
                  size="sm"
                  style={{ 
                    marginLeft: 8,
                    minWidth: 70,
                    maxWidth: 100,
                  }} 
                />
              )}
            </View>
            {((isRepost && isRepostOwner) || (!isRepost && isOwner)) && (
              <TouchableOpacity 
                onPress={() => setShowDropdown(true)} 
                disabled={isDeleting}
                style={styles.deleteButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                                  <Icon name="more-horizontal" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Content */}
          <View style={styles.postContent}>
            {memoizedMedia && memoizedMedia.length > 0 && (
              <PostMedia media={memoizedMedia} />
            )}
            {!!(actualPost?.content && actualPost.content.trim().length > 0) && (
              <Text style={[styles.contentText, { color: colors.text.primary }]}>{actualPost.content}</Text>
            )}

            {isOutfitPost && (
              <View
                style={[
                  styles.outfitCard,
                  {
                    backgroundColor: colors.background.secondary,
                    borderColor: colors.border.light,
                  },
                ]}
              >
                <View style={styles.outfitHeaderRow}>
                  <View style={styles.outfitPill}>
                    <Icon name="star" size={14} color="#FF7300" />
                    <Text style={[styles.outfitPillText, { color: colors.text.primary }]}>
                      AI outfit
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.outfitViewButton}
                    onPress={() =>
                      (navigation as any).navigate('OutfitDetail', {
                        outfitId: (actualPost as any).outfitId,
                      })
                    }
                  >
                    <Text style={styles.outfitViewText}>View outfit</Text>
                    <Icon name="chevron-right" size={14} color="#FF7300" />
                  </TouchableOpacity>
                </View>

                <Text
                  style={[styles.outfitHintText, { color: colors.text.secondary }]}
                  numberOfLines={2}
                >
                  Generated from a style prompt. Tap to see all items in this outfit.
                </Text>
              </View>
            )}

          </View>

          {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleLike}
            disabled={isLiking}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View style={[
              styles.actionIconContainer, 
              styles.likeAction,
              isLiked && styles.likeActionActive
            ]}>
              <Icon 
                name="heart" 
                size={16} 
                color={isLiked ? Colors.error[500] : colors.text.secondary}
                style={isLiked ? { textShadowColor: Colors.error[500], textShadowRadius: 1 } : {}}
              />
            </View>
            <Text style={[
              styles.actionCount,
              { color: isLiked ? Colors.error[500] : colors.text.secondary },
              isLiked && styles.actionCountActive
            ]}>
              {formatCount(likeCount)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleComment}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View style={[styles.actionIconContainer, styles.commentAction]}>
              <Icon name="message-circle" size={16} color={colors.text.secondary} />
            </View>
            <Text style={[styles.actionCount, { color: colors.text.secondary }]}>{formatCount(commentCount)}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleRepost}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View style={[styles.actionIconContainer, styles.repostAction]}>
              <Icon name="repeat" size={16} color={colors.text.secondary} />
            </View>
            <Text style={[styles.actionCount, { color: colors.text.secondary }]}>{formatCount(repostCount)}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleShare}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View style={[styles.actionIconContainer, styles.shareAction]}>
              <Icon name="share" size={16} color={colors.text.secondary} />
            </View>
          </TouchableOpacity>

          {/* Report Button - Only show if not own post */}
          {actualPost?.author?._id && currentUserId && actualPost.author._id !== currentUserId && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setShowReportModal(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View style={[styles.actionIconContainer, styles.reportAction]}>
                <Icon name="flag" size={16} color={colors.text.secondary} />
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
        </View>

      {/* Repost Modal */}
      <RepostModal
        post={{
          _id: actualPost?._id || '',
          author: {
            username: actualPost?.author?.username || 'user',
            firstName: actualPost?.author?.firstName,
            lastName: actualPost?.author?.lastName,
            profileImageUrl: actualPost?.author?.profileImageUrl,
          },
          content: actualPost?.content || '',
          media: actualPost?.media || [],
        }}
        isOpen={showRepostModal}
        onClose={() => setShowRepostModal(false)}
        onRepostSuccess={handleRepostSuccess}
      />

      {/* Comment Modal */}
      <CommentSection
        postId={actualPost?._id || ''}
        isOpen={showCommentModal}
        onClose={() => setShowCommentModal(false)}
        commentCount={commentCount}
        onCommentCountUpdate={(newCount) => {
          setCommentCount(newCount);
          // Notify parent component if needed
          if (onPostUpdate) {
            onPostUpdate({
              ...post,
              ...(isRepost ? {
                originalPost: {
                  ...actualPost,
                  commentCount: newCount
                }
              } : {
                commentCount: newCount
              })
            });
          }
        }}
      />

      {/* Dropdown Menu */}
      {renderDropdownMenu()}

      {/* Edit Post Modal */}
      <EditPostModal
        post={{
          _id: actualPost?._id || '',
          content: actualPost?.content || '',
          media: actualPost?.media || [],
          author: {
            username: actualPost?.author?.username || 'user',
            firstName: actualPost?.author?.firstName,
            lastName: actualPost?.author?.lastName,
            profileImageUrl: actualPost?.author?.profileImageUrl,
          },
        }}
        isOpen={showEditPostModal}
        onClose={() => setShowEditPostModal(false)}
        onPostUpdated={handlePostUpdated}
      />

      {/* Edit Repost Modal */}
      <EditRepostModal
        repost={{
          _id: post?._id || '',
          repostComment: repostComment || '',
          comment: repostComment || '',
          originalPost: {
            _id: actualPost?._id || '',
            content: actualPost?.content || '',
            author: {
              username: actualPost?.author?.username || 'user',
              firstName: actualPost?.author?.firstName,
              lastName: actualPost?.author?.lastName,
              profileImageUrl: actualPost?.author?.profileImageUrl,
            },
            media: actualPost?.media || [],
          },
        }}
        isOpen={showEditRepostModal}
        onClose={() => setShowEditRepostModal(false)}
        onRepostUpdated={handlePostUpdated}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        reportedPostId={actualPost?._id}
        reporterUsername={actualPost?.author?.username}
        reportedContent={actualPost?.content}
      />
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for Post component
  // Return false (re-render) if post data actually changed
  // Return true (skip re-render) if data is the same
  
  // If post ID changed, definitely re-render
  if (prevProps.post?._id !== nextProps.post?._id) return false;
  
  // Compare key post properties
  const prevPost = prevProps.post;
  const nextPost = nextProps.post;
  
  // Both null/undefined - same, skip re-render
  if (!prevPost && !nextPost) return true;
  // One is null, other isn't - different, re-render
  if (!prevPost || !nextPost) return false;
  
  // Check if it's a repost
  const prevIsRepost = prevPost?.isRepost || prevPost?.type === 'repost';
  const nextIsRepost = nextPost?.isRepost || nextPost?.type === 'repost';
  // Repost status changed - re-render
  if (prevIsRepost !== nextIsRepost) return false;
  
  // Get the actual post data (originalPost for reposts, post itself for regular posts)
  const prevActualPost = prevIsRepost ? prevPost?.originalPost : prevPost;
  const nextActualPost = nextIsRepost ? nextPost?.originalPost : nextPost;
  
  // If actualPost structure changed, re-render
  if (!prevActualPost && !nextActualPost) return true;
  if (!prevActualPost || !nextActualPost) return false;
  
  // CRITICAL: Compare Socket.IO updated fields - these MUST trigger re-renders
  // Compare like counts, repost counts, comment counts, isLiked
  // If any of these changed, return false to trigger re-render
  if (prevActualPost?.likeCount !== nextActualPost?.likeCount) return false;
  if (prevActualPost?.repostCount !== nextActualPost?.repostCount) return false;
  if (prevActualPost?.commentCount !== nextActualPost?.commentCount) return false;
  if (prevActualPost?.isLiked !== nextActualPost?.isLiked) return false;
  // Outfit post metadata changes should also trigger re-render
  if ((prevActualPost as any)?.isOutfitPost !== (nextActualPost as any)?.isOutfitPost) return false;
  if ((prevActualPost as any)?.outfitId !== (nextActualPost as any)?.outfitId) return false;
  
  // Compare media URLs - if media URLs changed, re-render
  const prevMedia = prevActualPost?.media || [];
  const nextMedia = nextActualPost?.media || [];
  if (prevMedia.length !== nextMedia.length) return false;
  const mediaChanged = prevMedia.some((item: any, index: number) => {
    const nextItem = nextMedia[index];
    return item.url !== nextItem?.url || item.type !== nextItem?.type;
  });
  if (mediaChanged) return false;
  
  // Compare content - if content changed, re-render
  if (prevActualPost?.content !== nextActualPost?.content) return false;
  
  // Compare author profile image URL - if changed, re-render
  const prevAuthorImage = prevActualPost?.author?.profileImageUrl;
  const nextAuthorImage = nextActualPost?.author?.profileImageUrl;
  if (prevAuthorImage !== nextAuthorImage) return false;
  
  // Compare repost user image if it's a repost - if changed, re-render
  if (prevIsRepost) {
    const prevRepostUserImage = prevPost?.repostUser?.profileImageUrl;
    const nextRepostUserImage = nextPost?.repostUser?.profileImageUrl;
    if (prevRepostUserImage !== nextRepostUserImage) return false;
    
    // Also check repost comment if it exists
    const prevRepostComment = prevPost?.repostComment;
    const nextRepostComment = nextPost?.repostComment;
    if (prevRepostComment !== nextRepostComment) return false;
  }
  
  // Compare post timestamps to catch any updates
  const prevUpdatedAt = prevActualPost?.updatedAt;
  const nextUpdatedAt = nextActualPost?.updatedAt;
  if (prevUpdatedAt !== nextUpdatedAt) return false;
  
  // All checks passed - data is the same, skip re-render to prevent flickering
  return true;
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    marginTop: 0, // Add top margin to create spacing from compose post
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB', // Light placeholder, will be overridden by actual image
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  authorDetails: {
    flex: 1,
    minWidth: 0,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600',
    // color: Colors.text.primary, // Removed static color
  },
  username: {
    fontSize: 14,
    // color: Colors.text.secondary, // Removed static color
  },
  dot: {
    fontSize: 14,
    // color: Colors.text.secondary, // Removed static color
  },
  timestamp: {
    fontSize: 14,
    // color: Colors.text.secondary, // Removed static color
  },
  deleteButton: {
    padding: 4,
    borderRadius: 8,
  },
  postContent: {
    marginTop: 12,
    gap: 8,
  },

  contentText: {
    fontSize: 16,
    // No line height - seamless connection to image
    // color will be set dynamically
    paddingHorizontal: 12,
    marginTop: 12,
  },
  // Actions styles
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentAction: {
    // Will be styled based on interaction
  },
  repostAction: {
    // Will be styled based on interaction
  },
  likeAction: {
    // Will be styled based on interaction
  },
  likeActionActive: {
    backgroundColor: `${Colors.error[500]}15`,
  },
  shareAction: {
    // Will be styled based on interaction
  },
  reportAction: {
    // Will be styled based on interaction
  },
  actionCount: {
    fontSize: 13,
    color: Colors.text.secondary,
    fontWeight: '500',
    minWidth: 20,
  },
  actionCountActive: {
    color: Colors.error[500],
  },
  // Repost styles
  repostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingLeft: 12,
  },
  repostText: {
    fontSize: 13,
    fontWeight: '500',
    // color removed - using dynamic colors now
  },
  repostCommentContainer: {
    marginBottom: 12,
  },
  repostComment: {
    fontSize: 15,
    lineHeight: 20,
    // color removed - using dynamic colors now
  },
  // Repost user section styles
  repostUserSection: {
    marginBottom: 12,
  },
  repostUserHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  repostUserDetails: {
    flex: 1,
    marginLeft: 12,
  },
  repostUserNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // Original post card styles
  originalPostCard: {
    borderWidth: 0.5,
    // borderColor will be set dynamically
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
  },
  originalPostAvatar: {
    width: 32,
    height: 32,
  },
  originalPostAuthorName: {
    fontSize: 14,
  },
  originalPostUsername: {
    fontSize: 12,
  },
  originalPostTimestamp: {
    fontSize: 12,
  },
  // Dropdown menu styles
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 50,
    paddingRight: 16,
  },
  dropdownMenu: {
    // backgroundColor will be set dynamically
    borderRadius: 12,
    minWidth: 150,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  dropdownItemDanger: {
    // Additional styles for danger items if needed
  },
  dropdownItemText: {
    fontSize: 15,
    fontWeight: '500',
    // color will be set dynamically
  },
  dropdownItemTextDanger: {
    color: Colors.error[500],
  },
  // New styles for PostMedia component
  singleMediaContainer: {
    width: '100%',
    aspectRatio: 1,
    marginTop: 8,
    marginBottom: 8,
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  singleImage: {
    width: '100%',
    height: '100%',
  },
  singleVideo: {
    width: '100%',
    height: '100%',
  },
  videoContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
  },
  multipleMediaContainer: {
    width: '100%',
    marginTop: 8,
    marginBottom: 8,
  },
  mediaDisplayContainer: {
    width: '100%',
    aspectRatio: 1, // Maintain aspect ratio for the main media display
    position: 'relative',
    borderRadius: 12, // Match frontend rounded-2xl
    overflow: 'hidden',
    backgroundColor: '#000', // Black background for videos
  },
  currentImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  currentVideo: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  mediaCountOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)', // Match frontend bg-black/70
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12, // Match frontend rounded-full
  },
  mediaCountText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600', // Match frontend font-medium
  },
  dotIndicators: {
    position: 'absolute',
    bottom: 8,
    left: '50%',
    transform: [{ translateX: -50 }],
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  mediaDot: {
    width: 6, // Match frontend w-1.5
    height: 6, // Match frontend h-1.5
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)', // Match frontend bg-white/50
  },
  dotActive: {
    backgroundColor: 'white', // Match frontend bg-white
    transform: [{ scale: 1.25 }], // Match frontend scale-125
  },
  dotInactive: {
    backgroundColor: 'rgba(255,255,255,0.5)', // Match frontend bg-white/50
  },
  navArrowLeft: {
    position: 'absolute',
    left: 8,
    top: '50%',
    transform: [{ translateY: -16 }],
    width: 32,
    height: 32,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navArrowRight: {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: [{ translateY: -16 }],
    width: 32,
    height: 32,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outfitCard: {
    marginTop: 12,
    marginHorizontal: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  outfitHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  outfitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#FFF7ED', // light orange
    gap: 6,
  },
  outfitPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  outfitViewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  outfitViewText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF7300',
  },
  outfitHintText: {
    marginTop: 2,
    fontSize: 12,
  },
}); 