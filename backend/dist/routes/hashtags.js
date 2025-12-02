var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// @ts-nocheck
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { Post } from '../models/post.model';
import { Repost } from '../models/repost.model';
import { Block } from '../models/block.model';
import { Like } from '../models/like.model';
const router = Router();
// Fixed asyncHandler to properly handle Express types
function asyncHandler(fn) {
    return function (req, res, next) {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
// Get posts by hashtag
router.get('/:hashtag/posts', requireAuth, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.userId;
    const currentUserId = userId;
    const { hashtag } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const pageNum = parseInt(String(page));
    const limitNum = parseInt(String(limit));
    const skip = (pageNum - 1) * limitNum;
    // Normalize hashtag (remove # if present, convert to lowercase)
    const normalizedHashtag = hashtag.replace(/^#/, '').toLowerCase();
    console.log('Backend: Getting posts for hashtag:', normalizedHashtag, 'page:', pageNum, 'limit:', limitNum);
    // Get users that the current user has blocked
    const blockedUsers = yield Block.find({ blockerId: currentUserId })
        .select('blockedId')
        .lean();
    const blockedIds = blockedUsers.map((b) => b.blockedId);
    // Get users who have blocked the current user
    const blockedByUsers = yield Block.find({ blockedId: currentUserId })
        .select('blockerId')
        .lean();
    const blockedByIds = blockedByUsers.map((b) => b.blockerId);
    // Get original posts with the hashtag, excluding blocked users
    // MongoDB automatically checks if normalizedHashtag is in the hashtags array
    const originalPosts = yield Post.find({
        hashtags: normalizedHashtag, // This works for arrays - MongoDB checks if value is in array
        author: {
            $nin: [...blockedIds, ...blockedByIds],
            $ne: null,
            $exists: true
        }
    })
        .sort({ createdAt: -1 })
        .populate({
        path: 'author',
        select: 'username firstName lastName profileImageUrl',
        match: { _id: { $ne: null } }
    })
        .lean();
    // Get reposts where the original post has the hashtag, excluding blocked users
    const reposts = yield Repost.find({
        user: {
            $nin: [...blockedIds, ...blockedByIds],
            $ne: null,
            $exists: true
        }
    })
        .sort({ createdAt: -1 })
        .populate({
        path: 'user',
        select: 'username firstName lastName profileImageUrl',
        match: { _id: { $ne: null } }
    })
        .populate({
        path: 'originalPost',
        match: {
            hashtags: normalizedHashtag,
            author: { $ne: null }
        },
        populate: {
            path: 'author',
            select: 'username firstName lastName profileImageUrl',
            match: { _id: { $ne: null } }
        }
    })
        .lean();
    // Filter out posts with null authors after population
    const validOriginalPosts = originalPosts.filter(post => post.author && post.author._id);
    const validReposts = reposts.filter(repost => repost.user &&
        repost.user._id &&
        repost.originalPost &&
        repost.originalPost.author);
    // Combine posts and reposts and sort by creation date
    const allContent = [
        ...validOriginalPosts.map(post => (Object.assign(Object.assign({}, post), { isRepost: false, type: 'post' }))),
        ...validReposts.map(repost => {
            const originalPost = repost.originalPost;
            const originalAuthor = originalPost === null || originalPost === void 0 ? void 0 : originalPost.author;
            // Check if the original author is blocked by current user or vice versa
            const isOriginalAuthorBlocked = originalAuthor ? blockedIds.includes(originalAuthor._id) : false;
            const isOriginalAuthorBlocking = originalAuthor ? blockedByIds.includes(originalAuthor._id) : false;
            return {
                _id: repost._id,
                isRepost: true,
                type: 'repost',
                repostUser: repost.user,
                originalPost: Object.assign(Object.assign({}, originalPost), { author: isOriginalAuthorBlocked || isOriginalAuthorBlocking ? {
                        _id: originalAuthor === null || originalAuthor === void 0 ? void 0 : originalAuthor._id,
                        username: 'blocked_user',
                        firstName: 'Blocked',
                        lastName: 'User',
                        profileImageUrl: '/placeholder-user.jpg'
                    } : originalAuthor }),
                repostComment: repost.comment,
                repostCreatedAt: repost.createdAt,
                createdAt: repost.createdAt, // For sorting
                isOriginalAuthorBlocked: isOriginalAuthorBlocked,
                isOriginalAuthorBlocking: isOriginalAuthorBlocking
            };
        })
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    // Apply pagination
    const paginatedContent = allContent.slice(skip, skip + limitNum);
    // Get like status for current user (for original posts)
    const originalPostIds = originalPosts.map((p) => p._id);
    const userLikes = yield Like.find({
        user: currentUserId,
        post: { $in: originalPostIds }
    }).lean();
    const likeMap = new Set(userLikes.map((like) => like.post.toString()));
    // Add like and repost status to content
    const contentWithStatus = paginatedContent.map((item) => {
        if (item.isRepost) {
            // For reposts, use the original post's like status
            const originalPost = item.originalPost;
            return Object.assign(Object.assign({}, item), { isLiked: likeMap.has(originalPost._id.toString()), isReposted: false // Always false to allow unlimited reposting
             });
        }
        else {
            // For original posts
            return Object.assign(Object.assign({}, item), { isLiked: likeMap.has(item._id.toString()), isReposted: false // Always false to allow unlimited reposting
             });
        }
    });
    const response = {
        posts: contentWithStatus,
        pagination: {
            currentPage: pageNum,
            totalPages: Math.ceil(allContent.length / limitNum),
            totalPosts: allContent.length,
            hasNextPage: (pageNum * limitNum) < allContent.length,
            hasPrevPage: pageNum > 1
        }
    };
    console.log('Backend: Sending hashtag posts response:', {
        postsCount: contentWithStatus.length,
        pagination: response.pagination,
        totalPosts: allContent.length
    });
    res.json(response);
})));
export default router;
