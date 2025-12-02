import { apiClient } from './client';

export interface NotificationPagination {
  currentPage: number;
  totalPages: number;
  totalNotifications: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  unreadCount: number;
}

export interface Notification {
  _id: string;
  type: 'like' | 'comment' | 'follow' | 'repost' | 'mention';
  isRead: boolean;
  createdAt: string;
  timeAgo?: string;
  sender?: {
    _id: string;
    username?: string;
    firstName: string;
    lastName: string;
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
  // Computed field
  message?: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  pagination: NotificationPagination;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

class NotificationAPI {
  /**
   * Generate human-readable message from notification data
   */
  private generateNotificationMessage(notification: any): string {
    const senderName = notification?.sender 
      ? `${notification.sender.firstName || ''} ${notification.sender.lastName || ''}`.trim()
      : 'Someone';

    switch (notification.type) {
      case 'like':
        return `${senderName} liked your post`;
      case 'comment':
        return `${senderName} commented on your post`;
      case 'repost':
        return `${senderName} reposted your post`;
      case 'follow':
        return `${senderName} started following you`;
      case 'mention':
        return `${senderName} mentioned you in a post`;
      default:
        return `${senderName} interacted with your content`;
    }
  }

  /**
   * Transform backend notification to frontend format
   */
  private transformNotification(notification: any): Notification {
    return {
      ...notification,
      message: this.generateNotificationMessage(notification)
    };
  }

  /**
   * Get notifications with pagination
   */
  async getNotifications(page: number = 1, limit: number = 20): Promise<NotificationsResponse> {
    try {
      console.log('Notification API: Getting notifications, page:', page, 'limit:', limit);
      const response: any = await apiClient.get(`/notifications?page=${page}&limit=${limit}`);
      console.log('Notification API: Received response:', response);
      
      // Transform notifications to include message field
      const transformedNotifications = response.notifications.map((notification: any) => 
        this.transformNotification(notification)
      );
      
      return {
        notifications: transformedNotifications,
        pagination: response.pagination
      } as NotificationsResponse;
    } catch (error) {
      console.error('Notification API: Error getting notifications:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<UnreadCountResponse> {
    try {
      console.log('Notification API: Getting unread count');
      const response = await apiClient.get('/notifications/counts');
      console.log('Notification API: Unread count response:', response);
      return { unreadCount: (response as any).unreadCount } as UnreadCountResponse;
    } catch (error) {
      console.error('Notification API: Error getting unread count:', error);
      throw error;
    }
  }

  /**
   * Mark a specific notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      console.log('Notification API: Marking notification as read:', notificationId);
      await apiClient.put(`/notifications/${notificationId}/read`);
      console.log('Notification API: Successfully marked as read');
    } catch (error) {
      console.error('Notification API: Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    try {
      console.log('Notification API: Marking all notifications as read');
      await apiClient.put('/notifications/read-all');
      console.log('Notification API: Successfully marked all as read');
    } catch (error) {
      console.error('Notification API: Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete a specific notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      console.log('Notification API: Deleting notification:', notificationId);
      await apiClient.delete(`/notifications/${notificationId}`);
      console.log('Notification API: Successfully deleted notification');
    } catch (error) {
      console.error('Notification API: Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Delete all notifications
   */
  async deleteAllNotifications(): Promise<void> {
    try {
      console.log('Notification API: Deleting all notifications');
      await apiClient.delete('/notifications/all');
      console.log('Notification API: Successfully deleted all notifications');
    } catch (error) {
      console.error('Notification API: Error deleting all notifications:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const notificationAPI = new NotificationAPI();
export default notificationAPI; 