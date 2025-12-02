import { Schema, model, Document, Model } from 'mongoose';

export interface IBlock extends Document {
  blockerId: string; // Clerk User ID
  blockedId: string; // Clerk User ID
  createdAt: Date;
}

// Interface for static methods
export interface IBlockModel extends Model<IBlock> {
  isBlocked(blockerId: string, blockedId: string): Promise<boolean>;
  getBlockedUsersCount(userId: string): Promise<number>;
  getBlockedByCount(userId: string): Promise<number>;
  getBlockedUsers(userId: string, page: number, limit: number): Promise<IBlock[]>;
  getBlockedByUsers(userId: string, page: number, limit: number): Promise<IBlock[]>;
  getMutualBlockStatus(userId1: string, userId2: string): Promise<{
    user1BlockedUser2: boolean;
    user2BlockedUser1: boolean;
    isMutualBlock: boolean;
  }>;
  getBlockedUserIds(userId: string): Promise<{
    blockedIds: string[];
    blockedByIds: string[];
  }>;
}

const blockSchema = new Schema<IBlock>({
  blockerId: { 
    type: String, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  blockedId: { 
    type: String, 
    ref: 'User', 
    required: true, 
    index: true 
  },
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Compound index to ensure unique block relationships
blockSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });

// Index for efficient queries
blockSchema.index({ blockedId: 1, createdAt: -1 }); // For getting blocked users
blockSchema.index({ blockerId: 1, createdAt: -1 }); // For getting users who blocked me

// Prevent self-blocking
blockSchema.pre('save', function(next) {
  if (this.blockerId === this.blockedId) {
    const error = new Error('Users cannot block themselves');
    return next(error);
  }
  next();
});

// Static method to check if a user is blocked by another
blockSchema.statics.isBlocked = async function(blockerId: string, blockedId: string): Promise<boolean> {
  const block = await this.findOne({ blockerId, blockedId });
  return !!block;
};

// Static method to check mutual block status between two users
blockSchema.statics.getMutualBlockStatus = async function(userId1: string, userId2: string): Promise<{
  user1BlockedUser2: boolean;
  user2BlockedUser1: boolean;
  isMutualBlock: boolean;
}> {
  const [user1BlockedUser2, user2BlockedUser1] = await Promise.all([
    this.findOne({ blockerId: userId1, blockedId: userId2 }),
    this.findOne({ blockerId: userId2, blockedId: userId1 })
  ]);
  
  return {
    user1BlockedUser2: !!user1BlockedUser2,
    user2BlockedUser1: !!user2BlockedUser1,
    isMutualBlock: !!(user1BlockedUser2 || user2BlockedUser1)
  };
};

// Static method to get blocked users count
blockSchema.statics.getBlockedUsersCount = async function(userId: string): Promise<number> {
  return await this.countDocuments({ blockerId: userId });
};

// Static method to get blocked by count
blockSchema.statics.getBlockedByCount = async function(userId: string): Promise<number> {
  return await this.countDocuments({ blockedId: userId });
};

// Static method to get blocked users list
blockSchema.statics.getBlockedUsers = async function(userId: string, page: number = 1, limit: number = 20): Promise<IBlock[]> {
  const skip = (page - 1) * limit;
  return await this.find({ blockerId: userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('blockedId', 'username firstName lastName profileImageUrl bio');
};

// Static method to get users who blocked me
blockSchema.statics.getBlockedByUsers = async function(userId: string, page: number = 1, limit: number = 20): Promise<IBlock[]> {
  const skip = (page - 1) * limit;
  return await this.find({ blockedId: userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('blockerId', 'username firstName lastName profileImageUrl bio');
};

// Static method to get all blocked user IDs for efficient filtering
blockSchema.statics.getBlockedUserIds = async function(userId: string): Promise<{
  blockedIds: string[];
  blockedByIds: string[];
}> {
  const [blockedUsers, blockedByUsers] = await Promise.all([
    this.find({ blockerId: userId }).select('blockedId').lean(),
    this.find({ blockedId: userId }).select('blockerId').lean()
  ]);
  
  return {
    blockedIds: blockedUsers.map((b: any) => b.blockedId),
    blockedByIds: blockedByUsers.map((b: any) => b.blockerId)
  };
};

export const Block = model<IBlock, IBlockModel>('Block', blockSchema); 