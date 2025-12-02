import { Schema, model, Document } from 'mongoose';
import { IUser } from './user.model';
import { IPost } from './post.model';

export interface IComment extends Document {
  author: IUser['_id'];
  post: IPost['_id'];
  content: string;
  likeCount: number;
  parentComment?: IComment['_id']; // For replies
  replies?: IComment['_id'][]; // Array of reply comment IDs
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>({
  author: { type: String, ref: 'User', required: true, index: true }, // Clerk User ID (string)
  post: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
  content: { type: String, trim: true, required: true },
  likeCount: { type: Number, default: 0 },
  parentComment: { type: Schema.Types.ObjectId, ref: 'Comment', index: true }, // For replies
  replies: [{ type: Schema.Types.ObjectId, ref: 'Comment' }], // Array of reply comment IDs
}, {
  timestamps: true
});

export const Comment = model<IComment>('Comment', commentSchema); 