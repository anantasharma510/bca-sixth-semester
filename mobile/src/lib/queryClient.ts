import { QueryClient } from '@tanstack/react-query';

// Configure QueryClient with optimized defaults for mobile
// IMPORTANT: Socket.IO is the source of truth for real-time updates
// TanStack Query is used for initial fetching and caching only
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Long stale time - Socket.IO handles real-time updates
      // Only refetch if data is very old or on manual refresh
      staleTime: 10 * 60 * 1000, // 10 minutes - Socket.IO is source of truth
      // Keep unused data in cache for 15 minutes
      gcTime: 15 * 60 * 1000,
      // Retry failed requests 2 times with exponential backoff
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Don't refetch on window focus - Socket.IO handles updates
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect - Socket.IO handles reconnection
      refetchOnReconnect: false,
      // Only refetch on mount if data is very stale (older than staleTime)
      refetchOnMount: false, // Socket.IO handles real-time updates
      // Network mode: prefer online but allow offline reads
      networkMode: 'online',
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
      retryDelay: 1000,
      // Network mode for mutations
      networkMode: 'online',
    },
  },
});

