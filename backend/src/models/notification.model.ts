import { Schema, model, Document } from 'mongoose';
import { IUser } from './user.model';
import { IPost } from './post.model';
import { IComment } from './comment.model';

export interface INotification extends Document {
  recipient: IUser['_id'];
  sender: IUser['_id'];
  type: 'like' | 'comment' | 'repost' | 'follow' | 'mention';
  post?: IPost['_id'];
  comment?: IComment['_id'];
  isRead: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>({
  recipient: { type: String, ref: 'User', required: true, index: true },
  sender: { type: String, ref: 'User', required: true },
  type: { type: String, enum: ['like', 'comment', 'repost', 'follow', 'mention'], required: true },
  post: { type: Schema.Types.ObjectId, ref: 'Post' },
  comment: { type: Schema.Types.ObjectId, ref: 'Comment' },
  isRead: { type: Boolean, default: false, index: true },
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

export const Notification = model<INotification>('Notification', notificationSchema); 