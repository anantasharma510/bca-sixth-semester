import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { userKeys } from './useUser';
import { followKeys } from './useFollows';
import { useUserStore } from '../stores/userStore';

/**
 * Helper functions to update React Query cache from Socket.IO user/follow events
 * These ensure Socket.IO updates are reflected in the query cache in real-time
 * 
 * NOTE: Backend currently only emits 'profileImageUpdated' event
 * We handle that and also listen for potential future events: 'userProfileUpdated', 'followStatusChanged', 'followerCountUpdated'
 */
export const updateUserCacheFromSocket = {
  /**
   * Update current user data in cache (from Socket.IO userProfileUpdated or profileImageUpdated event)
   */
  updateCurrentUser: (queryClient: any, updatedUser: any) => {
    if (!queryClient || !updatedUser || !updatedUser._id) {
      console.warn('Invalid parameters for updateCurrentUser');
      return;
    }

    try {
      // Update the current user query cache
      queryClient.setQueryData(userKeys.current(), (old: any) => {
        if (!old) return updatedUser;
        
        // Only update if it's the same user
        if (old._id === updatedUser._id) {
          return { ...old, ...updatedUser };
        }
        return old;
      });

      // Sync with global store for immediate UI updates
      const { updateCurrentUserImage } = useUserStore.getState();
      if (updatedUser.profileImageUrl) {
        updateCurrentUserImage('profile', updatedUser.profileImageUrl);
      }
      if (updatedUser.coverImageUrl) {
        updateCurrentUserImage('cover', updatedUser.coverImageUrl);
      }

      console.log('👤 Updated current user cache from Socket.IO:', updatedUser._id);
    } catch (error) {
      console.error('Error updating current user cache:', error);
    }
  },

  /**
   * Update profile image from profileImageUpdated event (backend currently emits this)
   */
  updateProfileImage: (queryClient: any, data: { userId: string; type: 'profile' | 'cover'; imageUrl: string }) => {
    if (!queryClient || !data || !data.userId || !data.imageUrl) {
      console.warn('Invalid parameters for updateProfileImage');
      return;
    }

    try {
      const { userId, type, imageUrl } = data;

      // Update the current user query cache
      queryClient.setQueryData(userKeys.current(), (old: any) => {
        if (!old || old._id !== userId) return old;
        
        const updateField = type === 'profile' ? 'profileImageUrl' : 'coverImageUrl';
        return {
          ...old,
          [updateField]: imageUrl,
        };
      });

      // Sync with global store
      const { updateCurrentUserImage } = useUserStore.getState();
      updateCurrentUserImage(type, imageUrl);

      console.log(`🖼️ Updated ${type} image from Socket.IO:`, userId, imageUrl);
    } catch (error) {
      console.error('Error updating profile image cache:', error);
    }
  },

  /**
   * Update follow status in cache (from Socket.IO followStatusChanged event)
   * Note: userId is the user being followed/unfollowed, isFollowing is from the follower's perspective
   */
  updateFollowStatus: (
    queryClient: any,
    data: { userId: string; isFollowing?: boolean; isFollowedBy?: boolean }
  ) => {
    if (!queryClient || !data || !data.userId) {
      console.warn('Invalid parameters for updateFollowStatus');
      return;
    }

    try {
      const { userId, isFollowing, isFollowedBy } = data;

      console.log('🔄 [updateFollowStatus] Updating cache for userId:', userId, { isFollowing, isFollowedBy });

      // CRITICAL FIX: Only update isFollowing if it's explicitly provided
      // Don't overwrite with undefined or false when the event is about something else
      if (isFollowing !== undefined) {
        const followingKey = followKeys.following(userId);
        queryClient.setQueryData(followingKey, (old: boolean | undefined) => {
          console.log('📝 [updateFollowStatus] Setting following cache:', followingKey, 'old:', old, 'new:', isFollowing);
          return isFollowing;
        });
        
        // Force notify by directly updating query state (ensures re-render even if query wasn't active)
        const followingQuery = queryClient.getQueryCache().find({ queryKey: followingKey });
        if (followingQuery) {
          followingQuery.setState((old: any) => ({
            ...old,
            data: isFollowing,
            dataUpdatedAt: Date.now(),
          }));
          console.log('✅ [updateFollowStatus] Updated following query state directly');
        } else {
          console.log('⚠️ [updateFollowStatus] Following query not in cache yet, setQueryData will create it');
        }
      } else {
        console.log('⏭️ [updateFollowStatus] Skipping isFollowing update (not provided in event)');
      }

      // Update followed-by status if provided (userId is following current user)
      if (isFollowedBy !== undefined) {
        const followedByKey = followKeys.followedBy(userId);
        queryClient.setQueryData(followedByKey, (old: boolean | undefined) => {
          console.log('📝 [updateFollowStatus] Setting followedBy cache:', followedByKey, 'old:', old, 'new:', isFollowedBy);
          return isFollowedBy;
        });
        
        // Force notify by directly updating query state
        const followedByQuery = queryClient.getQueryCache().find({ queryKey: followedByKey });
        if (followedByQuery) {
          followedByQuery.setState((old: any) => ({
            ...old,
            data: isFollowedBy,
            dataUpdatedAt: Date.now(),
          }));
          console.log('✅ [updateFollowStatus] Updated followedBy query state directly');
        } else {
          console.log('⚠️ [updateFollowStatus] FollowedBy query not in cache yet, setQueryData will create it');
        }
      } else {
        console.log('⏭️ [updateFollowStatus] Skipping isFollowedBy update (not provided in event)');
      }

      console.log('👥 Updated follow status cache from Socket.IO:', userId, { isFollowing, isFollowedBy });
    } catch (error) {
      console.error('Error updating follow status cache:', error);
    }
  },

  /**
   * Update follower/following counts (from Socket.IO followerCountUpdated event)
   */
  updateFollowerCounts: (
    queryClient: any,
    data: { userId: string; followerCount: number; followingCount: number }
  ) => {
    if (!queryClient || !data || !data.userId) {
      console.warn('Invalid parameters for updateFollowerCounts');
      return;
    }

    try {
      const { userId, followerCount, followingCount } = data;

      // Update current user data if it's the current user
      queryClient.setQueryData(userKeys.current(), (old: any) => {
        if (!old || old._id !== userId) return old;
        return {
          ...old,
          followerCount,
          followingCount,
        };
      });

      console.log('📊 Updated follower counts from Socket.IO:', userId, { followerCount, followingCount });
    } catch (error) {
      console.error('Error updating follower counts cache:', error);
    }
  },
};

