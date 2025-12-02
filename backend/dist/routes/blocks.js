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
import { Block } from '../models/block.model';
import { User } from '../models/user.model';
import { Follow } from '../models/follow.model';
import { io } from '../index';
const router = Router();
// Fixed asyncHandler to properly handle Express types
function asyncHandler(fn) {
    return function (req, res, next) {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
// Block a user
router.post('/block', requireAuth, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.userId;
    const blockerId = userId;
    const { blockedId } = req.body;
    if (!blockedId) {
        res.status(400).json({ error: 'Blocked user ID is required' });
        return;
    }
    if (blockerId === blockedId) {
        res.status(400).json({ error: 'Cannot block yourself' });
        return;
    }
    // Check if already blocked
    const existingBlock = yield Block.findOne({ blockerId, blockedId });
    if (existingBlock) {
        res.status(400).json({ error: 'User is already blocked' });
        return;
    }
    // Create the block
    const block = new Block({ blockerId, blockedId });
    yield block.save();
    // Automatically unfollow the blocked user if following
    yield Follow.findOneAndDelete({ followerId: blockerId, followingId: blockedId });
    // Also unfollow if the blocked user was following you
    yield Follow.findOneAndDelete({ followerId: blockedId, followingId: blockerId });
    console.log(`User ${blockerId} blocked user ${blockedId} and unfollowed them`);
    // Emit Socket.IO event for real-time updates
    if (io) {
        io.to(`user_${blockedId}`).emit('userBlockedYou', {
            blockedBy: blockerId,
            timestamp: new Date()
        });
        io.to(`user_${blockerId}`).emit('blockConfirmed', {
            blockedUserId: blockedId,
            timestamp: new Date()
        });
    }
    res.status(201).json({
        message: 'User blocked successfully',
        block: {
            id: block._id,
            blockerId: block.blockerId,
            blockedId: block.blockedId,
            createdAt: block.createdAt
        }
    });
})));
// Unblock a user
router.delete('/:userId/block', requireAuth, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.userId;
    const blockerId = userId;
    const { userId: blockedId } = req.params;
    // Validate that the user to unblock exists
    const userToUnblock = yield User.findById(blockedId);
    if (!userToUnblock) {
        res.status(404).json({ error: 'User to unblock not found' });
        return;
    }
    // Find and delete block relationship
    const block = yield Block.findOneAndDelete({ blockerId, blockedId });
    if (!block) {
        res.status(404).json({ error: 'User is not blocked' });
        return;
    }
    // Emit Socket.IO event for real-time updates
    if (io) {
        io.to(`user_${blockedId}`).emit('userUnblockedYou', {
            unblockedBy: blockerId,
            timestamp: new Date()
        });
        io.to(`user_${blockerId}`).emit('unblockConfirmed', {
            unblockedUserId: blockedId,
            timestamp: new Date()
        });
    }
    res.json({
        success: true,
        message: 'Successfully unblocked user'
    });
})));
// Check if current user has blocked another user
router.get('/:userId/blocked', requireAuth, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.userId;
    const blockerId = userId;
    const { userId: blockedId } = req.params;
    const isBlocked = yield Block.isBlocked(blockerId, blockedId);
    res.json({ isBlocked });
})));
// Check mutual block status between two users
router.get('/:userId/mutual-block', requireAuth, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.userId;
    const currentUserId = userId;
    const { userId: otherUserId } = req.params;
    const blockStatus = yield Block.getMutualBlockStatus(currentUserId, otherUserId);
    res.json({
        userBlockedOther: blockStatus.user1BlockedUser2,
        otherBlockedUser: blockStatus.user2BlockedUser1,
        isMutualBlock: blockStatus.isMutualBlock
    });
})));
// Get blocked users list for current user
router.get('/blocked-users', requireAuth, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const blockedUsers = yield Block.getBlockedUsers(userId, page, limit);
    const totalBlocked = yield Block.getBlockedUsersCount(userId);
    const totalPages = Math.ceil(totalBlocked / limit);
    // Get full user details for blocked users
    const blockedUserIds = blockedUsers.map((b) => b.blockedId);
    const userDetails = yield User.find({ _id: { $in: blockedUserIds } })
        .select('username firstName lastName profileImageUrl bio')
        .lean();
    res.json({
        blockedUsers: userDetails,
        pagination: {
            currentPage: page,
            totalPages,
            totalBlocked,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        }
    });
})));
// Get users who blocked current user
router.get('/blocked-by', requireAuth, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const blockedByUsers = yield Block.getBlockedByUsers(userId, page, limit);
    const totalBlockedBy = yield Block.getBlockedByCount(userId);
    const totalPages = Math.ceil(totalBlockedBy / limit);
    res.json({
        blockedByUsers: blockedByUsers.map((b) => b.blockerId),
        pagination: {
            currentPage: page,
            totalPages,
            totalBlockedBy,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        }
    });
})));
// Get block counts for current user
router.get('/counts', requireAuth, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.userId;
    const [blockedUsersCount, blockedByCount] = yield Promise.all([
        Block.getBlockedUsersCount(userId),
        Block.getBlockedByCount(userId)
    ]);
    res.json({
        blockedUsersCount,
        blockedByCount
    });
})));
export default router;
