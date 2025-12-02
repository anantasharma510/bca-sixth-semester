var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Schema, model } from 'mongoose';
const followSchema = new Schema({
    followerId: {
        type: String,
        ref: 'User',
        required: true,
        index: true
    },
    followingId: {
        type: String,
        ref: 'User',
        required: true,
        index: true
    },
}, {
    timestamps: { createdAt: true, updatedAt: false }
});
// Compound index to ensure unique follow relationships
followSchema.index({ followerId: 1, followingId: 1 }, { unique: true });
// Index for efficient queries
followSchema.index({ followingId: 1, createdAt: -1 }); // For getting followers
followSchema.index({ followerId: 1, createdAt: -1 }); // For getting following
// Prevent self-following
followSchema.pre('save', function (next) {
    if (this.followerId === this.followingId) {
        const error = new Error('Users cannot follow themselves');
        return next(error);
    }
    next();
});
// Static method to check if a user is following another
followSchema.statics.isFollowing = function (followerId, followingId) {
    return __awaiter(this, void 0, void 0, function* () {
        const follow = yield this.findOne({ followerId, followingId });
        return !!follow;
    });
};
// Static method to get followers count
followSchema.statics.getFollowersCount = function (userId) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield this.countDocuments({ followingId: userId });
    });
};
// Static method to get following count
followSchema.statics.getFollowingCount = function (userId) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield this.countDocuments({ followerId: userId });
    });
};
// Static method to get followers list
followSchema.statics.getFollowers = function (userId_1) {
    return __awaiter(this, arguments, void 0, function* (userId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        return yield this.find({ followingId: userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('followerId', 'username firstName lastName profileImageUrl bio');
    });
};
// Static method to get following list
followSchema.statics.getFollowing = function (userId_1) {
    return __awaiter(this, arguments, void 0, function* (userId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        return yield this.find({ followerId: userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('followingId', 'username firstName lastName profileImageUrl bio');
    });
};
export const Follow = model('Follow', followSchema);
