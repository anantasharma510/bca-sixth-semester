import { useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { useApiService } from '../services/api';

export function useSyncUserWithBackend() {
  const { isSignedIn } = useAuth();
  const { get: getApi } = useApiService();
  const hasSynced = useRef(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (isSignedIn && !hasSynced.current) {
      hasSynced.current = true;
      setSyncStatus('loading');
      
      // Add a small delay to ensure the session is fully established
      const syncWithDelay = async () => {
        try {
          await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay (reduced from 1 second)
          const res = await getApi('/protected');
          setSyncStatus('success');
        } catch (err: any) {
          // Handle authentication errors more gracefully
          if (err.response?.status === 401 || err.response?.status === 403 || err.message?.includes('401') || err.message?.includes('403')) {
            // console.log('Backend sync failed (this is normal for new users):', err.message || 'Authentication failed. Please sign in again.');
            // Reset the sync flag so it can retry
            hasSynced.current = false;
            setSyncStatus('idle');
            
            // Retry after a short delay
            setTimeout(() => {
              if (isSignedIn) {
                hasSynced.current = false;
              }
            }, 2000);
          } else {
            console.error('Failed to sync user with backend', err);
            setSyncStatus('error');
          }
        }
      };

      syncWithDelay();
    }
  }, [isSignedIn, getApi]);

  return { syncStatus };
} 