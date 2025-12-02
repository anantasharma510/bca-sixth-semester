import { Schema, model } from 'mongoose';
const notificationSchema = new Schema({
    recipient: { type: String, ref: 'User', required: true, index: true },
    sender: { type: String, ref: 'User', required: true },
    type: { type: String, enum: ['like', 'comment', 'repost', 'follow', 'mention'], required: true },
    post: { type: Schema.Types.ObjectId, ref: 'Post' },
    comment: { type: Schema.Types.ObjectId, ref: 'Comment' },
    isRead: { type: Boolean, default: false, index: true },
}, {
    timestamps: { createdAt: true, updatedAt: false }
});
export const Notification = model('Notification', notificationSchema);
