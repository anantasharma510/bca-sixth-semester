// @ts-nocheck
import { Request, Response, NextFunction, Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { Block, IBlock } from '../models/block.model';
import { User } from '../models/user.model';
import { Follow } from '../models/follow.model';
import { io } from '../index';

const router = Router();

// Fixed asyncHandler to properly handle Express types
function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return function (req: Request, res: Response, next: NextFunction) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Block a user
router.post(
  '/block',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
      const userId = (req as any).userId;
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
    const existingBlock = await Block.findOne({ blockerId, blockedId });
    if (existingBlock) {
      res.status(400).json({ error: 'User is already blocked' });
      return;
    }

    // Create the block
    const block = new Block({ blockerId, blockedId });
    await block.save();

    // Automatically unfollow the blocked user if following
    await Follow.findOneAndDelete({ followerId: blockerId, followingId: blockedId });
    
    // Also unfollow if the blocked user was following you
    await Follow.findOneAndDelete({ followerId: blockedId, followingId: blockerId });

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
  })
);

// Unblock a user
router.delete(
  '/:userId/block',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
      const userId = (req as any).userId;
    const blockerId = userId;
    const { userId: blockedId } = req.params;

    // Validate that the user to unblock exists
    const userToUnblock = await User.findById(blockedId);
    if (!userToUnblock) {
      res.status(404).json({ error: 'User to unblock not found' });
      return;
    }

    // Find and delete block relationship
    const block = await Block.findOneAndDelete({ blockerId, blockedId });
    
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
  })
);

// Check if current user has blocked another user
router.get(
  '/:userId/blocked',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
      const userId = (req as any).userId;
    const blockerId = userId;
    const { userId: blockedId } = req.params;

    const isBlocked = await Block.isBlocked(blockerId, blockedId);
    
    res.json({ isBlocked });
  })
);

// Check mutual block status between two users
router.get(
  '/:userId/mutual-block',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
      const userId = (req as any).userId;
    const currentUserId = userId;
    const { userId: otherUserId } = req.params;

    const blockStatus = await Block.getMutualBlockStatus(currentUserId, otherUserId);
    
    res.json({ 
      userBlockedOther: blockStatus.user1BlockedUser2,
      otherBlockedUser: blockStatus.user2BlockedUser1,
      isMutualBlock: blockStatus.isMutualBlock
    });
  })
);

// Get blocked users list for current user
router.get(
  '/blocked-users',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const blockedUsers = await Block.getBlockedUsers(userId, page, limit);
    const totalBlocked = await Block.getBlockedUsersCount(userId);
    const totalPages = Math.ceil(totalBlocked / limit);

    // Get full user details for blocked users
    const blockedUserIds = blockedUsers.map((b: IBlock) => (b as any).blockedId);
    const userDetails = await User.find({ _id: { $in: blockedUserIds } })
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
  })
);

// Get users who blocked current user
router.get(
  '/blocked-by',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const blockedByUsers = await Block.getBlockedByUsers(userId, page, limit);
    const totalBlockedBy = await Block.getBlockedByCount(userId);
    const totalPages = Math.ceil(totalBlockedBy / limit);

    res.json({
      blockedByUsers: blockedByUsers.map((b: IBlock) => (b as any).blockerId),
      pagination: {
        currentPage: page,
        totalPages,
        totalBlockedBy,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  })
);

// Get block counts for current user
router.get(
  '/counts',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;

    const [blockedUsersCount, blockedByCount] = await Promise.all([
      Block.getBlockedUsersCount(userId),
      Block.getBlockedByCount(userId)
    ]);

    res.json({
      blockedUsersCount,
      blockedByCount
    });
  })
);

export default router; 