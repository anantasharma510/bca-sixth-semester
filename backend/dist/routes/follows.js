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
import { Follow } from '../models/follow.model';
import { User } from '../models/user.model';
import { Block } from '../models/block.model';
import { requireAuth } from '../middleware/auth';
import { validationResult, param, query } from 'express-validator';
import { createAndEmitNotification } from '../utils/notification-utils';
import { io } from '../index';
const router = Router();
// Follow a user
router.post('/:userId/follow', [
    requireAuth,
    param('userId').isString().notEmpty().withMessage('userId must be a non-empty string'),
], (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.error('❌ Validation errors in follow endpoint:', errors.array());
            return res.status(400).json({ errors: errors.array() });
        }
        const { userId } = req.params;
        const followerId = req.userId;
        // Additional validation for userId format
        if (!userId || typeof userId !== 'string' || userId.trim() === '') {
            console.error('❌ Invalid userId parameter:', userId);
            return res.status(400).json({ error: 'Invalid userId parameter' });
        }
        if (followerId === userId) {
            return res.status(400).json({ error: 'Cannot follow yourself' });
        }
        // Check if already following (idempotent - return success if already following)
        const existingFollow = yield Follow.findOne({ followerId, followingId: userId });
        if (existingFollow) {
            // Already following - return success (idempotent operation)
            // This prevents errors from duplicate requests or race conditions
            console.log(`ℹ️ User ${followerId} already following ${userId}, returning existing follow`);
            // Still emit events to ensure UI is in sync
            const [targetUserFollowersCount, targetUserFollowingCount, followerFollowersCount, followerFollowingCount] = yield Promise.all([
                Follow.countDocuments({ followingId: userId }),
                Follow.countDocuments({ followerId: userId }),
                Follow.countDocuments({ followingId: followerId }),
                Follow.countDocuments({ followerId: followerId })
            ]);
            const isFollowedBy = yield Follow.findOne({ followerId: userId, followingId: followerId });
            // Emit events to ensure UI sync
            io.to(`user_${followerId}`).emit('followStatusChanged', {
                userId: userId,
                followerId: followerId,
                isFollowing: true,
                isFollowedBy: !!isFollowedBy
            });
            io.to(`user_${userId}`).emit('followerCountUpdated', {
                userId: userId,
                followerCount: targetUserFollowersCount,
                followingCount: targetUserFollowingCount
            });
            io.to(`user_${followerId}`).emit('followerCountUpdated', {
                userId: followerId,
                followerCount: followerFollowersCount,
                followingCount: followerFollowingCount
            });
            return res.json({ message: 'Already following this user', follow: existingFollow });
        }
        // Create follow relationship
        const follow = new Follow({ followerId, followingId: userId });
        yield follow.save();
        // Create notification for the user being followed
        yield createAndEmitNotification({
            recipient: userId,
            sender: followerId,
            type: 'follow'
        });
        // Get updated follower/following counts for both users
        const [targetUserFollowersCount, targetUserFollowingCount, followerFollowersCount, followerFollowingCount] = yield Promise.all([
            Follow.countDocuments({ followingId: userId }),
            Follow.countDocuments({ followerId: userId }),
            Follow.countDocuments({ followingId: followerId }),
            Follow.countDocuments({ followerId: followerId })
        ]);
        // Check if target user is following the follower (for mutual follow status)
        const isFollowedBy = yield Follow.findOne({ followerId: userId, followingId: followerId });
        // Emit followStatusChanged event to both users
        // Notify the follower (current user) that they're now following the target user
        io.to(`user_${followerId}`).emit('followStatusChanged', {
            userId: userId,
            followerId: followerId,
            isFollowing: true,
            isFollowedBy: !!isFollowedBy
        });
        // Notify the target user that they have a new follower
        io.to(`user_${userId}`).emit('followStatusChanged', {
            userId: userId,
            followerId: followerId,
            isFollowing: false, // From target user's perspective, they're not following the follower
            isFollowedBy: true // But the follower is now following them
        });
        // Emit followerCountUpdated for target user (the one being followed)
        io.to(`user_${userId}`).emit('followerCountUpdated', {
            userId: userId,
            followerCount: targetUserFollowersCount,
            followingCount: targetUserFollowingCount
        });
        // Also emit to the follower's own room (their following count increased)
        io.to(`user_${followerId}`).emit('followerCountUpdated', {
            userId: followerId,
            followerCount: followerFollowersCount,
            followingCount: followerFollowingCount
        });
        // CRITICAL FIX: Don't broadcast globally with incorrect perspective
        // The global broadcast was using the follower's perspective, which is wrong for the target user
        // Instead, we rely on the targeted room-based events which have the correct perspective for each user
        // Global broadcast removed to prevent cache overwrites with incorrect data
        // If needed for other clients viewing profiles, they should refetch or use the targeted events
        console.log(`📡 Emitted followStatusChanged and followerCountUpdated events for follow: ${followerId} -> ${userId}`);
        res.json({ message: 'Successfully followed user', follow });
    }
    catch (error) {
        next(error);
    }
}));
// Unfollow a user
router.delete('/:userId/follow', [
    requireAuth,
    param('userId').isString().notEmpty(),
], (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { userId } = req.params;
        const followerId = req.userId;
        const follow = yield Follow.findOneAndDelete({ followerId, followingId: userId });
        if (!follow) {
            // Idempotent - if not following, return success (already in desired state)
            console.log(`ℹ️ User ${followerId} not following ${userId}, returning success (idempotent)`);
            // Still emit events to ensure UI is in sync
            const [targetUserFollowersCount, targetUserFollowingCount, followerFollowersCount, followerFollowingCount] = yield Promise.all([
                Follow.countDocuments({ followingId: userId }),
                Follow.countDocuments({ followerId: userId }),
                Follow.countDocuments({ followingId: followerId }),
                Follow.countDocuments({ followerId: followerId })
            ]);
            io.to(`user_${followerId}`).emit('followStatusChanged', {
                userId: userId,
                followerId: followerId,
                isFollowing: false,
                isFollowedBy: false
            });
            io.to(`user_${userId}`).emit('followerCountUpdated', {
                userId: userId,
                followerCount: targetUserFollowersCount,
                followingCount: targetUserFollowingCount
            });
            io.to(`user_${followerId}`).emit('followerCountUpdated', {
                userId: followerId,
                followerCount: followerFollowersCount,
                followingCount: followerFollowingCount
            });
            return res.json({ message: 'Not following this user (already unfollowed)', follow: null });
        }
        // Get updated follower/following counts for both users
        const [targetUserFollowersCount, targetUserFollowingCount, followerFollowersCount, followerFollowingCount] = yield Promise.all([
            Follow.countDocuments({ followingId: userId }),
            Follow.countDocuments({ followerId: userId }),
            Follow.countDocuments({ followingId: followerId }),
            Follow.countDocuments({ followerId: followerId })
        ]);
        // Check if target user is still following the follower (for mutual follow status)
        const isFollowedBy = yield Follow.findOne({ followerId: userId, followingId: followerId });
        // Emit followStatusChanged event to both users
        // Notify the follower (current user) that they're no longer following the target user
        io.to(`user_${followerId}`).emit('followStatusChanged', {
            userId: userId,
            followerId: followerId,
            isFollowing: false,
            isFollowedBy: !!isFollowedBy
        });
        // Notify the target user that they lost a follower
        io.to(`user_${userId}`).emit('followStatusChanged', {
            userId: userId,
            followerId: followerId,
            isFollowing: false,
            isFollowedBy: false // The follower is no longer following them
        });
        // Emit followerCountUpdated for target user (the one being unfollowed)
        io.to(`user_${userId}`).emit('followerCountUpdated', {
            userId: userId,
            followerCount: targetUserFollowersCount,
            followingCount: targetUserFollowingCount
        });
        // Also emit to the follower's own room (their following count decreased)
        io.to(`user_${followerId}`).emit('followerCountUpdated', {
            userId: followerId,
            followerCount: followerFollowersCount,
            followingCount: followerFollowingCount
        });
        // CRITICAL FIX: Don't broadcast globally with incorrect perspective
        // The global broadcast was using the follower's perspective, which is wrong for the target user
        // Instead, we rely on the targeted room-based events which have the correct perspective for each user
        // Global broadcast removed to prevent cache overwrites with incorrect data
        console.log(`📡 Emitted followStatusChanged and followerCountUpdated events for unfollow: ${followerId} -> ${userId}`);
        res.json({ message: 'Successfully unfollowed user' });
    }
    catch (error) {
        next(error);
    }
}));
// Check if current user is following another user
router.get('/:userId/following', [
    requireAuth,
    param('userId').isString().notEmpty(),
], (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { userId } = req.params;
        const followerId = req.userId;
        const follow = yield Follow.findOne({ followerId, followingId: userId });
        const isFollowing = !!follow;
        res.json({ isFollowing });
    }
    catch (error) {
        next(error);
    }
}));
// Check if current user is followed by another user
router.get('/:userId/followed-by', [
    requireAuth,
    param('userId').isString().notEmpty(),
], (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { userId } = req.params;
        const followerId = req.userId;
        const follow = yield Follow.findOne({ followerId: userId, followingId: followerId });
        const isFollowedBy = !!follow;
        res.json({ isFollowedBy });
    }
    catch (error) {
        next(error);
    }
}));
// Get followers of a user
router.get('/:userId/followers', [
    requireAuth,
    param('userId').isString().notEmpty(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
], (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { userId } = req.params;
        const currentUserId = req.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        // Get blocked users to exclude from followers list
        const blockedUsers = yield Block.find({ blockerId: currentUserId }).select('blockedId').lean();
        const blockedIds = blockedUsers.map((b) => b.blockedId);
        // Get users who blocked current user
        const blockedByUsers = yield Block.find({ blockedId: currentUserId }).select('blockerId').lean();
        const blockedByIds = blockedByUsers.map((b) => b.blockerId);
        const followers = yield Follow.find({
            followingId: userId,
            followerId: { $nin: [...blockedIds, ...blockedByIds] }
        })
            .populate('followerId', 'username firstName lastName profileImageUrl')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        const total = yield Follow.countDocuments({
            followingId: userId,
            followerId: { $nin: [...blockedIds, ...blockedByIds] }
        });
        res.json({
            followers: followers.map(f => f.followerId),
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                hasNextPage: page * limit < total,
                hasPrevPage: page > 1
            }
        });
    }
    catch (error) {
        next(error);
    }
}));
// Get users that a user is following
router.get('/:userId/following-list', [
    requireAuth,
    param('userId').isString().notEmpty(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
], (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { userId } = req.params;
        const currentUserId = req.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        // Get blocked users to exclude from following list
        const blockedUsers = yield Block.find({ blockerId: currentUserId }).select('blockedId').lean();
        const blockedIds = blockedUsers.map((b) => b.blockedId);
        // Get users who blocked current user
        const blockedByUsers = yield Block.find({ blockedId: currentUserId }).select('blockerId').lean();
        const blockedByIds = blockedByUsers.map((b) => b.blockerId);
        const following = yield Follow.find({
            followerId: userId,
            followingId: { $nin: [...blockedIds, ...blockedByIds] }
        })
            .populate('followingId', 'username firstName lastName profileImageUrl')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        const total = yield Follow.countDocuments({
            followerId: userId,
            followingId: { $nin: [...blockedIds, ...blockedByIds] }
        });
        res.json({
            following: following.map(f => f.followingId),
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                hasNextPage: page * limit < total,
                hasPrevPage: page > 1
            }
        });
    }
    catch (error) {
        next(error);
    }
}));
// Get follow counts for a user
router.get('/:userId/counts', [
    requireAuth,
    param('userId').isString().notEmpty(),
], (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { userId } = req.params;
        const [followersCount, followingCount] = yield Promise.all([
            Follow.countDocuments({ followingId: userId }),
            Follow.countDocuments({ followerId: userId })
        ]);
        res.json({
            followersCount,
            followingCount
        });
    }
    catch (error) {
        next(error);
    }
}));
// Get follow suggestions for current user
router.get('/suggestions', [
    requireAuth,
    query('limit').optional().isInt({ min: 1, max: 50 }),
], (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const currentUserId = req.userId;
        const limit = parseInt(req.query.limit) || 5;
        // Get users that the current user is not following
        const followingIds = yield Follow.find({ followerId: currentUserId })
            .distinct('followingId');
        // Get blocked users to exclude from suggestions
        const blockedUsers = yield Block.find({ blockerId: currentUserId }).select('blockedId').lean();
        const blockedIds = blockedUsers.map((b) => b.blockedId);
        // Get users who blocked current user
        const blockedByUsers = yield Block.find({ blockedId: currentUserId }).select('blockerId').lean();
        const blockedByIds = blockedByUsers.map((b) => b.blockerId);
        const suggestions = yield User.find({
            _id: { $nin: [...followingIds, ...blockedIds, ...blockedByIds, currentUserId] },
            status: 'active'
        })
            .select('username firstName lastName profileImageUrl')
            .limit(limit)
            .sort({ createdAt: -1 });
        res.json({ suggestions });
    }
    catch (error) {
        next(error);
    }
}));
export default router;
