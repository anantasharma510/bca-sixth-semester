import { Schema, model, Document } from 'mongoose';
import { IUser } from './user.model';
import { IPost } from './post.model';
import { IComment } from './comment.model';

export interface ILike extends Document {
  user: IUser['_id'];
  post?: IPost['_id'];
  comment?: IComment['_id'];
  createdAt: Date;
}

const likeSchema = new Schema<ILike>({
  user: { type: String, ref: 'User', required: true },
  post: { type: Schema.Types.ObjectId, ref: 'Post' },
  comment: { type: Schema.Types.ObjectId, ref: 'Comment' },
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Add validation to ensure either post or comment is provided, but not both
likeSchema.pre('save', function(next) {
  if (!this.post && !this.comment) {
    return next(new Error('Either post or comment must be provided'));
  }
  if (this.post && this.comment) {
    return next(new Error('Cannot like both post and comment simultaneously'));
  }
  next();
});

// Create compound indexes with better partial filter expressions
likeSchema.index({ user: 1, post: 1 }, { 
  unique: true, 
  sparse: true,
  partialFilterExpression: { 
    post: { $exists: true, $ne: null },
    comment: { $exists: false }
  }
});

likeSchema.index({ user: 1, comment: 1 }, { 
  unique: true, 
  sparse: true,
  partialFilterExpression: { 
    comment: { $exists: true, $ne: null },
    post: { $exists: false }
  }
});

// Regular indexes for querying
likeSchema.index({ post: 1 });
likeSchema.index({ comment: 1 });
likeSchema.index({ user: 1 });

export const Like = model<ILike>('Like', likeSchema); 