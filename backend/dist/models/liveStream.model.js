import { Schema, model } from 'mongoose';
const liveStreamSchema = new Schema({
    _id: { type: String, required: true },
    hostId: { type: String, required: true, ref: 'User', index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 1000 },
    thumbnailUrl: { type: String, trim: true },
    status: {
        type: String,
        enum: ['scheduled', 'live', 'ended', 'cancelled'],
        default: 'scheduled',
        index: true
    },
    scheduledAt: { type: Date, index: true },
    startedAt: { type: Date },
    endedAt: { type: Date },
    agoraChannelName: { type: String, required: true, unique: true },
    agoraToken: { type: String, required: true },
    agoraUid: { type: Number, required: true },
    viewerCount: { type: Number, default: 0, min: 0 },
    maxViewers: { type: Number, default: 1000, min: 1 },
    isPrivate: { type: Boolean, default: false },
    allowedViewers: [{ type: String, ref: 'User' }],
    tags: [{ type: String, trim: true }],
    category: { type: String, trim: true },
    duration: { type: Number, min: 0 },
    recordingUrl: { type: String, trim: true },
}, {
    timestamps: true,
    toJSON: {
        transform: function (doc, ret) {
            if (ret._id) {
                ret._id = ret._id.toString();
            }
            return ret;
        }
    }
});
// Indexes for better query performance
liveStreamSchema.index({ status: 1, scheduledAt: 1 });
liveStreamSchema.index({ hostId: 1, status: 1 });
liveStreamSchema.index({ tags: 1, status: 1 });
liveStreamSchema.index({ category: 1, status: 1 });
export const LiveStream = model('LiveStream', liveStreamSchema);
