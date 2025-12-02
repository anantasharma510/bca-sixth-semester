var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Block } from '../models/block.model';
export function checkBlockStatus(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.sub;
            const targetUserId = req.params.userId || req.params.id;
            if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
                return next();
            }
            const blockStatus = yield Block.getMutualBlockStatus(currentUserId, targetUserId);
            req.blockStatus = {
                userBlockedOther: blockStatus.user1BlockedUser2,
                otherBlockedUser: blockStatus.user2BlockedUser1,
                isMutualBlock: blockStatus.isMutualBlock
            };
            next();
        }
        catch (error) {
            console.error('Error checking block status:', error);
            next();
        }
    });
}
export function requireNoBlock(req, res, next) {
    const blockStatus = req.blockStatus;
    if (blockStatus === null || blockStatus === void 0 ? void 0 : blockStatus.isMutualBlock) {
        return res.status(404).json({ error: 'User not found' });
    }
    next();
}
