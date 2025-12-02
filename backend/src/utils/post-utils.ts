import { Post } from '../models/post.model';
import { Like } from '../models/like.model';
import { Repost } from '../models/repost.model';
import { Comment } from '../models/comment.model';
import { Block } from '../models/block.model';
import { User } from '../models/user.model';
import { Types } from 'mongoose';

/**
 * Get trending posts based on engagement and recency.
 * Trending score = (likes * 2) + (comments * 1.5) + (reposts * 2.5) - (hours since posted * 0.5)
 * Returns posts sorted by score, most recent first for ties.
 */
export async function getTrendingPosts({ userId, limit = 10, hashtag }: { userId: string, limit?: number, hashtag?: string }) {
  // Exclude posts from blocked users or users who blocked you
  const blockedUsers = await Block.find({ blockerId: userId }).select('blockedId').lean();
  const blockedIds = blockedUsers.map((b: any) => b.blockedId);
  const blockedByUsers = await Block.find({ blockedId: userId }).select('blockerId').lean();
  const blockedByIds = blockedByUsers.map((b: any) => b.blockerId);

  // Build match query
  const match: any = {
    author: { $nin: [...blockedIds, ...blockedByIds], $ne: null, $exists: true }
  };
  if (hashtag) {
    match.hashtags = hashtag.toLowerCase();
  }

  // Aggregate trending posts
  const now = new Date();
  const posts = await Post.aggregate([
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
}

/**
 * Get explore posts: a mix of recent and popular posts, excluding blocked users and user's own posts.
 */
export async function getExplorePosts({ userId, limit = 20 }: { userId: string, limit?: number }) {
  // Exclude posts from blocked users or users who blocked you
  const blockedUsers = await Block.find({ blockerId: userId }).select('blockedId').lean();
  const blockedIds = blockedUsers.map((b: any) => b.blockedId);
  const blockedByUsers = await Block.find({ blockedId: userId }).select('blockerId').lean();
  const blockedByIds = blockedByUsers.map((b: any) => b.blockerId);

  // Exclude user's own posts
  const match: any = {
    author: { $nin: [...blockedIds, ...blockedByIds, userId], $ne: null, $exists: true }
  };

  // Mix of recent and popular posts
  const posts = await Post.aggregate([
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
}

/**
 * Get trending hashtags/topics (top N by post count in recent X days)
 */
export async function getTrendingHashtags({ days = 2, limit = 10 }: { days?: number, limit?: number }) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const hashtags = await Post.aggregate([
    { $match: { createdAt: { $gte: since }, hashtags: { $exists: true, $ne: [] } } },
    { $unwind: '$hashtags' },
    { $group: { _id: '$hashtags', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit }
  ]);
  return hashtags.map(h => ({ topic: h._id, postCount: h.count }));
} 