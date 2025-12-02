import { Schema, model } from 'mongoose';
const messageSchema = new Schema({
    conversationId: {
        type: String,
        ref: 'Conversation',
        required: true,
        index: true
    },
    senderId: {
        type: String,
        ref: 'User',
        required: true,
        index: true
    },
    content: {
        type: String,
        required: function () {
            // Content is required only for text messages
            return this.messageType === 'text';
        },
        trim: true,
        maxlength: 5000, // Limit message length
        validate: {
            validator: function (value) {
                // For text messages, content must be present and not empty
                if (this.messageType === 'text') {
                    return Boolean(value && value.trim().length > 0);
                }
                // For image and video messages, content can be empty
                return true;
            },
            message: 'Content is required for text messages'
        }
    },
    messageType: {
        type: String,
        enum: ['text', 'image', 'video'],
        default: 'text'
    },
    attachments: [{
            type: { type: String, required: true },
            url: { type: String, required: true },
            name: { type: String },
            size: { type: Number },
            duration: { type: Number }, // For audio/video files
            thumbnail: { type: String } // For video/image previews
        }],
    replyTo: {
        type: String,
        ref: 'Message'
    },
    reactions: {
        type: Map,
        of: String,
        default: {}
    },
    editedAt: {
        type: Date
    },
    deletedAt: {
        type: Date
    },
    readBy: [{
            type: String,
            ref: 'User'
        }],
    deliveredTo: [{
            type: String,
            ref: 'User'
        }]
}, {
    timestamps: true,
    toJSON: {
        transform: function (doc, ret) {
            if (ret._id && typeof ret._id.toString === 'function') {
                ret._id = ret._id.toString();
            }
            else if (doc._id && typeof doc._id.toString === 'function') {
                ret._id = doc._id.toString();
            }
            return ret;
        }
    }
});
// Compound indexes for efficient querying
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index({ messageType: 1 });
messageSchema.index({ deletedAt: 1 });
messageSchema.index({ replyTo: 1 });
messageSchema.index({ readBy: 1 });
messageSchema.index({ deliveredTo: 1 });
// Text index for search functionality
messageSchema.index({ content: 'text' });
// Virtual for reaction count
messageSchema.virtual('reactionCount').get(function () {
    return this.reactions ? this.reactions.size : 0;
});
// Virtual for read count
messageSchema.virtual('readCount').get(function () {
    return this.readBy ? this.readBy.length : 0;
});
// Virtual for delivery count
messageSchema.virtual('deliveryCount').get(function () {
    return this.deliveredTo ? this.deliveredTo.length : 0;
});
// Ensure virtuals are included in JSON output
messageSchema.set('toJSON', { virtuals: true });
// Pre-save middleware to validate content length
messageSchema.pre('save', function (next) {
    if (this.content && this.content.length > 5000) {
        return next(new Error('Message content cannot exceed 5000 characters'));
    }
    next();
});
// Static method to get messages with pagination
messageSchema.statics.getMessages = function (conversationId, page = 1, limit = 20) {
    return this.find({
        conversationId,
        deletedAt: { $exists: false }
    })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('senderId', 'username firstName lastName profileImageUrl')
        .populate('replyTo', 'content senderId')
        .lean();
};
// Static method to search messages
messageSchema.statics.searchMessages = function (conversationId, query, page = 1, limit = 20) {
    return this.find({
        conversationId,
        deletedAt: { $exists: false },
        content: { $regex: query, $options: 'i' }
    })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('senderId', 'username firstName lastName profileImageUrl')
        .populate('replyTo', 'content senderId')
        .lean();
};
// Instance method to add reaction
messageSchema.methods.addReaction = function (userId, reaction) {
    if (!this.reactions) {
        this.reactions = new Map();
    }
    this.reactions.set(userId, reaction);
    return this.save();
};
// Instance method to remove reaction
messageSchema.methods.removeReaction = function (userId) {
    if (this.reactions) {
        this.reactions.delete(userId);
    }
    return this.save();
};
// Instance method to mark as read
messageSchema.methods.markAsRead = function (userId) {
    if (!this.readBy.includes(userId)) {
        this.readBy.push(userId);
    }
    return this.save();
};
// Instance method to mark as delivered
messageSchema.methods.markAsDelivered = function (userId) {
    if (!this.deliveredTo.includes(userId)) {
        this.deliveredTo.push(userId);
    }
    return this.save();
};
export const Message = model('Message', messageSchema);
