var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Comment } from '../models/comment.model';
/**
 * Calculate total comment count for a post (including replies)
 * @param postId - The post ID
 * @returns Promise<number> - Total comment count
 */
export function calculateTotalCommentCount(postId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Count all comments for this post (both top-level and replies)
            const totalCount = yield Comment.countDocuments({ post: postId });
            console.log(`Calculated comment count for post ${postId}: ${totalCount} comments`);
            return totalCount;
        }
        catch (error) {
            console.error('Error calculating total comment count:', error);
            return 0;
        }
    });
}
/**
 * Update post's comment count to reflect total comments (including replies)
 * @param postId - The post ID
 * @returns Promise<number> - The updated comment count
 */
export function updatePostCommentCount(postId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const totalCount = yield calculateTotalCommentCount(postId);
            // Update the post's comment count with { new: true } to ensure we get the updated document
            const { Post } = require('../models/post.model');
            const updatedPost = yield Post.findByIdAndUpdate(postId, { commentCount: totalCount }, { new: true });
            const finalCount = (_a = updatedPost === null || updatedPost === void 0 ? void 0 : updatedPost.commentCount) !== null && _a !== void 0 ? _a : totalCount;
            console.log(`Updated post ${postId} comment count to ${finalCount} (calculated: ${totalCount})`);
            return finalCount;
        }
        catch (error) {
            console.error('Error updating post comment count:', error);
            // Return calculated count even if update fails
            const totalCount = yield calculateTotalCommentCount(postId);
            return totalCount;
        }
    });
}
