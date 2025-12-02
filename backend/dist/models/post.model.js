import { Schema, model } from 'mongoose';
const postSchema = new Schema({
    author: { type: String, ref: 'User', required: true, index: true },
    content: {
        type: String,
        trim: true,
        required: function () {
            // Content is required only if no media is present
            return !this.media || this.media.length === 0;
        },
        validate: {
            validator: function (value) {
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
}, {
    timestamps: true
});
export const Post = model('Post', postSchema);
