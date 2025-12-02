import { Schema, model } from 'mongoose';
const reportSchema = new Schema({
    reporterId: { type: String, required: true, index: true },
    reportedEntityType: { type: String, enum: ['Post', 'User', 'Comment'], required: true },
    reportedEntityId: { type: Schema.Types.ObjectId, required: true, index: true },
    reason: {
        type: String,
        enum: ['spam', 'harassment', 'hate_speech', 'violence', 'inappropriate_content', 'fake_news', 'copyright', 'other'],
        required: true,
        index: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: 1000 // Limit description length
    },
    status: {
        type: String,
        enum: ['pending', 'under_review', 'resolved', 'dismissed'],
        default: 'pending',
        index: true
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium',
        index: true
    },
    adminNotes: {
        type: String,
        trim: true,
        maxlength: 2000 // Limit admin notes length
    },
    resolvedBy: { type: String }, // Clerk User ID
    resolvedAt: { type: Date }
}, {
    timestamps: true
});
// Compound index to prevent duplicate reports by the same user on the same entity
reportSchema.index({ reporterId: 1, reportedEntityId: 1 }, { unique: true });
export const Report = model('Report', reportSchema);
