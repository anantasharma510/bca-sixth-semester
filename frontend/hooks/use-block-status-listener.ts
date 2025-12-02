import { useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';

interface BlockStatusChangeEvent {
  type: 'blockedByUser' | 'unblockedByUser' | 'userBlocked' | 'userUnblocked';
  userId: string;
  action: 'blocked' | 'unblocked';
}

export function useBlockStatusListener(
  targetUserId: string,
  onBlockStatusChange?: (event: BlockStatusChangeEvent) => void
) {
  const { user } = useAuth();
  const currentUserId = user?.id;

  const handleBlockStatusChange = useCallback((event: CustomEvent<BlockStatusChangeEvent>) => {
    const { type, userId, action } = event.detail;
    
    // Only handle events related to the target user
    if (userId !== targetUserId) return;
    
    // Call the callback if provided
    if (onBlockStatusChange) {
      onBlockStatusChange(event.detail);
    }
    
    // Handle specific cases
    switch (type) {
      case 'blockedByUser':
        // Current user was blocked by target user
        break;
      case 'unblockedByUser':
        // Current user was unblocked by target user
        break;
      case 'userBlocked':
        // Current user blocked target user
        break;
      case 'userUnblocked':
        // Current user unblocked target user
        break;
    }
  }, [targetUserId, onBlockStatusChange]);

  useEffect(() => {
    if (!currentUserId || !targetUserId) return;

    // Add event listener for block status changes
    window.addEventListener('blockStatusChanged', handleBlockStatusChange as EventListener);

    // Cleanup event listener
    return () => {
      window.removeEventListener('blockStatusChanged', handleBlockStatusChange as EventListener);
    };
  }, [currentUserId, targetUserId, handleBlockStatusChange]);
} 