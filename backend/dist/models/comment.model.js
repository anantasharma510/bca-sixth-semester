import { Schema, model } from 'mongoose';
const commentSchema = new Schema({
    author: { type: String, ref: 'User', required: true, index: true }, // Clerk User ID (string)
    post: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    content: { type: String, trim: true, required: true },
    likeCount: { type: Number, default: 0 },
    parentComment: { type: Schema.Types.ObjectId, ref: 'Comment', index: true }, // For replies
    replies: [{ type: Schema.Types.ObjectId, ref: 'Comment' }], // Array of reply comment IDs
}, {
    timestamps: true
});
export const Comment = model('Comment', commentSchema);
