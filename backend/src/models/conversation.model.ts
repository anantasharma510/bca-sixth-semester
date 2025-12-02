import { Schema, model, Document } from 'mongoose';

export interface IConversation extends Document {
  participants: string[]; // User IDs
  lastMessage?: {
    content: string;
    senderId: string;
    timestamp: Date;
    messageType?: string;
  };
  unreadCount: Map<string, number>; // userId -> count
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>({
  participants: [{
    type: String,
    ref: 'User',
    required: true,
    index: true
  }],
  lastMessage: {
    content: { type: String },
    senderId: { type: String, ref: 'User' },
    timestamp: { type: Date },
    messageType: { type: String, enum: ['text', 'image', 'video'] }
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: {}
  }
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

// Compound index for efficient querying by participants
conversationSchema.index({ participants: 1, updatedAt: -1 });

export const Conversation = model<IConversation>('Conversation', conversationSchema); 