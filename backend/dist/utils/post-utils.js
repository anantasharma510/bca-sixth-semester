var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Post } from '../models/post.model';
import { Block } from '../models/block.model';
/**
 * Get trending posts based on engagement and recency.
 * Trending score = (likes * 2) + (comments * 1.5) + (reposts * 2.5) - (hours since posted * 0.5)
 * Returns posts sorted by score, most recent first for ties.
 */
export function getTrendingPosts(_a) {
    return __awaiter(this, arguments, void 0, function* ({ userId, limit = 10, hashtag }) {
        // Exclude posts from blocked users or users who blocked you
        const blockedUsers = yield Block.find({ blockerId: userId }).select('blockedId').lean();
        const blockedIds = blockedUsers.map((b) => b.blockedId);
        const blockedByUsers = yield Block.find({ blockedId: userId }).select('blockerId').lean();
        const blockedByIds = blockedByUsers.map((b) => b.blockerId);
        // Build match query
        const match = {
            author: { $nin: [...blockedIds, ...blockedByIds], $ne: null, $exists: true }
        };
        if (hashtag) {
            match.hashtags = hashtag.toLowerCase();
        }
        // Aggregate trending posts
        const now = new Date();
        const posts = yield Post.aggregate([
            { $match: match },
            {
                $addFields: {
                    trendingScore: {
                        $subtract: [
                            {
                                $add: [
                                    { $multiply: ['$likeCount', 2] },
                                    { $multiply: ['$commentCount', 1.5] },
                                    { $multiply: ['$repostCount', 2.5] }
                                ]
                            },
                            {
                                $multiply: [
                                    { $divide: [{ $subtract: [now, '$createdAt'] }, 1000 * 60 * 60] }, // hours since posted
                                    0.5
                                ]
                            }
                        ]
                    }
                }
            },
            { $sort: { trendingScore: -1, createdAt: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: 'users',
                    localField: 'author',
                    foreignField: '_id',
                    as: 'author'
                }
            },
            { $unwind: '$author' },
            {
                $match: {
                    'author._id': { $ne: null }
                }
            }
        ]);
        return posts;
    });
}
/**
 * Get explore posts: a mix of recent and popular posts, excluding blocked users and user's own posts.
 */
export function getExplorePosts(_a) {
    return __awaiter(this, arguments, void 0, function* ({ userId, limit = 20 }) {
        // Exclude posts from blocked users or users who blocked you
        const blockedUsers = yield Block.find({ blockerId: userId }).select('blockedId').lean();
        const blockedIds = blockedUsers.map((b) => b.blockedId);
        const blockedByUsers = yield Block.find({ blockedId: userId }).select('blockerId').lean();
        const blockedByIds = blockedByUsers.map((b) => b.blockerId);
        // Exclude user's own posts
        const match = {
            author: { $nin: [...blockedIds, ...blockedByIds, userId], $ne: null, $exists: true }
        };
        // Mix of recent and popular posts
        const posts = yield Post.aggregate([
            { $match: match },
            {
                $addFields: {
                    popularityScore: {
                        $add: [
                            { $multiply: ['$likeCount', 2] },
                            { $multiply: ['$commentCount', 1.5] },
                            { $multiply: ['$repostCount', 2.5] }
                        ]
                    }
                }
            },
            { $sort: { createdAt: -1, popularityScore: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: 'users',
                    localField: 'author',
                    foreignField: '_id',
                    as: 'author'
                }
            },
            { $unwind: '$author' },
            {
                $match: {
                    'author._id': { $ne: null }
                }
            }
        ]);
        return posts;
    });
}
/**
 * Get trending hashtags/topics (top N by post count in recent X days)
 */
export function getTrendingHashtags(_a) {
    return __awaiter(this, arguments, void 0, function* ({ days = 2, limit = 10 }) {
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const hashtags = yield Post.aggregate([
            { $match: { createdAt: { $gte: since }, hashtags: { $exists: true, $ne: [] } } },
            { $unwind: '$hashtags' },
            { $group: { _id: '$hashtags', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: limit }
        ]);
        return hashtags.map(h => ({ topic: h._id, postCount: h.count }));
    });
}
