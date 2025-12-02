import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { apiClient } from '../services/api/client';
import { useAuth } from './auth/useAuth';

/**
 * Query keys for follow-related queries
 */
export const followKeys = {
  all: ['follows'] as const,
  status: (userId: string) => [...followKeys.all, 'status', userId] as const,
  following: (userId: string) => [...followKeys.all, 'following', userId] as const,
  followedBy: (userId: string) => [...followKeys.all, 'followed-by', userId] as const,
};

/**
 * Hook to check if current user is following a specific user
 */
export function useFollowingStatus(userId: string) {
  const { isSignedIn } = useAuth();

  return useQuery({
    queryKey: followKeys.following(userId),
    queryFn: async () => {
      const response = await apiClient.get<{ isFollowing: boolean }>(
        `/follows/${userId}/following`
      );
      return response.isFollowing;
    },
    enabled: isSignedIn && !!userId, // Only fetch when signed in and userId exists
    staleTime: 30 * 1000, // 30 seconds - follow status can change
    gcTime: 2 * 60 * 1000, // 2 minutes cache
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}

/**
 * Hook to check if a specific user is following the current user
 */
export function useFollowedByStatus(userId: string) {
  const { isSignedIn } = useAuth();

  return useQuery({
    queryKey: followKeys.followedBy(userId),
    queryFn: async () => {
      const response = await apiClient.get<{ isFollowedBy: boolean }>(
        `/follows/${userId}/followed-by`
      );
      return response.isFollowedBy;
    },
    enabled: isSignedIn && !!userId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes cache
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}

/**
 * Hook to get both following and followed-by status
 */
export function useFollowStatus(userId: string) {
  const followingQuery = useFollowingStatus(userId);
  const followedByQuery = useFollowedByStatus(userId);

  return {
    isFollowing: followingQuery.data ?? false,
    isFollowedBy: followedByQuery.data ?? false,
    isLoading: followingQuery.isLoading || followedByQuery.isLoading,
    isError: followingQuery.isError || followedByQuery.isError,
    refetch: async () => {
      await Promise.all([followingQuery.refetch(), followedByQuery.refetch()]);
    },
  };
}

/**
 * Hook to toggle follow status with optimistic updates
 */
export function useToggleFollow(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (isFollowing: boolean) => {
      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        throw new Error('Invalid user ID');
      }
      
      if (isFollowing) {
        await apiClient.delete(`/follows/${userId}/follow`);
      } else {
        await apiClient.post(`/follows/${userId}/follow`);
      }
    },
    onMutate: async (isFollowing) => {
      // Guard against invalid userId
      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        return { previousFollowing: undefined, previousFollowedBy: undefined };
      }
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: followKeys.status(userId) });

      // Snapshot previous values
      const previousFollowing = queryClient.getQueryData(followKeys.following(userId));
      const previousFollowedBy = queryClient.getQueryData(followKeys.followedBy(userId));

      // Optimistically update
      queryClient.setQueryData(followKeys.following(userId), !isFollowing);
      
      // Note: Don't optimistically set followedBy to true - it may not happen
      // The server will update this correctly, and we'll refetch onSettled

      return { previousFollowing, previousFollowedBy };
    },
    onError: (err, isFollowing, context) => {
      // Rollback on error
      if (context?.previousFollowing !== undefined) {
        queryClient.setQueryData(followKeys.following(userId), context.previousFollowing);
      }
      if (context?.previousFollowedBy !== undefined) {
        queryClient.setQueryData(followKeys.followedBy(userId), context.previousFollowedBy);
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency (only if userId is valid)
      if (userId && typeof userId === 'string' && userId.trim() !== '') {
        queryClient.invalidateQueries({ queryKey: followKeys.status(userId) });
      }
    },
  });
}

/**
 * Hook to refresh follow status
 */
export function useRefreshFollowStatus() {
  const queryClient = useQueryClient();

  return {
    refreshStatus: (userId: string) => {
      queryClient.invalidateQueries({ queryKey: followKeys.status(userId) });
    },
    refreshAll: () => {
      queryClient.invalidateQueries({ queryKey: followKeys.all });
    },
  };
}

/**
 * Hook to fetch follow suggestions
 */
export function useFollowSuggestions(limit: number = 5) {
  const { isSignedIn } = useAuth();

  return useQuery({
    queryKey: [...followKeys.all, 'suggestions', limit],
    queryFn: async () => {
      const response = await apiClient.get<{ suggestions: any[] }>(
        `/follows/suggestions?limit=${limit}`
      );
      return response.suggestions;
    },
    enabled: isSignedIn,
    staleTime: 2 * 60 * 1000, // 2 minutes - suggestions don't change often
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}

/**
 * Hook to fetch blocked users list
 */
export function useBlockedUsers() {
  const { isSignedIn } = useAuth();

  return useQuery({
    queryKey: ['blocks', 'blocked-users'],
    queryFn: async () => {
      const response = await apiClient.get<{ blockedUsers: { _id: string }[] }>(
        '/blocks/blocked-users'
      );
      return response.blockedUsers.map(u => u._id);
    },
    enabled: isSignedIn,
    staleTime: 1 * 60 * 1000, // 1 minute - block status can change
    gcTime: 3 * 60 * 1000, // 3 minutes cache
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}

