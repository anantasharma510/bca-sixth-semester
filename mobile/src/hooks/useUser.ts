import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api/client';
import { User, SuspensionCheckResponse } from '../types/api';
import { useAuth as useBetterAuth } from './useAuth';

/**
 * Query keys for user-related queries
 */
export const userKeys = {
  all: ['user'] as const,
  current: () => [...userKeys.all, 'current'] as const,
  suspension: () => [...userKeys.all, 'suspension'] as const,
};

/**
 * Hook to fetch current user data from /protected endpoint
 * Uses React Query for caching and deduplication
 */
export function useCurrentUser() {
  const { isSignedIn } = useBetterAuth();

  return useQuery({
    queryKey: userKeys.current(),
    queryFn: async () => {
      try {
        const response = await apiClient.get<{ user: User }>('/protected');
        return response.user;
      } catch (error: any) {
        console.error('[useCurrentUser] Error fetching user data:', error);
        throw error; // Re-throw to let React Query handle it
      }
    },
    enabled: isSignedIn, // Only fetch when signed in
    staleTime: 2 * 60 * 1000, // 2 minutes - user data doesn't change often
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnMount: false, // Don't refetch on every mount
    refetchOnWindowFocus: false, // Don't refetch on focus
    refetchOnReconnect: false, // Don't refetch on reconnect
    retry: 1, // Only retry once on failure
  });
}

/**
 * Hook to check suspension status
 * Uses React Query for caching and deduplication
 */
export function useSuspensionCheck() {
  const { isSignedIn } = useBetterAuth();

  return useQuery({
    queryKey: userKeys.suspension(),
    queryFn: async () => {
      try {
        const response = await apiClient.get<SuspensionCheckResponse>(
          '/protected/check-suspension'
        );
        return response;
      } catch (error: any) {
        console.error('[useSuspensionCheck] Error checking suspension:', error);
        throw error; // Re-throw to let React Query handle it
      }
    },
    enabled: isSignedIn, // Only fetch when signed in
    staleTime: 1 * 60 * 1000, // 1 minute - check suspension more frequently than user data
    gcTime: 3 * 60 * 1000, // 3 minutes cache
    refetchOnMount: false, // Don't refetch on every mount
    refetchOnWindowFocus: false, // Don't refetch on focus
    refetchOnReconnect: false, // Don't refetch on reconnect
    retry: 1, // Only retry once on failure
  });
}

/**
 * Hook to invalidate and refetch user data
 * Use this when user data is updated (e.g., after profile edit)
 */
export function useRefreshUser() {
  const queryClient = useQueryClient();

  return {
    refreshUser: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.current() });
    },
    refreshSuspension: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.suspension() });
    },
    refreshAll: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
    clearCache: () => {
      // Clear all user-related cache (useful on sign out)
      queryClient.removeQueries({ queryKey: userKeys.all });
    },
  };
}

