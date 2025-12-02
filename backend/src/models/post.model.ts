import { Schema, model, Document, Types } from 'mongoose';
import { IUser } from './user.model';

export interface IMedia {
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
}

export interface IPost extends Document {
  author: IUser['_id'];
  content: string;
  media?: IMedia[];
  hashtags?: string[];
  mentions?: string[];
  likeCount: number;
  commentCount: number;
  repostCount: number;
  isReplyTo?: Schema.Types.ObjectId | IPost;
  isRepostOf?: Schema.Types.ObjectId | IPost;
  // Style outfit integration
  isOutfitPost?: boolean;
  outfitId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<IPost>({
  author: { type: String, ref: 'User', required: true, index: true },
  content: { 
    type: String, 
    trim: true, 
    required: function(this: IPost) {
      // Content is required only if no media is present
      return !this.media || this.media.length === 0;
    },
    validate: {
      validator: function(this: IPost, value: string) {
        // If no media, content must be non-empty
        if (!this.media || this.media.length === 0) {
          return !!(value && value.trim().length > 0);
        }
        // If media is present, content can be empty or missing
        return true;
      },
      message: 'Content cannot be empty if no images are attached'
    }
  },
  media: [{
    type: { type: String, enum: ['image', 'video'], required: true },
    url: { type: String, required: true },
    thumbnailUrl: { type: String }
  }],
  hashtags: [{ type: String, trim: true, lowercase: true, index: true }],
  mentions: [{ type: String, ref: 'User', index: true }],
  likeCount: { type: Number, default: 0 },
  commentCount: { type: Number, default: 0 },
  repostCount: { type: Number, default: 0 },
  isReplyTo: { type: Schema.Types.ObjectId, ref: 'Post', index: true },
  isRepostOf: { type: Schema.Types.ObjectId, ref: 'Post', index: true },
  // Optional link to a generated outfit shared to the feed
  isOutfitPost: { type: Boolean, default: false, index: true },
  outfitId: { type: Schema.Types.ObjectId, ref: 'Outfit' },
}, {
  timestamps: true
});

export const Post = model<IPost>('Post', postSchema); 