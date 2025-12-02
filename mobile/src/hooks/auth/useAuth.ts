import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth as useBetterAuth } from '../useAuth';
import { User, SuspensionCheckResponse } from '../../types/api';
import { useUserStore } from '../../stores/userStore';
import { useCurrentUser, useSuspensionCheck } from '../useUser';
import { useSocket } from '../useSocket';
import { useSocketUserUpdates } from '../useSocketUserUpdates';

export interface AuthState {
  isSignedIn: boolean;
  isLoaded: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isSuspended: boolean;
}

export interface AuthActions {
  checkSuspension: () => Promise<boolean>;
  fetchUserData: () => Promise<User | null>;
  refreshUserData: () => Promise<void>;
  clearError: () => void;
}

export const useAuthWithBackend = (): AuthState & AuthActions => {
  const { isSignedIn, isLoaded, user: betterAuthUser } = useBetterAuth();
  const initializationRef = useRef<string>('');
  
  // Use React Query hooks for user data and suspension check
  // This enables caching and request deduplication
  const { data: userData, isLoading: userLoading, error: userError, refetch: refetchUser } = useCurrentUser();
  const { data: suspensionData, isLoading: suspensionLoading, refetch: refetchSuspension } = useSuspensionCheck();
  
  // WebSocket for real-time user updates
  const { socket, isConnected, on, off } = useSocket();
  const { handleUserProfileUpdated, handleProfileImageUpdated, handleFollowStatusChanged, handleFollowerCountUpdated } = useSocketUserUpdates(isSignedIn);
  
  // Get current user ID for filtering events
  const currentUserId = userData?._id || betterAuthUser?.id;

  // Track last processed events to prevent duplicate processing
  const lastProcessedEventRef = useRef<{ userId: string; followerId: string; timestamp: number } | null>(null);
  const EVENT_DEDUP_WINDOW = 1000; // 1 second deduplication window

  const [authState, setAuthState] = useState<AuthState>({
    isSignedIn: false,
    isLoaded: false,
    user: null,
    isLoading: false,
    error: null,
    isSuspended: false,
  });

  // Check suspension status - uses React Query cache
  const checkSuspension = useCallback(async (): Promise<boolean> => {
    if (!isSignedIn) return false;
    
    // If no suspension data, trigger a refetch
    if (!suspensionData) {
      const result = await refetchSuspension();
      const isSuspended = result.data?.suspended || false;
      
      setAuthState(prev => ({
        ...prev,
        isSuspended,
        error: isSuspended ? 'Account suspended' : null,
      }));
      
      return isSuspended;
    }
    
    const isSuspended = suspensionData.suspended || false;
    
    setAuthState(prev => ({
      ...prev,
      isSuspended,
      error: isSuspended ? 'Account suspended' : null,
    }));
    
    return isSuspended;
  }, [isSignedIn, suspensionData, refetchSuspension]);

  // Get user data from backend - uses React Query cache
  const fetchUserData = useCallback(async (): Promise<User | null> => {
    if (!isSignedIn) {
      console.error('[useAuth] Not signed in when fetching user data');
      return null;
    }

    // Return cached data if available, otherwise trigger refetch
    if (userData) {
      return userData;
    }
    
    // If no cached data, refetch and return the result
    try {
      const result = await refetchUser();
      return result.data || null;
    } catch (error) {
      console.error('[useAuth] Error refetching user data:', error);
      return null;
    }
  }, [isSignedIn, userData, refetchUser]);

  // Refresh user data - invalidates React Query cache
  const refreshUserData = useCallback(async (): Promise<void> => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const result = await refetchUser();
      const userData = result.data;
      
      setAuthState(prev => ({
        ...prev,
        user: userData || null,
        isLoading: false,
        error: null,
      }));
    } catch (error: any) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to refresh user data',
      }));
    }
  }, [refetchUser]);

  // Clear error
  const clearError = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: null }));
  }, []);

  // Listen for WebSocket events for real-time user/follow updates
  useEffect(() => {
    if (!socket || !isConnected || !isSignedIn || !currentUserId) {
      return;
    }

    console.log('🔌 [useAuth] Setting up WebSocket listeners for user/follow updates');

    // Handle profileImageUpdated (backend currently emits this)
    const handleProfileImageUpdate = (data: { userId: string; type: 'profile' | 'cover'; imageUrl: string }) => {
      // Only handle if it's for the current user
      if (data.userId === currentUserId) {
        handleProfileImageUpdated(data);
      }
    };

    // Handle userProfileUpdated (future event - backend may emit this later)
    const handleUserProfileUpdate = (updatedUser: any) => {
      // Only handle if it's for the current user
      if (updatedUser?._id === currentUserId) {
        handleUserProfileUpdated(updatedUser);
      }
    };

    // Handle followStatusChanged (backend emits this when follow/unfollow happens)
    // Note: This should only update if it affects the current user's follow status
    const handleFollowStatusChange = (data: { userId: string; followerId?: string; isFollowing?: boolean; isFollowedBy?: boolean }) => {
      // FIXED: Allow events where isFollowing is undefined (e.g., when someone follows/unfollows current user)
      if (!data.followerId) {
        console.warn('⚠️ [useAuth] Invalid followStatusChanged event (missing followerId):', data);
        return;
      }

      // CRITICAL FIX: Deduplicate events - ignore if we just processed the same event
      const eventKey = `${data.userId}-${data.followerId}`;
      const now = Date.now();
      if (lastProcessedEventRef.current && 
          lastProcessedEventRef.current.userId === data.userId &&
          lastProcessedEventRef.current.followerId === data.followerId &&
          (now - lastProcessedEventRef.current.timestamp) < EVENT_DEDUP_WINDOW) {
        console.log('⏭️ [useAuth] Skipping duplicate followStatusChanged event (deduplication):', data);
        return;
      }
      lastProcessedEventRef.current = { userId: data.userId, followerId: data.followerId, timestamp: now };

      console.log('🔔 [useAuth] Received followStatusChanged:', {
        userId: data.userId,
        followerId: data.followerId,
        currentUserId,
        isFollowing: data.isFollowing,
        isFollowedBy: data.isFollowedBy
      });

      // Case 1: Current user is following/unfollowing someone (followerId is current user)
      // Event: { userId: targetUser, followerId: currentUser, isFollowing: true/false, isFollowedBy: mutual }
      // This updates the cache for any profile the current user is viewing
      if (data.followerId === currentUserId) {
        console.log('✅ [useAuth] Updating follow status: current user action');
        handleFollowStatusChanged({
          userId: data.userId,
          isFollowing: data.isFollowing,
          isFollowedBy: data.isFollowedBy,
        });
      }
      // Case 2: Someone is following/unfollowing the current user (userId is current user)
      // Event structure: 
      //   Follow: { userId: currentUser, followerId: theFollower, isFollowing: false, isFollowedBy: true }
      //   Unfollow: { userId: currentUser, followerId: theFollower, isFollowing: false, isFollowedBy: false }
      // This means: theFollower followed/unfollowed currentUser
      // 
      // CRITICAL: We should ONLY update followKeys.followedBy(theFollower) using the event's isFollowedBy value
      // We should NOT update followKeys.following(theFollower) because:
      // - isFollowing: false in the event means "currentUser is NOT following theFollower"
      // - But we don't know the actual state - currentUser might have been following theFollower before
      // - Setting it to false would overwrite the actual state
      else if (data.userId === currentUserId && data.followerId) {
        console.log('✅ [useAuth] Updating followedBy status: someone followed/unfollowed current user');
        // Only update isFollowedBy - use the event's isFollowedBy value (true for follow, false for unfollow)
        // FIXED: Don't hardcode to true - use the actual event data
        handleFollowStatusChanged({
          userId: data.followerId,
          isFollowing: undefined, // CRITICAL: Don't update - we don't know if current user follows them
          isFollowedBy: data.isFollowedBy ?? false, // Use event's isFollowedBy value (true for follow, false for unfollow)
        });
      }
    };

    // Handle followerCountUpdated (future event - backend may emit this later)
    const handleFollowerCountUpdate = (data: { userId: string; followerCount: number; followingCount: number }) => {
      // Only handle if it's for the current user
      if (data.userId === currentUserId) {
        handleFollowerCountUpdated(data);
      }
    };

    // Set up event listeners
    // Backend currently emits: profileImageUpdated
    on('profileImageUpdated', handleProfileImageUpdate);
    
    // Future events (if backend adds them):
    on('userProfileUpdated', handleUserProfileUpdate);
    on('followStatusChanged', handleFollowStatusChange);
    on('followerCountUpdated', handleFollowerCountUpdate);

    return () => {
      // Clean up event listeners
      off('profileImageUpdated', handleProfileImageUpdate);
      off('userProfileUpdated', handleUserProfileUpdate);
      off('followStatusChanged', handleFollowStatusChange);
      off('followerCountUpdated', handleFollowerCountUpdate);
    };
  }, [socket, isConnected, isSignedIn, currentUserId, on, off, handleUserProfileUpdated, handleProfileImageUpdated, handleFollowStatusChanged, handleFollowerCountUpdated]);

  // Main effect to handle authentication state changes
  // Now uses React Query data instead of direct API calls
  useEffect(() => {
    if (!isLoaded) return;

    // Create a unique key for this initialization
    const currentKey = `${isSignedIn}-${betterAuthUser?.id || 'none'}`;
    
    // Skip if we've already initialized for this state
    if (initializationRef.current === currentKey) return;
    initializationRef.current = currentKey;

    const isLoading = userLoading || suspensionLoading;

    setAuthState(prev => ({ 
      ...prev, 
      isLoaded, 
      isSignedIn,
      isLoading,
    }));

    if (isSignedIn && betterAuthUser) {
      // Check suspension status from React Query
      const isSuspended = suspensionData?.suspended || false;
      
      if (isSuspended) {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          isSuspended: true,
          error: 'Account suspended',
          user: null,
        }));
        return;
      }

      // Use user data from React Query
      if (userData) {
        setAuthState(prev => ({
          ...prev,
          user: userData,
          isLoading: false,
          error: null,
          isSuspended: false,
        }));
        
        // Initialize global store with user images (only if not already set or if different)
        const { updateCurrentUserImage, getUserImage } = useUserStore.getState();
        const currentStoreProfile = getUserImage('current', 'profile', null);
        const currentStoreCover = getUserImage('current', 'cover', null);
        
        // Only update if different or if store is empty
        if (userData.profileImageUrl && 
            (userData.profileImageUrl !== currentStoreProfile || !currentStoreProfile)) {
          updateCurrentUserImage('profile', userData.profileImageUrl);
        }
        if (userData.coverImageUrl && 
            (userData.coverImageUrl !== currentStoreCover || !currentStoreCover)) {
          updateCurrentUserImage('cover', userData.coverImageUrl);
        }
      } else if (userError) {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: (userError as any)?.message || 'Failed to load user data',
          user: null,
        }));
      }
    } else {
      // Clear state when signed out
      setAuthState(prev => ({
        ...prev,
        user: null,
        isLoading: false,
        error: null,
        isSuspended: false,
      }));
    }
  }, [isSignedIn, isLoaded, betterAuthUser?.id, userData, userLoading, userError, suspensionData, suspensionLoading]);

  return {
    ...authState,
    checkSuspension,
    fetchUserData,
    refreshUserData,
    clearError,
  };
};

export const useAuth = useAuthWithBackend;
export default useAuthWithBackend;