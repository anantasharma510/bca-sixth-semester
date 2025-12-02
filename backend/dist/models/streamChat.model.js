import { Schema, model } from 'mongoose';
const streamChatSchema = new Schema({
    streamId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    username: { type: String, required: true },
    message: { type: String, required: true, maxlength: 500 },
    avatar: { type: String },
    timestamp: { type: Date, default: Date.now, index: true }
}, {
    timestamps: true
});
// Index for efficient querying
streamChatSchema.index({ streamId: 1, timestamp: -1 });
// TTL index to auto-delete messages after 7 days
streamChatSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });
export const StreamChatMessage = model('StreamChatMessage', streamChatSchema);
