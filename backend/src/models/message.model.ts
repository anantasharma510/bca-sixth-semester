import { Schema, model, Document } from 'mongoose';

export interface IMessage extends Document {
  conversationId: string; // Reference to conversation
  senderId: string; // User ID of sender
  content: string; // Message text content
  messageType: 'text' | 'image' | 'video'; // Type of message - text, images, and videos supported
  attachments?: Array<{
    type: string;
    url: string;
    name?: string;
    size?: number;
    duration?: number; // For audio/video
    thumbnail?: string; // For video/image
  }>;
  replyTo?: string; // ID of message being replied to
  reactions?: Map<string, string>; // userId -> reaction (emoji)
  editedAt?: Date; // When message was last edited
  deletedAt?: Date; // When message was deleted (soft delete)
  readBy?: string[]; // Array of user IDs who have read this message
  deliveredTo?: string[]; // Array of user IDs who have received this message
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>({
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
    required: function(this: IMessage) {
      // Content is required only for text messages
      return this.messageType === 'text';
    },
    trim: true,
    maxlength: 5000, // Limit message length
    validate: {
      validator: function(this: IMessage, value: string): boolean {
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
      } else if (doc._id && typeof doc._id.toString === 'function') {
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
messageSchema.virtual('reactionCount').get(function() {
  return this.reactions ? this.reactions.size : 0;
});

// Virtual for read count
messageSchema.virtual('readCount').get(function() {
  return this.readBy ? this.readBy.length : 0;
});

// Virtual for delivery count
messageSchema.virtual('deliveryCount').get(function() {
  return this.deliveredTo ? this.deliveredTo.length : 0;
});

// Ensure virtuals are included in JSON output
messageSchema.set('toJSON', { virtuals: true });

// Pre-save middleware to validate content length
messageSchema.pre('save', function(next) {
  if (this.content && this.content.length > 5000) {
    return next(new Error('Message content cannot exceed 5000 characters'));
  }
  next();
});

// Static method to get messages with pagination
messageSchema.statics.getMessages = function(conversationId: string, page: number = 1, limit: number = 20) {
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
messageSchema.statics.searchMessages = function(conversationId: string, query: string, page: number = 1, limit: number = 20) {
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
messageSchema.methods.addReaction = function(userId: string, reaction: string) {
  if (!this.reactions) {
    this.reactions = new Map();
  }
  this.reactions.set(userId, reaction);
  return this.save();
};

// Instance method to remove reaction
messageSchema.methods.removeReaction = function(userId: string) {
  if (this.reactions) {
    this.reactions.delete(userId);
  }
  return this.save();
};

// Instance method to mark as read
messageSchema.methods.markAsRead = function(userId: string) {
  if (!this.readBy.includes(userId)) {
    this.readBy.push(userId);
  }
  return this.save();
};

// Instance method to mark as delivered
messageSchema.methods.markAsDelivered = function(userId: string) {
  if (!this.deliveredTo.includes(userId)) {
    this.deliveredTo.push(userId);
  }
  return this.save();
};

export const Message = model<IMessage>('Message', messageSchema); 