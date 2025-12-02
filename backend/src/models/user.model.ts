import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  _id: string; // Better Auth User ID (or legacy Clerk ID during migration)
  betterAuthUserId?: string; // Link to Better Auth user
  clerkId?: string; // Legacy Clerk ID (for migration period)
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  coverImageUrl?: string;
  bio?: string;
  website?: string;
  location?: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
  isPrivate: boolean;
  isOnline: boolean;
  lastSeen: Date;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  _id: { type: String, required: true }, // Better Auth User ID (or legacy Clerk ID)
  betterAuthUserId: { type: String, unique: true, sparse: true, index: true }, // Link to Better Auth
  clerkId: { type: String, index: true }, // Legacy Clerk ID (for migration)
  username: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
  email: { type: String, unique: true, sparse: true, trim: true, lowercase: true },
  firstName: { type: String, trim: true },
  lastName: { type: String, trim: true },
  profileImageUrl: { type: String, trim: true },
  coverImageUrl: { type: String, trim: true },
  bio: { type: String, trim: true },
  website: { type: String, trim: true },
  location: { type: String, trim: true },
  followerCount: { type: Number, default: 0, index: true },
  followingCount: { type: Number, default: 0 },
  postCount: { type: Number, default: 0 },
  role: { type: String, enum: ['user', 'admin'], default: 'user', index: true },
  status: { type: String, enum: ['active', 'suspended'], default: 'active', index: true },
  isPrivate: { type: Boolean, default: false },
  isOnline: { type: Boolean, default: false, index: true },
  lastSeen: { type: Date, default: Date.now, index: true },
  lastActivityAt: { type: Date, default: Date.now, index: true },
}, {
  timestamps: true,
  // Remove _id: false to allow Mongoose to handle the _id field properly
  toJSON: {
    transform: function (doc, ret) {
      // Ensure _id is always a string for consistency
      if (ret._id) {
        ret._id = ret._id.toString();
      }
      return ret;
    }
  }
});

export const User = model<IUser>('User', userSchema); 