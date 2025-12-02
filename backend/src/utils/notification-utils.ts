import { Notification } from '../models/notification.model';
import { io } from '../index';

export interface CreateNotificationData {
  recipient: string;
  sender: string;
  type: 'like' | 'comment' | 'repost' | 'follow' | 'mention';
  post?: string;
  comment?: string;
}

// Helper function to get human-readable time ago
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d`;
  } else if (diffInSeconds < 31536000) {
    const months = Math.floor(diffInSeconds / 2592000);
    return `${months}mo`;
  } else {
    const years = Math.floor(diffInSeconds / 31536000);
    return `${years}y`;
  }
}

export async function createAndEmitNotification(data: CreateNotificationData): Promise<void> {
  try {
    // Don't create notification if sender is the same as recipient
    if (data.sender === data.recipient) {
      return;
    }

    const notification = await Notification.create({
      recipient: data.recipient,
      sender: data.sender,
      type: data.type,
      post: data.post,
      comment: data.comment,
    });

    // Populate sender information for socket emission
    await notification.populate('sender', 'username firstName lastName profileImageUrl');
    if (data.post) {
      await notification.populate('post', 'content');
    }
    if (data.comment) {
      await notification.populate('comment', 'content');
    }

    // Emit real-time notification
    io.to(`user_${data.recipient}`).emit('newNotification', {
      _id: notification._id,
      type: notification.type,
      sender: notification.sender,
      post: notification.post,
      comment: notification.comment,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
      timeAgo: getTimeAgo(notification.createdAt)
    });

    // Update unread count for the recipient
    const unreadCount = await Notification.countDocuments({ 
      recipient: data.recipient, 
      isRead: false 
    });
    io.to(`user_${data.recipient}`).emit('unreadCountUpdate', { unreadCount });

    console.log(`Notification created and emitted for ${data.type} from ${data.sender} to ${data.recipient}`);
  } catch (error) {
    console.error('Error creating notification:', error);
    // Don't throw error to avoid breaking the main functionality
  }
} 