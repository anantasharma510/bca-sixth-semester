import { useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';

export function useBlockEvents() {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const router = useRouter();

  const handleUserBlockedYou = useCallback((event: CustomEvent) => {
    const { blockedBy } = event.detail;
    
    // If we're currently viewing the profile of the user who blocked us, redirect
    const currentPath = window.location.pathname;
    if (currentPath.includes(`/profile/${blockedBy}`)) {
      router.push('/');
      return;
    }
    
    // Dispatch a custom event for components to handle
    window.dispatchEvent(new CustomEvent('blockStatusChanged', { 
      detail: { 
        type: 'blockedByUser', 
        userId: blockedBy,
        action: 'blocked'
      } 
    }));
  }, [router]);

  const handleUserUnblockedYou = useCallback((event: CustomEvent) => {
    const { unblockedBy } = event.detail;
    
    // Dispatch a custom event for components to handle
    window.dispatchEvent(new CustomEvent('blockStatusChanged', { 
      detail: { 
        type: 'unblockedByUser', 
        userId: unblockedBy,
        action: 'unblocked'
      } 
    }));
  }, []);

  const handleBlockConfirmed = useCallback((event: CustomEvent) => {
    const { blockedUserId } = event.detail;
    
    // If we're currently viewing the profile of the user we blocked, redirect
    const currentPath = window.location.pathname;
    if (currentPath.includes(`/profile/${blockedUserId}`)) {
      router.push('/');
      return;
    }
    
    // Dispatch a custom event for components to handle
    window.dispatchEvent(new CustomEvent('blockStatusChanged', { 
      detail: { 
        type: 'userBlocked', 
        userId: blockedUserId,
        action: 'blocked'
      } 
    }));
  }, [router]);

  const handleUnblockConfirmed = useCallback((event: CustomEvent) => {
    const { unblockedUserId } = event.detail;
    
    // Dispatch a custom event for components to handle
    window.dispatchEvent(new CustomEvent('blockStatusChanged', { 
      detail: { 
        type: 'userUnblocked', 
        userId: unblockedUserId,
        action: 'unblocked'
      } 
    }));
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    // Add event listeners for block events
    window.addEventListener('userBlockedYou', handleUserBlockedYou as EventListener);
    window.addEventListener('userUnblockedYou', handleUserUnblockedYou as EventListener);
    window.addEventListener('blockConfirmed', handleBlockConfirmed as EventListener);
    window.addEventListener('unblockConfirmed', handleUnblockConfirmed as EventListener);

    // Cleanup event listeners
    return () => {
      window.removeEventListener('userBlockedYou', handleUserBlockedYou as EventListener);
      window.removeEventListener('userUnblockedYou', handleUserUnblockedYou as EventListener);
      window.removeEventListener('blockConfirmed', handleBlockConfirmed as EventListener);
      window.removeEventListener('unblockConfirmed', handleUnblockConfirmed as EventListener);
    };
  }, [currentUserId, handleUserBlockedYou, handleUserUnblockedYou, handleBlockConfirmed, handleUnblockConfirmed]);
} 