"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useSocket } from './socket-provider';
import { useNotificationApi } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

interface Notification {
  _id: string;
  type: 'like' | 'comment' | 'repost' | 'follow' | 'mention';
  sender: {
    _id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
  };
  post?: {
    _id: string;
    content: string;
  };
  comment?: {
    _id: string;
    content: string;
  };
  isRead: boolean;
  createdAt: string;
  timeAgo: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  loadMoreNotifications: () => Promise<void>;
  hasMoreNotifications: boolean;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const userId = user?.id;
  const { socket, isConnected } = useSocket();
  const { 
    getNotifications, 
    markNotificationAsRead, 
    markAllNotificationsAsRead, 
    deleteNotification: deleteNotificationApi,
    getNotificationCounts 
  } = useNotificationApi();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMoreNotifications, setHasMoreNotifications] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load initial notifications
  const loadNotifications = useCallback(async (page: number = 1, append: boolean = false) => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const response = await getNotifications(page);
      
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
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId, getNotifications]);

  // Load more notifications
  const loadMoreNotifications = useCallback(async () => {
    if (isLoading || !hasMoreNotifications) return;
    await loadNotifications(currentPage + 1, true);
  }, [isLoading, hasMoreNotifications, currentPage, loadNotifications]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification._id === notificationId 
            ? { ...notification, isRead: true }
            : notification
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive"
      });
    }
  }, [markNotificationAsRead]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await markAllNotificationsAsRead();
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, isRead: true }))
      );
      
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive"
      });
    }
  }, [markAllNotificationsAsRead]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await deleteNotificationApi(notificationId);
      
      // Update local state
      setNotifications(prev => 
        prev.filter(notification => notification._id !== notificationId)
      );
      
      // Update unread count if the deleted notification was unread
      const deletedNotification = notifications.find(n => n._id === notificationId);
      if (deletedNotification && !deletedNotification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive"
      });
    }
  }, [deleteNotificationApi, notifications]);

  // Refresh notifications
  const refreshNotifications = useCallback(async () => {
    await loadNotifications(1, false);
  }, [loadNotifications]);

  // Update notification counts
  const updateNotificationCounts = useCallback(async () => {
    if (!userId) return;
    
    try {
      const counts = await getNotificationCounts();
      setUnreadCount(counts.unreadCount);
    } catch (error) {
      console.error('Failed to update notification counts:', error);
    }
  }, [userId, getNotificationCounts]);

  // Handle real-time notification events
  useEffect(() => {
    if (!socket || !isConnected || !userId) return;

    // Listen for new notifications
    const handleNewNotification = (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    };

    // Listen for notification updates
    const handleNotificationUpdate = (data: { notificationId: string; isRead: boolean }) => {
      setNotifications(prev => 
        prev.map(notification => 
          notification._id === data.notificationId 
            ? { ...notification, isRead: data.isRead }
            : notification
        )
      );
      
      if (data.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      } else {
        setUnreadCount(prev => prev + 1);
      }
    };

    // Listen for notification deletion
    const handleNotificationDelete = (data: { notificationId: string }) => {
      setNotifications(prev => 
        prev.filter(notification => notification._id !== data.notificationId)
      );
      
      // Update unread count if needed
      const deletedNotification = notifications.find(n => n._id === data.notificationId);
      if (deletedNotification && !deletedNotification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    };

    // Listen for unread count updates
    const handleUnreadCountUpdate = (data: { unreadCount: number }) => {
      setUnreadCount(data.unreadCount);
    };

    // Add event listeners
    socket.on('newNotification', handleNewNotification);
    socket.on('notificationUpdate', handleNotificationUpdate);
    socket.on('notificationDelete', handleNotificationDelete);
    socket.on('unreadCountUpdate', handleUnreadCountUpdate);

    // Cleanup
    return () => {
      socket.off('newNotification', handleNewNotification);
      socket.off('notificationUpdate', handleNotificationUpdate);
      socket.off('notificationDelete', handleNotificationDelete);
      socket.off('unreadCountUpdate', handleUnreadCountUpdate);
    };
  }, [socket, isConnected, userId, notifications]);

  // Load initial data
  useEffect(() => {
    if (userId && !isInitialized) {
      loadNotifications(1, false);
      updateNotificationCounts();
      setIsInitialized(true);
    }
  }, [userId, isInitialized, loadNotifications, updateNotificationCounts]);

  // Reset state when user changes
  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      setCurrentPage(1);
      setHasMoreNotifications(true);
      setIsInitialized(false);
    }
  }, [userId]);

  const contextValue: NotificationContextType = {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    loadMoreNotifications,
    hasMoreNotifications,
    refreshNotifications,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}; 