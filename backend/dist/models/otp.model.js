import mongoose, { Schema } from 'mongoose';
const otpSchema = new Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        index: true
    },
    code: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['signup', 'password-reset'],
        required: true,
        index: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expireAfterSeconds: 0 } // Auto-delete expired OTPs
    },
    verified: {
        type: Boolean,
        default: false
    },
    attempts: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});
// Compound index for efficient lookups
otpSchema.index({ email: 1, type: 1, verified: 1 });
export const OTP = mongoose.model('OTP', otpSchema);
