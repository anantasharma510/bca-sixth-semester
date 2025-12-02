import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { notificationAPI, Notification } from '../services/api/notifications';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  loadNotifications: (page?: number, append?: boolean) => Promise<void>;
  currentPage: number;
  hasMoreNotifications: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isSignedIn } = useAuth();
  const userId = user?._id || user?.id; // Use _id like Header does for stability
  const { socket, isConnected, on, off, emit } = useSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreNotifications, setHasMoreNotifications] = useState(true);
  
  // Store userId and isSignedIn in refs to avoid unnecessary effect re-runs and cleanup cycles
  // This prevents listeners from being cleaned up when userId temporarily changes
  const userIdRef = useRef<string | undefined>(userId);
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);
  
  const isSignedInRef = useRef<boolean>(isSignedIn);
  useEffect(() => {
    isSignedInRef.current = isSignedIn;
  }, [isSignedIn]);
  
  // Track if we're currently attempting to join user room to prevent duplicate calls on rapid reconnections
  const isJoiningUserRoomRef = useRef(false);
  // Track previous connection state to detect reconnections (starts as null to detect first connection)
  const prevIsConnectedRef = useRef<boolean | null>(null);
  // Track if this is the initial mount to avoid false reconnection detection
  const isInitialMountRef = useRef(true);
  // Track timeout references for cleanup
  const joinTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resetJoiningFlagTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Track timeout for AppState reload to prevent duplicate calls
  const appStateReloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Track timeout for reconnection reload
  const reconnectionReloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadNotifications = useCallback(async (page: number = 1, append: boolean = false) => {
    if (!userId || !isSignedIn) return;
    setIsLoading(true);
    try {
      const response = await notificationAPI.getNotifications(page, 20);
      if (append) {
        setNotifications(prev => [...prev, ...response.notifications]);
      } else {
        setNotifications(response.notifications);
      }
      setUnreadCount(response.pagination.unreadCount);
      setHasMoreNotifications(response.pagination.hasNextPage);
      setCurrentPage(page);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, userId]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationAPI.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(notification =>
          notification._id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );
      const notification = notifications.find(n => n._id === notificationId);
      if (notification && !notification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [notifications]);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(prev => prev.map(notification => ({ ...notification, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const notificationToDelete = notifications.find(n => n._id === notificationId);
      await notificationAPI.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(notification => notification._id !== notificationId));
      if (notificationToDelete && !notificationToDelete.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, [notifications]);

  // Initial load of notifications when user signs in
  // This should only run when userId/isSignedIn changes, not when socket state changes
  useEffect(() => {
    const currentUserId = userIdRef.current;
    const currentIsSignedIn = isSignedInRef.current;
    
    if (currentUserId && currentIsSignedIn) {
      loadNotifications(1, false);
      // Mark that initial mount is complete after first load
      if (isInitialMountRef.current) {
        // Set previous connection state to current state on initial mount
        // This prevents false reconnection detection on initial mount
        prevIsConnectedRef.current = Boolean(isConnected && socket && socket.connected);
        isInitialMountRef.current = false;
      }
    } else {
      // Reset initial mount flag if user signs out
      isInitialMountRef.current = true;
      prevIsConnectedRef.current = null;
      // Clean up any pending timeouts when user signs out
      if (reconnectionReloadTimeoutRef.current) {
        clearTimeout(reconnectionReloadTimeoutRef.current);
        reconnectionReloadTimeoutRef.current = null;
      }
      if (appStateReloadTimeoutRef.current) {
        clearTimeout(appStateReloadTimeoutRef.current);
        appStateReloadTimeoutRef.current = null;
      }
    }
  }, [userId, isSignedIn, loadNotifications, isConnected, socket]);

  // Detect socket reconnection and reload notifications
  // This ensures we have the latest notification count after reconnecting
  useEffect(() => {
    // Clean up any pending reconnection reload timeout first
    if (reconnectionReloadTimeoutRef.current) {
      clearTimeout(reconnectionReloadTimeoutRef.current);
      reconnectionReloadTimeoutRef.current = null;
    }

    // Skip detection on initial mount (handled by initial load effect above)
    if (isInitialMountRef.current) {
      // Update previous connection state for tracking
      prevIsConnectedRef.current = Boolean(isConnected && socket && socket.connected);
      return;
    }

    // Detect transition from disconnected to connected (reconnection)
    const wasDisconnected = prevIsConnectedRef.current === false;
    const isNowConnected = Boolean(isConnected && socket && socket.connected);

    // If we just reconnected (not initial connection), reload notifications to get latest count
    // Use refs to get current values
    if (wasDisconnected && isNowConnected && userIdRef.current && isSignedInRef.current) {
      console.log('📱 [NotificationContext] Socket reconnected - reloading notifications');
      // Small delay to ensure socket is fully ready before loading
      reconnectionReloadTimeoutRef.current = setTimeout(() => {
        // Double-check conditions at timeout execution using refs
        if (userIdRef.current && isSignedInRef.current) {
          loadNotifications(1, false);
        }
        reconnectionReloadTimeoutRef.current = null;
      }, 200);
    }

    // Update previous connection state for next comparison (always boolean)
    // This must happen AFTER we check for reconnection, not before
    prevIsConnectedRef.current = isNowConnected;

    return () => {
      // Cleanup: cancel timeout if effect re-runs or component unmounts
      if (reconnectionReloadTimeoutRef.current) {
        clearTimeout(reconnectionReloadTimeoutRef.current);
        reconnectionReloadTimeoutRef.current = null;
      }
    };
  }, [isConnected, socket, userId, isSignedIn, loadNotifications]);

  // Join user room for notifications
  // This ensures we're in the notification room for receiving real-time updates
  useEffect(() => {
    // Cleanup any pending timeouts first
    if (joinTimeoutRef.current) {
      clearTimeout(joinTimeoutRef.current);
      joinTimeoutRef.current = null;
    }
    if (resetJoiningFlagTimeoutRef.current) {
      clearTimeout(resetJoiningFlagTimeoutRef.current);
      resetJoiningFlagTimeoutRef.current = null;
    }

    // Use ref for userId to avoid unnecessary re-runs
    const currentUserId = userIdRef.current;
    if (!socket || !isConnected || !currentUserId) {
      // Reset joining flag when conditions aren't met
      isJoiningUserRoomRef.current = false;
      return;
    }

    // Add a small delay to ensure socket is fully ready after connection/reconnection
    // This prevents race conditions where joinUserRoom is called before socket is fully connected
    joinTimeoutRef.current = setTimeout(() => {
      // Double-check conditions at timeout execution time (socket might have disconnected)
      // Use ref to get current userId value
      const userIdAtExecution = userIdRef.current;
      if (
        !isJoiningUserRoomRef.current &&
        socket &&
        socket.connected &&
        userIdAtExecution &&
        isConnected
      ) {
        isJoiningUserRoomRef.current = true;
        console.log('📱 [NotificationContext] Joining user room for notifications:', userIdAtExecution);
        emit('joinUserRoom', userIdAtExecution);
        
        // Reset joining flag after a short delay to allow for reconnections
        // Store reference so we can clean it up if needed
        resetJoiningFlagTimeoutRef.current = setTimeout(() => {
          isJoiningUserRoomRef.current = false;
          resetJoiningFlagTimeoutRef.current = null;
        }, 500);
      } else {
        console.log('📱 [NotificationContext] Skipping joinUserRoom - conditions not met:', {
          alreadyJoining: isJoiningUserRoomRef.current,
          hasSocket: !!socket,
          socketConnected: socket?.connected,
          hasUserId: !!userIdAtExecution,
          isConnectedState: isConnected
        });
      }
      // Clear the join timeout reference after it executes
      joinTimeoutRef.current = null;
    }, 100); // Small delay to ensure socket is fully ready

    return () => {
      // Cleanup: cancel all timeouts if effect re-runs or component unmounts
      // This prevents duplicate joins on rapid reconnections and memory leaks
      if (joinTimeoutRef.current) {
        clearTimeout(joinTimeoutRef.current);
        joinTimeoutRef.current = null;
      }
      if (resetJoiningFlagTimeoutRef.current) {
        clearTimeout(resetJoiningFlagTimeoutRef.current);
        resetJoiningFlagTimeoutRef.current = null;
      }
      // Don't reset isJoiningUserRoomRef here - let it be handled by timeouts or next join attempt
    };
    // Only depend on socket and isConnected - use ref for userId to avoid re-runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, isConnected, emit]);

  // Real-time socket event listeners
  // Use ref for userId to prevent unnecessary cleanup/re-attachment cycles
  useEffect(() => {
    // Check both socket connection and userId (via ref for stability)
    if (!socket || !isConnected || !userIdRef.current) {
      console.log('📱 [NotificationContext] Socket listeners not attached - missing:', {
        hasSocket: !!socket,
        isConnected,
        hasUserId: !!userIdRef.current
      });
      return;
    }

    console.log('📱 [NotificationContext] Setting up socket event listeners for notifications, userId:', userIdRef.current);

    const handleNewNotification = (notification: Notification) => {
      console.log('📱 [NotificationContext] New notification received:', notification);
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => {
        const newCount = prev + 1;
        console.log('📱 [NotificationContext] Unread count updated:', newCount);
        return newCount;
      });
    };

    const handleNotificationUpdate = (data: { notificationId: string; isRead: boolean }) => {
      console.log('📱 [NotificationContext] Notification update received:', data);
      setNotifications(prev =>
        prev.map(notification =>
          notification._id === data.notificationId
            ? { ...notification, isRead: data.isRead }
            : notification
        )
      );
      if (data.isRead) {
        setUnreadCount(prev => {
          const newCount = Math.max(0, prev - 1);
          console.log('📱 [NotificationContext] Unread count decremented:', newCount);
          return newCount;
        });
      } else {
        setUnreadCount(prev => {
          const newCount = prev + 1;
          console.log('📱 [NotificationContext] Unread count incremented:', newCount);
          return newCount;
        });
      }
    };

    const handleUnreadCountUpdate = (data: { unreadCount: number }) => {
      console.log('📱 [NotificationContext] Unread count update received:', data.unreadCount);
      setUnreadCount(data.unreadCount);
    };

    // Use on/off from useSocket hook instead of socket.on/off directly
    // This ensures we always use the current socket instance, even after reconnections
    on('newNotification', handleNewNotification);
    on('notificationUpdate', handleNotificationUpdate);
    on('unreadCountUpdate', handleUnreadCountUpdate);

    console.log('📱 [NotificationContext] Socket event listeners attached successfully');

    return () => {
      console.log('📱 [NotificationContext] Cleaning up socket event listeners');
      off('newNotification', handleNewNotification);
      off('notificationUpdate', handleNotificationUpdate);
      off('unreadCountUpdate', handleUnreadCountUpdate);
    };
    // Only depend on socket and isConnected, not userId - use ref instead
    // This prevents unnecessary cleanup/re-attachment when userId temporarily changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, isConnected, on, off]);


  // Listen for app state changes to reload notifications when app comes to foreground
  // This catches notifications that were received while the app was in background
  useEffect(() => {
    // Use refs to check current state - avoids unnecessary cleanup cycles
    if (!userIdRef.current || !isSignedInRef.current) {
      // Clean up any pending timeout if user signs out
      if (appStateReloadTimeoutRef.current) {
        clearTimeout(appStateReloadTimeoutRef.current);
        appStateReloadTimeoutRef.current = null;
      }
      return;
    }

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // When app comes to foreground (active state), reload notifications to sync count
      if (nextAppState === 'active') {
        // Clear any pending reload timeout to prevent duplicates
        if (appStateReloadTimeoutRef.current) {
          clearTimeout(appStateReloadTimeoutRef.current);
          appStateReloadTimeoutRef.current = null;
        }

        console.log('📱 [NotificationContext] App came to foreground - reloading notifications');
        // Small delay to ensure socket/auth are ready
        appStateReloadTimeoutRef.current = setTimeout(() => {
          // Use refs to check current state at execution time
          if (userIdRef.current && isSignedInRef.current) {
            loadNotifications(1, false);
          }
          appStateReloadTimeoutRef.current = null;
        }, 300);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      // Cleanup any pending timeout on unmount
      if (appStateReloadTimeoutRef.current) {
        clearTimeout(appStateReloadTimeoutRef.current);
        appStateReloadTimeoutRef.current = null;
      }
    };
    // Keep userId and isSignedIn in dependencies for effect re-run when they change
    // But use refs in logic to prevent cleanup cycles
  }, [userId, isSignedIn, loadNotifications]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, isLoading, markAsRead, markAllAsRead, deleteNotification, loadNotifications, currentPage, hasMoreNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}; 