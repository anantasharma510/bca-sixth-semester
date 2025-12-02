import { Schema, model, Document, Model } from 'mongoose';

export interface IFollow extends Document {
  followerId: string; // Clerk User ID
  followingId: string; // Clerk User ID
  createdAt: Date;
}

// Interface for static methods
export interface IFollowModel extends Model<IFollow> {
  isFollowing(followerId: string, followingId: string): Promise<boolean>;
  getFollowersCount(userId: string): Promise<number>;
  getFollowingCount(userId: string): Promise<number>;
  getFollowers(userId: string, page: number, limit: number): Promise<IFollow[]>;
  getFollowing(userId: string, page: number, limit: number): Promise<IFollow[]>;
}

const followSchema = new Schema<IFollow>({
  followerId: { 
    type: String, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  followingId: { 
    type: String, 
    ref: 'User', 
    required: true, 
    index: true 
  },
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Compound index to ensure unique follow relationships
followSchema.index({ followerId: 1, followingId: 1 }, { unique: true });

// Index for efficient queries
followSchema.index({ followingId: 1, createdAt: -1 }); // For getting followers
followSchema.index({ followerId: 1, createdAt: -1 }); // For getting following

// Prevent self-following
followSchema.pre('save', function(next) {
  if (this.followerId === this.followingId) {
    const error = new Error('Users cannot follow themselves');
    return next(error);
  }
  next();
});

// Static method to check if a user is following another
followSchema.statics.isFollowing = async function(followerId: string, followingId: string): Promise<boolean> {
  const follow = await this.findOne({ followerId, followingId });
  return !!follow;
};

// Static method to get followers count
followSchema.statics.getFollowersCount = async function(userId: string): Promise<number> {
  return await this.countDocuments({ followingId: userId });
};

// Static method to get following count
followSchema.statics.getFollowingCount = async function(userId: string): Promise<number> {
  return await this.countDocuments({ followerId: userId });
};

// Static method to get followers list
followSchema.statics.getFollowers = async function(userId: string, page: number = 1, limit: number = 20): Promise<IFollow[]> {
  const skip = (page - 1) * limit;
  return await this.find({ followingId: userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('followerId', 'username firstName lastName profileImageUrl bio');
};

// Static method to get following list
followSchema.statics.getFollowing = async function(userId: string, page: number = 1, limit: number = 20): Promise<IFollow[]> {
  const skip = (page - 1) * limit;
  return await this.find({ followerId: userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('followingId', 'username firstName lastName profileImageUrl bio');
};

export const Follow = model<IFollow, IFollowModel>('Follow', followSchema); 