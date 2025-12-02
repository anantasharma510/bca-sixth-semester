import { Schema, model } from 'mongoose';
const supportTicketSchema = new Schema({
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
}, {
    timestamps: true, // Automatically creates createdAt and updatedAt
});
// Index for admin queries (status + priority + createdAt)
supportTicketSchema.index({ status: 1, priority: -1, createdAt: -1 });
// Index for user queries (userId + createdAt)
supportTicketSchema.index({ userId: 1, createdAt: -1 });
export const SupportTicket = model('SupportTicket', supportTicketSchema);
