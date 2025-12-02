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
const blockSchema = new Schema({
    blockerId: {
        type: String,
        ref: 'User',
        required: true,
        index: true
    },
    blockedId: {
        type: String,
        ref: 'User',
        required: true,
        index: true
    },
}, {
    timestamps: { createdAt: true, updatedAt: false }
});
// Compound index to ensure unique block relationships
blockSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });
// Index for efficient queries
blockSchema.index({ blockedId: 1, createdAt: -1 }); // For getting blocked users
blockSchema.index({ blockerId: 1, createdAt: -1 }); // For getting users who blocked me
// Prevent self-blocking
blockSchema.pre('save', function (next) {
    if (this.blockerId === this.blockedId) {
        const error = new Error('Users cannot block themselves');
        return next(error);
    }
    next();
});
// Static method to check if a user is blocked by another
blockSchema.statics.isBlocked = function (blockerId, blockedId) {
    return __awaiter(this, void 0, void 0, function* () {
        const block = yield this.findOne({ blockerId, blockedId });
        return !!block;
    });
};
// Static method to check mutual block status between two users
blockSchema.statics.getMutualBlockStatus = function (userId1, userId2) {
    return __awaiter(this, void 0, void 0, function* () {
        const [user1BlockedUser2, user2BlockedUser1] = yield Promise.all([
            this.findOne({ blockerId: userId1, blockedId: userId2 }),
            this.findOne({ blockerId: userId2, blockedId: userId1 })
        ]);
        return {
            user1BlockedUser2: !!user1BlockedUser2,
            user2BlockedUser1: !!user2BlockedUser1,
            isMutualBlock: !!(user1BlockedUser2 || user2BlockedUser1)
        };
    });
};
// Static method to get blocked users count
blockSchema.statics.getBlockedUsersCount = function (userId) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield this.countDocuments({ blockerId: userId });
    });
};
// Static method to get blocked by count
blockSchema.statics.getBlockedByCount = function (userId) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield this.countDocuments({ blockedId: userId });
    });
};
// Static method to get blocked users list
blockSchema.statics.getBlockedUsers = function (userId_1) {
    return __awaiter(this, arguments, void 0, function* (userId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        return yield this.find({ blockerId: userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('blockedId', 'username firstName lastName profileImageUrl bio');
    });
};
// Static method to get users who blocked me
blockSchema.statics.getBlockedByUsers = function (userId_1) {
    return __awaiter(this, arguments, void 0, function* (userId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        return yield this.find({ blockedId: userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('blockerId', 'username firstName lastName profileImageUrl bio');
    });
};
// Static method to get all blocked user IDs for efficient filtering
blockSchema.statics.getBlockedUserIds = function (userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const [blockedUsers, blockedByUsers] = yield Promise.all([
            this.find({ blockerId: userId }).select('blockedId').lean(),
            this.find({ blockedId: userId }).select('blockerId').lean()
        ]);
        return {
            blockedIds: blockedUsers.map((b) => b.blockedId),
            blockedByIds: blockedByUsers.map((b) => b.blockerId)
        };
    });
};
export const Block = model('Block', blockSchema);
