import { Schema, model } from 'mongoose';

export interface ISupportTicket {
  _id?: string;
  userId: string; // Clerk user ID
  subject: string;
  message: string;
  category: 'bug' | 'feature' | 'account' | 'billing' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  attachments?: string[]; // URLs to uploaded files (optional for v1)
  createdAt?: Date;
  updatedAt?: Date;
  resolvedAt?: Date;
  resolvedBy?: string; // Admin user ID who resolved it
  adminNotes?: string;
}

const supportTicketSchema = new Schema<ISupportTicket>(
  {
    userId: {
      type: String,
      required: true,
      ref: 'User',
      index: true, // Index for faster queries by user
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    category: {
      type: String,
      enum: ['bug', 'feature', 'account', 'billing', 'other'],
      default: 'other',
      required: true,
      index: true, // Index for filtering by category
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      required: true,
      index: true, // Index for filtering by priority
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
      required: true,
      index: true, // Index for filtering by status
    },
    attachments: [{
      type: String,
    }],
    resolvedAt: {
      type: Date,
    },
    resolvedBy: {
      type: String,
      ref: 'User',
    },
    adminNotes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
  },
  {
    timestamps: true, // Automatically creates createdAt and updatedAt
  }
);

// Index for admin queries (status + priority + createdAt)
supportTicketSchema.index({ status: 1, priority: -1, createdAt: -1 });

// Index for user queries (userId + createdAt)
supportTicketSchema.index({ userId: 1, createdAt: -1 });

export const SupportTicket = model<ISupportTicket>('SupportTicket', supportTicketSchema);

