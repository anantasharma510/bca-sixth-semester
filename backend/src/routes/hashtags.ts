// @ts-nocheck
import { Request, Response, NextFunction, Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { Post } from '../models/post.model';
import { Repost } from '../models/repost.model';
import { Block } from '../models/block.model';
import { Like } from '../models/like.model';

const router = Router();

// Fixed asyncHandler to properly handle Express types
function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return function (req: Request, res: Response, next: NextFunction): void {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Get posts by hashtag
router.get(
  '/:hashtag/posts',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const currentUserId = userId;
    const { hashtag } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const pageNum = parseInt(String(page));
    const limitNum = parseInt(String(limit));
    const skip = (pageNum - 1) * limitNum;

    // Normalize hashtag (remove # if present, convert to lowercase)
    const normalizedHashtag = hashtag.replace(/^#/, '').toLowerCase();

    console.log('Backend: Getting posts for hashtag:', normalizedHashtag, 'page:', pageNum, 'limit:', limitNum);

    // Get users that the current user has blocked
    const blockedUsers = await Block.find({ blockerId: currentUserId })
      .select('blockedId')
      .lean();
    
    const blockedIds = blockedUsers.map((b: any) => b.blockedId);

    // Get users who have blocked the current user
    const blockedByUsers = await Block.find({ blockedId: currentUserId })
      .select('blockerId')
      .lean();
    
    const blockedByIds = blockedByUsers.map((b: any) => b.blockerId);

    // Get original posts with the hashtag, excluding blocked users
    // MongoDB automatically checks if normalizedHashtag is in the hashtags array
    const originalPosts = await Post.find({
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
    const reposts = await Repost.find({
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
    const validReposts = reposts.filter(repost => 
      repost.user && 
      repost.user._id && 
      repost.originalPost && 
      repost.originalPost.author
    );

    // Combine posts and reposts and sort by creation date
    const allContent = [
      ...validOriginalPosts.map(post => ({
        ...post,
        isRepost: false,
        type: 'post'
      })),
      ...validReposts.map(repost => {
        const originalPost = repost.originalPost as any;
        const originalAuthor = originalPost?.author;
        
        // Check if the original author is blocked by current user or vice versa
        const isOriginalAuthorBlocked = originalAuthor ? blockedIds.includes(originalAuthor._id) : false;
        const isOriginalAuthorBlocking = originalAuthor ? blockedByIds.includes(originalAuthor._id) : false;
        
        return {
          _id: repost._id,
          isRepost: true,
          type: 'repost',
          repostUser: repost.user,
          originalPost: {
            ...originalPost,
            author: isOriginalAuthorBlocked || isOriginalAuthorBlocking ? {
              _id: originalAuthor?._id,
              username: 'blocked_user',
              firstName: 'Blocked',
              lastName: 'User',
              profileImageUrl: '/placeholder-user.jpg'
            } : originalAuthor
          },
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
    const originalPostIds = originalPosts.map((p: any) => p._id);
    const userLikes = await Like.find({ 
      user: currentUserId, 
      post: { $in: originalPostIds } 
    }).lean();
    
    const likeMap = new Set(userLikes.map((like: any) => like.post.toString()));

    // Add like and repost status to content
    const contentWithStatus = paginatedContent.map((item: any) => {
      if (item.isRepost) {
        // For reposts, use the original post's like status
        const originalPost = item.originalPost;
        return {
          ...item,
          isLiked: likeMap.has(originalPost._id.toString()),
          isReposted: false // Always false to allow unlimited reposting
        };
      } else {
        // For original posts
        return {
          ...item,
          isLiked: likeMap.has(item._id.toString()),
          isReposted: false // Always false to allow unlimited reposting
        };
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
  })
);

export default router;

