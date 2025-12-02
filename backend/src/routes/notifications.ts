// @ts-nocheck
import { Request, Response, NextFunction, Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { Notification } from '../models/notification.model';
import { User } from '../models/user.model';
import { Post } from '../models/post.model';
import { Comment } from '../models/comment.model';

const router = Router();

// Fixed asyncHandler to properly handle Express types
function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return function (req: Request, res: Response, next: NextFunction) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Get user's notifications with pagination
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
      const userId = (req as any).userId;
    const currentUserId = userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    console.log('Backend: Getting notifications for user:', currentUserId, 'page:', page, 'limit:', limit);

    // Get notifications with sender and post/comment details
    const notifications = await Notification.find({ recipient: currentUserId })
      .populate('sender', 'username firstName lastName profileImageUrl')
      .populate('post', 'content')
      .populate('comment', 'content')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const totalNotifications = await Notification.countDocuments({ recipient: currentUserId });

    // Get unread count
    const unreadCount = await Notification.countDocuments({ 
      recipient: currentUserId, 
      isRead: false 
    });

    const response = {
      notifications: notifications.map((notification: any) => ({
        _id: notification._id,
        type: notification.type,
        sender: notification.sender,
        post: notification.post,
        comment: notification.comment,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
        // Add human-readable time
        timeAgo: getTimeAgo(notification.createdAt)
      })),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalNotifications / limit),
        totalNotifications,
        unreadCount,
        hasNextPage: page * limit < totalNotifications,
        hasPrevPage: page > 1
      }
    };

    console.log('Backend: Found notifications:', notifications.length, 'unread:', unreadCount);
    res.json(response);
  })
);

// Mark notification as read
router.put(
  '/:notificationId/read',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
      const userId = (req as any).userId;
    const { notificationId } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true, notification });
  })
);

// Mark all notifications as read
router.put(
  '/read-all',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
      const userId = (req as any).userId;

    const result = await Notification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true }
    );

    res.json({ 
      success: true, 
      message: `Marked ${result.modifiedCount} notifications as read` 
    });
  })
);

// Delete a notification
router.delete(
  '/:notificationId',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
      const userId = (req as any).userId;
    const { notificationId } = req.params;

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      recipient: userId
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true, message: 'Notification deleted successfully' });
  })
);

// Get notification counts (unread, total)
router.get(
  '/counts',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
      const userId = (req as any).userId;
    const currentUserId = userId;

    const [unreadCount, totalCount] = await Promise.all([
      Notification.countDocuments({ recipient: currentUserId, isRead: false }),
      Notification.countDocuments({ recipient: currentUserId })
    ]);

    res.json({
      unreadCount,
      totalCount
    });
  })
);

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

export default router; 