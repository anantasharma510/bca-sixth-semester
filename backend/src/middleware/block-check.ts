import { Request, Response, NextFunction } from 'express';
import { Block } from '../models/block.model';

export interface BlockCheckRequest extends Request {
  blockStatus?: {
    userBlockedOther: boolean;
    otherBlockedUser: boolean;
    isMutualBlock: boolean;
  };
}

export async function checkBlockStatus(req: BlockCheckRequest, res: Response, next: NextFunction) {
  try {
    const currentUserId = (req as any).user?.sub;
    const targetUserId = req.params.userId || req.params.id;

    if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
      return next();
    }

    const blockStatus = await Block.getMutualBlockStatus(currentUserId, targetUserId);
    req.blockStatus = {
      userBlockedOther: blockStatus.user1BlockedUser2,
      otherBlockedUser: blockStatus.user2BlockedUser1,
      isMutualBlock: blockStatus.isMutualBlock
    };

    next();
  } catch (error) {
    console.error('Error checking block status:', error);
    next();
  }
}

export function requireNoBlock(req: BlockCheckRequest, res: Response, next: NextFunction) {
  const blockStatus = req.blockStatus;
  
  if (blockStatus?.isMutualBlock) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  next();
} 