var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// @ts-nocheck
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { Notification } from '../models/notification.model';
const router = Router();
// Fixed asyncHandler to properly handle Express types
function asyncHandler(fn) {
    return function (req, res, next) {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
// Get user's notifications with pagination
router.get('/', requireAuth, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.userId;
    const currentUserId = userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    console.log('Backend: Getting notifications for user:', currentUserId, 'page:', page, 'limit:', limit);
    // Get notifications with sender and post/comment details
    const notifications = yield Notification.find({ recipient: currentUserId })
        .populate('sender', 'username firstName lastName profileImageUrl')
        .populate('post', 'content')
        .populate('comment', 'content')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    // Get total count for pagination
    const totalNotifications = yield Notification.countDocuments({ recipient: currentUserId });
    // Get unread count
    const unreadCount = yield Notification.countDocuments({
        recipient: currentUserId,
        isRead: false
    });
    const response = {
        notifications: notifications.map((notification) => ({
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
})));
// Mark notification as read
router.put('/:notificationId/read', requireAuth, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.userId;
    const { notificationId } = req.params;
    const notification = yield Notification.findOneAndUpdate({ _id: notificationId, recipient: userId }, { isRead: true }, { new: true });
    if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
    }
    res.json({ success: true, notification });
})));
// Mark all notifications as read
router.put('/read-all', requireAuth, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.userId;
    const result = yield Notification.updateMany({ recipient: userId, isRead: false }, { isRead: true });
    res.json({
        success: true,
        message: `Marked ${result.modifiedCount} notifications as read`
    });
})));
// Delete a notification
router.delete('/:notificationId', requireAuth, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.userId;
    const { notificationId } = req.params;
    const notification = yield Notification.findOneAndDelete({
        _id: notificationId,
        recipient: userId
    });
    if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
    }
    res.json({ success: true, message: 'Notification deleted successfully' });
})));
// Get notification counts (unread, total)
router.get('/counts', requireAuth, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.userId;
    const currentUserId = userId;
    const [unreadCount, totalCount] = yield Promise.all([
        Notification.countDocuments({ recipient: currentUserId, isRead: false }),
        Notification.countDocuments({ recipient: currentUserId })
    ]);
    res.json({
        unreadCount,
        totalCount
    });
})));
// Helper function to get human-readable time ago
function getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 60) {
        return 'just now';
    }
    else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes}m`;
    }
    else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours}h`;
    }
    else if (diffInSeconds < 2592000) {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days}d`;
    }
    else if (diffInSeconds < 31536000) {
        const months = Math.floor(diffInSeconds / 2592000);
        return `${months}mo`;
    }
    else {
        const years = Math.floor(diffInSeconds / 31536000);
        return `${years}y`;
    }
}
export default router;