/**
 * Hook to handle WebSocket events for user profile and follow status updates
 * Use this in components that need real-time user/follow updates
 */
export function useSocketUserUpdates(isSignedIn: boolean) {
  const queryClient = useQueryClient();

  const handleUserProfileUpdated = useCallback(
    (updatedUser: any) => {
      if (!updatedUser || !updatedUser._id) {
        console.warn('Invalid user profile update via socket:', updatedUser);
        return;
      }
      console.log('👤 User profile updated via Socket.IO:', updatedUser._id);
      updateUserCacheFromSocket.updateCurrentUser(queryClient, updatedUser);
    },
    [queryClient]
  );

  const handleProfileImageUpdated = useCallback(
    (data: { userId: string; type: 'profile' | 'cover'; imageUrl: string }) => {
      if (!data || !data.userId || !data.imageUrl || !data.type) {
        console.warn('Invalid profile image update via socket:', data);
        return;
      }
      console.log('🖼️ Profile image updated via Socket.IO:', data);
      updateUserCacheFromSocket.updateProfileImage(queryClient, data);
    },
    [queryClient]
  );

  const handleFollowStatusChanged = useCallback(
    (data: { userId: string; isFollowing?: boolean; isFollowedBy?: boolean }) => {
      if (!data || !data.userId) {
        console.warn('Invalid follow status change via socket:', data);
        return;
      }
      console.log('👥 Follow status changed via Socket.IO:', data);
      updateUserCacheFromSocket.updateFollowStatus(queryClient, data);
    },
    [queryClient]
  );

  const handleFollowerCountUpdated = useCallback(
    (data: { userId: string; followerCount: number; followingCount: number }) => {
      if (!data || !data.userId || typeof data.followerCount !== 'number' || typeof data.followingCount !== 'number') {
        console.warn('Invalid follower count update via socket:', data);
        return;
      }
      console.log('📊 Follower count updated via Socket.IO:', data);
      updateUserCacheFromSocket.updateFollowerCounts(queryClient, data);
    },
    [queryClient]
  );

  return {
    handleUserProfileUpdated,
    handleProfileImageUpdated, // Backend currently emits this
    handleFollowStatusChanged,
    handleFollowerCountUpdated,
  };
}

