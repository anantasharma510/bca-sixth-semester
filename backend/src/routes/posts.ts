// @ts-nocheck
import { Request, Response, NextFunction, Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { Post } from '../models/post.model';
import { User } from '../models/user.model';
import { Like } from '../models/like.model';
import { Comment } from '../models/comment.model';
import { Repost } from '../models/repost.model';
import { Notification } from '../models/notification.model';
import { upload, uploadWithVideo } from '../middleware/multer';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary';
import { v2 as cloudinary } from 'cloudinary';
import { Block } from '../models/block.model';
import { updatePostCommentCount } from '../utils/comment-utils';
import { getTrendingPosts, getExplorePosts, getTrendingHashtags } from '../utils/post-utils';
import { filterContent } from '../utils/contentFilter';
import { analyzeImage, logImageViolation } from '../utils/imageFilter';
import { io } from '../index';
import { createAndEmitNotification } from '../utils/notification-utils';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const router = Router();

// Fixed asyncHandler to properly handle Express types
function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return function (req: Request, res: Response, next: NextFunction): void {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Create a new post
router.post(
  '/',
  requireAuth,
  uploadWithVideo.array('media', 4), // Allow up to 4 media files (images or videos)
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId;
      const { content, hashtags, mentions } = req.body;
      
      // Check if there are any media files uploaded
      const hasMedia = req.files && Array.isArray(req.files) && req.files.length > 0;
      
      // Log upload details for debugging
      if (hasMedia) {
        console.log(`📹 Upload started - Files: ${req.files.length}`);
        req.files.forEach((file: Express.Multer.File, index: number) => {
          const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
          console.log(`📁 File ${index + 1}: ${file.mimetype}, Size: ${fileSizeMB}MB`);
        });
      }
      
      // Allow posts with either content OR media (or both)
      if ((!content || content.trim().length === 0) && !hasMedia) {
        return res.status(400).json({ error: 'Post must contain either content or media' });
      }

      if (content && content.length > 1500) {
        return res.status(400).json({ error: 'Post content cannot exceed 1500 characters' });
      }

      // Content filtering for Apple App Store compliance
      if (content && content.trim().length > 0) {
        try {
          const filterResult = await filterContent(content.trim());
          
          if (!filterResult.isClean) {
            console.log(`🚫 Content filtered: ${filterResult.violations.join(', ')}`);
            return res.status(400).json({ 
              error: filterResult.message || 'Content violates community guidelines',
              violations: filterResult.violations,
              severity: filterResult.severity
            });
          }
        } catch (filterError) {
          console.error('Content filtering error:', filterError);
          // In case of filtering error, be conservative and reject the post
          return res.status(500).json({ 
            error: 'Content verification failed. Please try again.' 
          });
        }
      }

      // Handle media uploads to Cloudinary
      const media: any[] = [];
      if (hasMedia) {
        // Validate media mix - only allow 2 videos maximum
        const videoFiles = req.files.filter((file: Express.Multer.File) => file.mimetype.startsWith('video/'));
        const imageFiles = req.files.filter((file: Express.Multer.File) => file.mimetype.startsWith('image/'));
        
        if (videoFiles.length > 2) {
          return res.status(400).json({ error: 'Maximum 2 videos allowed per post' });
        }

        for (const file of req.files as Express.Multer.File[]) {
          try {
            const resourceType = file.mimetype.startsWith('video/') ? 'video' : 'image';
            const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
            console.log(`☁️ Starting Cloudinary upload - Type: ${resourceType}, Size: ${fileSizeMB}MB`);
            
            // Check Cloudinary file size limits before upload
            const fileSizeInMB = file.size / (1024 * 1024);
            const cloudinaryLimit = 100; // Cloudinary free plan limit
            
            if (fileSizeInMB > cloudinaryLimit) {
              console.error(`❌ File too large: ${fileSizeMB}MB > ${cloudinaryLimit}MB`);
              return res.status(400).json({ 
                error: `File size (${fileSizeMB}MB) exceeds the maximum allowed size (${cloudinaryLimit}MB). Please use a smaller file.` 
              });
            }

            // Image content filtering for Apple App Store compliance
            if (resourceType === 'image') {
              try {
                const imageAnalysis = await analyzeImage(file.buffer);
                
                if (!imageAnalysis.isClean) {
                  console.log(`🚫 Image filtered: ${imageAnalysis.violations.join(', ')}`);
                  
                  // Log the violation for admin review
                  logImageViolation(file.buffer, imageAnalysis, userId);
                  
                  return res.status(400).json({
                    error: 'Image contains inappropriate content',
                    violations: imageAnalysis.violations,
                    severity: imageAnalysis.severity,
                    message: 'Your image violates our community guidelines and cannot be uploaded. Please choose a different image.'
                  });
                }
              } catch (filterError) {
                console.error('Image filtering error:', filterError);
                // In case of filtering error, be conservative and reject the image
                return res.status(500).json({
                  error: 'Image verification failed. Please try again with a different image.'
                });
              }
            }
            
            const result = await uploadToCloudinary(file.buffer, 'posts', resourceType);
            
            if (resourceType === 'video') {
              media.push({
                type: 'video',
                url: (result as any).secure_url,
                thumbnailUrl: (result as any).eager?.[0]?.secure_url || (result as any).secure_url
              });
            } else {
              media.push({
                type: 'image',
                url: (result as any).secure_url,
                thumbnailUrl: (result as any).secure_url
              });
            }
          } catch (error) {
            console.error('Error uploading media:', error);
            return res.status(500).json({ error: 'Failed to upload media' });
          }
        }
      }

      // Parse hashtags and mentions
      const parsedHashtags = hashtags ? JSON.parse(hashtags) : [];
      const parsedMentions = mentions ? JSON.parse(mentions) : [];

      // Create the post
      const post = await Post.create({
        author: userId,
        content: content ? content.trim() : '', // Allow empty content if media is present
        media: media.length > 0 ? media : undefined,
        hashtags: parsedHashtags,
        mentions: parsedMentions,
      });

      // Increment user's post count
      await User.findByIdAndUpdate(userId, { $inc: { postCount: 1 } });

      // Populate author information
      await post.populate('author', 'username firstName lastName profileImageUrl');

      // Emit new post to all connected users via Socket.IO
      const postWithStatus = {
        ...post.toObject(),
        isRepost: false,
        type: 'post',
        isLiked: false,
        isReposted: false
      };

      // Import io at the top of the file and emit the new post
      io.emit('newPost', postWithStatus);
      console.log('Socket.IO: Emitted new post to all users:', post._id);

      res.status(201).json({ post });
    } catch (error) {
      next(error);
    }
  }
);

// Get recent media uploaded by the authenticated user
router.get(
  '/recent-media',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const clerkUser = (req as any).user;
    const rawLimit = parseInt(req.query.limit as string, 10);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 60) : 20;
    const desiredSize = limit + 1; // fetch enough to know if there are more items

    // Fetch more posts than requested media items to account for multi-media posts
    const posts = await Post.find({
      author: userId,
      media: { $exists: true, $ne: [] },
    })
      .sort({ createdAt: -1 })
      .limit(desiredSize * 3) // heuristic multiplier
      .lean();

    const media: Array<{
      postId: string;
      mediaIndex: number;
      type: 'image' | 'video';
      url: string;
      thumbnailUrl?: string;
      createdAt: Date;
      contentSnippet: string;
    }> = [];

    const addSnippet = (content?: string | null) => {
      if (!content) return '';
      return content.length > 120 ? `${content.slice(0, 117)}...` : content;
    };

    for (const post of posts) {
      const postId = post._id?.toString?.() || String(post._id);
      const createdAt = post.createdAt instanceof Date ? post.createdAt : new Date(post.createdAt);
      const snippet = addSnippet(post.content);

      (post.media || []).forEach((item: any, index: number) => {
        if (media.length >= desiredSize) {
          return;
        }

        if (!item || typeof item !== 'object') {
          console.warn('Skipping invalid media item on post', postId, item);
          return;
        }

        const url = item.url || item.secure_url;
        if (!url) {
          console.warn('Skipping media without URL on post', postId, item);
          return;
        }

        const type = item.type === 'video' ? 'video' : 'image';

        media.push({
          postId,
          mediaIndex: index,
          type,
          url,
          thumbnailUrl: item.thumbnailUrl || item.previewUrl || url,
          createdAt,
          contentSnippet: snippet,
        });
      });

      if (media.length >= desiredSize) {
        break;
      }
    }

    const hasMore = media.length > limit;
    const trimmed = hasMore ? media.slice(0, limit) : media;

    res.json({
      media: trimmed,
      pagination: {
        limit,
        hasMore,
      },
    });
  })
);

// Get posts (with pagination and filtering for blocked users)
router.get(
  '/',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId;
      const currentUserId = userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const pageNum = parseInt(String(page));
      const limitNum = parseInt(String(limit));
      const skip = (pageNum - 1) * limitNum;

      console.log('Backend: Getting posts for user:', currentUserId, 'page:', pageNum, 'limit:', limitNum);

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

      // Get original posts excluding blocked users and users who blocked you
      const originalPosts = await Post.find({
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

      // Get reposts excluding blocked users and users who blocked you
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
          match: { author: { $ne: null } },
          populate: {
            path: 'author',
            select: 'username firstName lastName profileImageUrl',
            match: { _id: { $ne: null } }
          }
        })
        .lean();

      // Filter out posts with null authors after population
      const validOriginalPosts = originalPosts.filter(post => post.author && post.author._id);
      const validReposts = reposts.filter(repost => repost.user && repost.user._id);

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
          
          // Check if the original post was deleted
          const isOriginalPostDeleted = !originalPost;
          
          // Check if the original author is blocked by current user or vice versa
          const isOriginalAuthorBlocked = originalAuthor ? blockedIds.includes(originalAuthor._id) : false;
          const isOriginalAuthorBlocking = originalAuthor ? blockedByIds.includes(originalAuthor._id) : false;
          
          return {
            _id: repost._id,
            isRepost: true,
            type: 'repost',
            repostUser: repost.user,
            originalPost: isOriginalPostDeleted ? {
              _id: 'deleted',
              content: 'This post has been deleted',
              author: {
                _id: 'deleted',
                username: 'deleted_user',
                firstName: 'Deleted',
                lastName: 'Post',
                profileImageUrl: '/placeholder-user.jpg'
              },
              createdAt: repost.createdAt,
              likeCount: 0,
              commentCount: 0,
              repostCount: 0
            } : {
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
            isOriginalAuthorBlocking: isOriginalAuthorBlocking,
            isOriginalPostDeleted: isOriginalPostDeleted
          };
        })
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Apply pagination
      const paginatedContent = allContent.slice(skip, skip + limitNum);

      console.log('Backend: Pagination details:', {
        totalContent: allContent.length,
        page: pageNum,
        limit: limitNum,
        skip,
        paginatedContentLength: paginatedContent.length,
        hasNextPage: (pageNum * limitNum) < allContent.length
      });

      // Get like status for current user (for original posts)
      const originalPostIds = originalPosts.map((p: any) => p._id);
      const userLikes = await Like.find({ 
        user: currentUserId, 
        post: { $in: originalPostIds } 
      }).lean();
      
      const likeMap = new Set(userLikes.map((like: any) => like.post.toString()));

      // Note: Removed repost status check since we now allow unlimited reposting
      // Users can repost the same content multiple times

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

      console.log('Backend: Sending posts response:', {
        postsCount: contentWithStatus.length,
        pagination: response.pagination,
        totalPosts: allContent.length
      });

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Get public posts for non-authenticated users (sample posts)
router.get(
  '/public',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const pageNum = parseInt(String(page));
      const limitNum = parseInt(String(limit));
      const skip = (pageNum - 1) * limitNum;
      
      console.log('Backend: Getting public posts, page:', pageNum, 'limit:', limitNum);

      // Get recent posts from public accounts (no private filtering needed for public endpoint)
      const originalPosts = await Post.find({
        author: { $ne: null, $exists: true }
      })
        .sort({ createdAt: -1 })
        .populate({
          path: 'author',
          select: 'username firstName lastName profileImageUrl',
          match: { _id: { $ne: null } }
        })
        .lean();

      // Get recent reposts
      const reposts = await Repost.find({
        user: { $ne: null, $exists: true }
      })
        .sort({ createdAt: -1 })
        .populate({
          path: 'user',
          select: 'username firstName lastName profileImageUrl',
          match: { _id: { $ne: null } }
        })
        .populate({
          path: 'originalPost',
          match: { author: { $ne: null } },
          populate: {
            path: 'author',
            select: 'username firstName lastName profileImageUrl',
            match: { _id: { $ne: null } }
          }
        })
        .lean();

      // Filter out posts with null authors after population
      const validOriginalPosts = originalPosts.filter(post => post.author && post.author._id);
      const validReposts = reposts.filter(repost => repost.user && repost.user._id);

      // Combine posts and reposts and sort by creation date
      const allContent = [
        ...validOriginalPosts.map(post => ({
          ...post,
          isRepost: false,
          type: 'post',
          isLiked: false, // Non-authenticated users can't like
          isReposted: false // Non-authenticated users can't repost
        })),
        ...validReposts.map(repost => {
          const originalPost = repost.originalPost as any;
          
          // Check if the original post was deleted
          const isOriginalPostDeleted = !originalPost;
          
          return {
            _id: repost._id,
            isRepost: true,
            type: 'repost',
            repostUser: repost.user,
            originalPost: isOriginalPostDeleted ? {
              _id: 'deleted',
              content: 'This post has been deleted',
              author: {
                _id: 'deleted',
                username: 'deleted_user',
                firstName: 'Deleted',
                lastName: 'Post',
                profileImageUrl: '/placeholder-user.jpg'
              },
              createdAt: repost.createdAt,
              likeCount: 0,
              commentCount: 0,
              repostCount: 0
            } : {
              ...originalPost,
              isLiked: false, // Non-authenticated users can't like
              isReposted: false // Non-authenticated users can't repost
            },
            repostComment: repost.comment,
            repostCreatedAt: repost.createdAt,
            createdAt: repost.createdAt, // For sorting
            isOriginalPostDeleted: isOriginalPostDeleted
          };
        })
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Apply pagination
      const paginatedContent = allContent.slice(skip, skip + limitNum);

      console.log('Backend: Public posts pagination details:', {
        totalContent: allContent.length,
        page: pageNum,
        limit: limitNum,
        skip,
        paginatedContentLength: paginatedContent.length,
        hasNextPage: (pageNum * limitNum) < allContent.length
      });

      const response = {
        posts: paginatedContent,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(allContent.length / limitNum),
          totalPosts: allContent.length,
          hasNextPage: (pageNum * limitNum) < allContent.length,
          hasPrevPage: pageNum > 1
        }
      };

      console.log('Backend: Sending public posts response:', {
        postsCount: paginatedContent.length,
        pagination: response.pagination,
        totalPosts: allContent.length
      });

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// Get trending posts
(router as any).get(
  '/trending',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const currentUserId = (req as any).userId;
    const limit = parseInt(req.query.limit as string) || 10;
    const hashtag = req.query.hashtag as string | undefined;
    const posts = await getTrendingPosts({ userId: currentUserId, limit, hashtag });
    res.json({ posts });
  })
);

// Get trending hashtags/topics
router.get(
  '/trending-hashtags',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const days = req.query.days ? parseInt(req.query.days as string) : 2;
    const hashtags = await getTrendingHashtags({ days, limit });
    res.json({ hashtags });
  })
);

// Get explore posts
router.get(
  '/explore',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const currentUserId = (req as any).userId;
    const limit = parseInt(req.query.limit as string) || 20;
    const posts = await getExplorePosts({ userId: currentUserId, limit });
    res.json({ posts });
  })
);

// Get a specific post
router.get(
  '/:postId',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId;
      const { postId } = req.params;

      const post = await Post.findById(postId)
        .populate({
          path: 'author',
          select: 'username firstName lastName profileImageUrl',
          match: { _id: { $ne: null } }
        })
        .lean();

      if (!post || !post.author) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Check if user liked this post
      const userLike = await Like.findOne({
        user: userId,
        post: postId
      });

      // Note: Removed repost status check since we now allow unlimited reposting
      // Users can repost the same content multiple times

      const postWithStatus = {
        ...post,
        isLiked: !!userLike,
        isReposted: false // Always false to allow unlimited reposting
      };

      res.json({ post: postWithStatus });
    } catch (error) {
      next(error);
    }
  }
);

// Update a post
router.put(
  '/:postId',
  requireAuth,
  uploadWithVideo.array('media', 4), // Allow up to 4 media files (images or videos)
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId;
      const { postId } = req.params;
      const { content, hashtags, mentions, removeImages } = req.body;

      // Find the post and check ownership
      const post = await Post.findById(postId);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      if (post.author.toString() !== userId) {
        return res.status(403).json({ error: 'You can only edit your own posts' });
      }

      // Check if there are any media files (existing or new)
      const hasExistingMedia = post.media && post.media.length > 0;
      const hasNewMedia = req.files && Array.isArray(req.files) && req.files.length > 0;
      const hasMedia = hasExistingMedia || hasNewMedia;
      
      // Allow posts with either content OR media (or both)
      if ((!content || content.trim().length === 0) && !hasMedia) {
        return res.status(400).json({ error: 'Post must contain either content or media' });
      }

      if (content && content.length > 1500) {
        return res.status(400).json({ error: 'Post content cannot exceed 1500 characters' });
      }

      // Handle existing media
      let media: any[] = [...(post.media || [])];
      
      console.log('Backend: Original media array:', media);
      console.log('Backend: removeImages parameter:', removeImages);
      
      // Remove specified media - sort indices in descending order to avoid index shifting issues
      if (removeImages) {
        const indicesToRemove = JSON.parse(removeImages);
        console.log('Backend: Parsed indices to remove:', indicesToRemove);
        
        // Sort in descending order so we remove from highest index first
        indicesToRemove.sort((a: number, b: number) => b - a);
        console.log('Backend: Sorted indices to remove:', indicesToRemove);
        
        // Delete media files from Cloudinary before removing from array
        const mediaToDelete = indicesToRemove.map((index: number) => media[index]).filter(Boolean);
        const deletePromises = mediaToDelete.map(async (mediaItem) => {
          try {
            // Extract public ID from Cloudinary URL
            const url = mediaItem.url;
            const urlParts = url.split('/');
            const uploadIndex = urlParts.findIndex(part => part === 'upload');
            if (uploadIndex !== -1 && uploadIndex + 2 < urlParts.length) {
              const folderAndFile = urlParts.slice(uploadIndex + 2).join('/');
              const publicId = folderAndFile.split('.')[0]; // Remove file extension
              
              // Delete from Cloudinary
              await deleteFromCloudinary(publicId, mediaItem.type);
              console.log(`Deleted ${mediaItem.type} from Cloudinary: ${publicId}`);
            } else {
              console.error(`Invalid Cloudinary URL format: ${url}`);
            }
          } catch (error) {
            console.error(`Error deleting ${mediaItem.type} from Cloudinary:`, error);
            // Continue with deletion even if Cloudinary cleanup fails
          }
        });
        
        await Promise.all(deletePromises);
        
        indicesToRemove.forEach((index: number) => {
          console.log('Backend: Removing media at index:', index);
          if (media[index]) {
            console.log('Backend: Found media at index', index, 'removing...');
            media.splice(index, 1);
            console.log('Backend: Media array after removal:', media);
          } else {
            console.log('Backend: No media found at index', index);
          }
        });
      }
      
      console.log('Backend: Final media array before adding new media:', media);

      // Add new media
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        // Validate media mix - only allow 2 videos maximum
        const videoFiles = req.files.filter((file: Express.Multer.File) => file.mimetype.startsWith('video/'));
        const imageFiles = req.files.filter((file: Express.Multer.File) => file.mimetype.startsWith('image/'));
        
        // Count existing videos
        const existingVideos = media.filter((item: any) => item.type === 'video').length;
        
        if (existingVideos + videoFiles.length > 2) {
          return res.status(400).json({ error: 'Maximum 2 videos allowed per post' });
        }

        for (const file of req.files as Express.Multer.File[]) {
          try {
            const resourceType = file.mimetype.startsWith('video/') ? 'video' : 'image';
            const result = await uploadToCloudinary(file.buffer, 'posts', resourceType);
            
            if (resourceType === 'video') {
              media.push({
                type: 'video',
                url: (result as any).secure_url,
                thumbnailUrl: (result as any).eager?.[0]?.secure_url || (result as any).secure_url
              });
            } else {
              media.push({
                type: 'image',
                url: (result as any).secure_url,
                thumbnailUrl: (result as any).secure_url
              });
            }
          } catch (error) {
            console.error('Error uploading media:', error);
            return res.status(500).json({ error: 'Failed to upload media' });
          }
        }
      }

      // Parse hashtags and mentions
      const parsedHashtags = hashtags ? JSON.parse(hashtags) : [];
      const parsedMentions = mentions ? JSON.parse(mentions) : [];

      console.log('Backend: Final media array to save to database:', media);

      // Update the post
      const updatedPost = await Post.findByIdAndUpdate(
        postId,
        {
          content: content ? content.trim() : '', // Allow empty content if media is present
          media: media, // Always use the media array, even if empty
          hashtags: parsedHashtags,
          mentions: parsedMentions,
        },
        { new: true }
      ).populate('author', 'username firstName lastName profileImageUrl');

      // Update post's comment count to include all comments and replies
      await updatePostCommentCount(postId);

      // Emit post update to all connected users via Socket.IO
      const updatedPostWithStatus = {
        ...(updatedPost?.toObject() || {}),
        isRepost: false,
        type: 'post',
        isLiked: false,
        isReposted: false
      };
      io.emit('postUpdated', updatedPostWithStatus);
      console.log('Socket.IO: Emitted post update to all users:', postId);

      res.json({ post: updatedPost });
    } catch (error) {
      next(error);
    }
  }
);

// Delete a post
router.delete(
  '/:postId',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId;
      const { postId } = req.params;

      // Find the post and check ownership
      const post = await Post.findById(postId);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      if (post.author.toString() !== userId) {
        return res.status(403).json({ error: 'You can only delete your own posts' });
      }

      // Delete media files from Cloudinary
      if (post.media && post.media.length > 0) {
        const deletePromises = post.media.map(async (mediaItem) => {
          try {
            // Extract public ID from Cloudinary URL
            const url = mediaItem.url;
            // Cloudinary URL format: https://res.cloudinary.com/cloud_name/image/v1234567890/folder/filename.jpg
            const urlParts = url.split('/');
            const uploadIndex = urlParts.findIndex(part => part === 'upload');
            if (uploadIndex !== -1 && uploadIndex + 2 < urlParts.length) {
              const folderAndFile = urlParts.slice(uploadIndex + 2).join('/');
              const publicId = folderAndFile.split('.')[0]; // Remove file extension
              
              // Delete from Cloudinary
              await deleteFromCloudinary(publicId, mediaItem.type);
              console.log(`Deleted ${mediaItem.type} from Cloudinary: ${publicId}`);
            } else {
              console.error(`Invalid Cloudinary URL format: ${url}`);
            }
          } catch (error) {
            console.error(`Error deleting ${mediaItem.type} from Cloudinary:`, error);
            // Continue with deletion even if Cloudinary cleanup fails
          }
        });
        
        await Promise.all(deletePromises);
      }

      // Delete associated likes and comments
      await Promise.all([
        Like.deleteMany({ post: postId }),
        Comment.deleteMany({ post: postId })
      ]);

      // Delete the post
      await Post.findByIdAndDelete(postId);

      // Decrement user's post count
      await User.findByIdAndUpdate(userId, { $inc: { postCount: -1 } });

      // Update post's comment count to include all comments and replies
      await updatePostCommentCount(postId);

      // Emit post deletion to all connected users via Socket.IO
      io.emit('postDeleted', { postId });
      console.log('Socket.IO: Emitted post deletion to all users:', postId);

      res.json({ message: 'Post deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// Like/Unlike a post
router.post(
  '/:postId/like',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId;
      const { postId } = req.params;

      console.log('Backend: Like/Unlike request for post:', postId, 'by user:', userId);

      const post = await Post.findById(postId);
      if (!post) {
        console.log('Backend: Post not found for like:', postId);
        return res.status(404).json({ error: 'Post not found' });
      }

      console.log('Backend: Found post, checking existing like...');

      const existingLike = await Like.findOne({
        user: userId,
        post: postId
      });

      console.log('Backend: Existing like found:', !!existingLike);

      if (existingLike) {
        // Unlike
        console.log('Backend: Removing like...');
        await Like.findByIdAndDelete(existingLike._id);
        const updatedPost = await Post.findByIdAndUpdate(
          postId, 
          { $inc: { likeCount: -1 } },
          { new: true }
        );
        console.log('Backend: Like removed, new count:', updatedPost?.likeCount);
        
        // Emit like count update to all users
        io.emit('postLikeCountUpdated', {
          postId,
          likeCount: updatedPost?.likeCount || 0
        });
        // Emit liked state only to the acting user (personal room)
        io.to(`user_${userId}`).emit('postLiked', {
          postId,
          liked: false,
          likeCount: updatedPost?.likeCount || 0
        });
        console.log('Socket.IO: Emitted post unlike event for post:', postId);
        
        res.json({ liked: false, likeCount: updatedPost?.likeCount || 0 });
      } else {
        // Like
        console.log('Backend: Adding like...');
        
        // First, ensure no conflicting likes exist for this user
        await Like.deleteMany({
          user: userId,
          $or: [
            { post: postId },
            { comment: { $exists: false } }
          ]
        });
        
        // Create the new like
        const newLike = await Like.create({
          user: userId,
          post: postId
        });
        
        console.log('Backend: Like created:', newLike._id);
        
        const updatedPost = await Post.findByIdAndUpdate(
          postId, 
          { $inc: { likeCount: 1 } },
          { new: true }
        );
        
        // Create notification for post author (if not liking own post)
        await createAndEmitNotification({
          recipient: post.author.toString(),
          sender: userId,
          type: 'like',
          post: postId
        });
        
        // Emit like count update to all users
        io.emit('postLikeCountUpdated', {
          postId,
          likeCount: updatedPost?.likeCount || 0
        });
        // Emit liked state only to the acting user (personal room)
        io.to(`user_${userId}`).emit('postLiked', {
          postId,
          liked: true,
          likeCount: updatedPost?.likeCount || 0
        });
        console.log('Socket.IO: Emitted post like event for post:', postId);
        
        console.log('Backend: Like added, new count:', updatedPost?.likeCount);
        res.json({ liked: true, likeCount: updatedPost?.likeCount || 0 });
      }
    } catch (error: any) {
      console.error('Backend: Error in like/unlike:', error);
      
      // Handle duplicate key errors specifically
      if (error.code === 11000) {
        console.log('Backend: Duplicate key error detected, attempting to fix...');
        
        try {
          // Try to find and remove any conflicting likes
          await Like.deleteMany({
            user: userId,
            post: postId
          });
          
          // Try the operation again
          const newLike = await Like.create({
            user: userId,
            post: postId
          });
          
          const updatedPost = await Post.findByIdAndUpdate(
            postId, 
            { $inc: { likeCount: 1 } },
            { new: true }
          );
          
          // Emit like event via Socket.IO for real-time updates
          io.emit('postLiked', {
            postId,
            liked: true,
            likeCount: updatedPost?.likeCount || 0,
            userId: userId
          });
          console.log('Socket.IO: Emitted post like event for post:', postId);
          
          console.log('Backend: Fixed duplicate key error, like added successfully');
          res.json({ liked: true, likeCount: updatedPost?.likeCount || 0 });
          return;
        } catch (retryError) {
          console.error('Backend: Failed to fix duplicate key error:', retryError);
        }
      }
      
      next(error);
    }
  }
);

// Get comments for a post
router.get(
  '/:postId/comments',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId;
      const { postId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      // Check if post exists
      const post = await Post.findById(postId);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Get comments with author info (only top-level comments, not replies)
      const comments = await Comment.find({ 
        post: postId,
        parentComment: { $exists: false } // Only get top-level comments
      })
        .populate('author', 'username firstName lastName profileImageUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      console.log('Backend: Found top-level comments:', comments.length);
      comments.forEach((comment, index) => {
        console.log(`Backend: Comment ${index + 1}:`, {
          _id: comment._id,
          author: comment.author,
          content: comment.content,
          parentComment: comment.parentComment
        });
      });

      // Get like status for current user
      const commentIds = comments.map(comment => comment._id);
      const userLikes = await Like.find({
        user: userId,
        comment: { $in: commentIds }
      }).lean();

      const likeMap = new Map(userLikes.map(like => [like.comment.toString(), true]));

      // Get reply counts for each comment
      const replyCounts = await Comment.aggregate([
        {
          $match: {
            parentComment: { $in: commentIds }
          }
        },
        {
          $group: {
            _id: '$parentComment',
            replyCount: { $sum: 1 }
          }
        }
      ]);

      console.log('Backend: Reply counts:', replyCounts);

      const replyCountMap = new Map(replyCounts.map(item => [item._id.toString(), item.replyCount]));

      // Add like status and reply count to comments
      const commentsWithLikeStatus = comments.map((comment: any) => {
        // Handle cases where author population failed
        let authorData = comment.author;
        if (!authorData || typeof authorData === 'string') {
          authorData = {
            _id: comment.author || 'unknown',
            username: 'Unknown User',
            firstName: 'Unknown',
            lastName: 'User',
            profileImageUrl: '/placeholder-user.jpg'
          };
        }
        
        return {
          ...comment,
          author: authorData,
          isLiked: likeMap.has(comment._id.toString()),
          replyCount: replyCountMap.get(comment._id.toString()) || 0
        };
      });

      // Get total count for pagination (only top-level comments)
      const totalComments = await Comment.countDocuments({ 
        post: postId,
        parentComment: { $exists: false }
      });

      const response = {
        comments: commentsWithLikeStatus,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalComments / limit),
          totalComments,
          hasNextPage: page * limit < totalComments,
          hasPrevPage: page > 1
        }
      };

      console.log('Backend: Sending response with comments:', commentsWithLikeStatus.length);
      commentsWithLikeStatus.forEach((comment, index) => {
        console.log(`Backend: Response comment ${index + 1}:`, {
          _id: comment._id,
          content: comment.content,
          replyCount: comment.replyCount,
          parentComment: comment.parentComment
        });
      });

      res.json(response);
    } catch (error) {
      console.error('Backend: Error getting comments:', error);
      next(error);
    }
  }
);

// Create a comment
router.post(
  '/:postId/comments',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId;
      const { postId } = req.params;
      const { content } = req.body;

      console.log('Backend: Creating top-level comment for post:', postId, 'by user:', userId, 'content:', content);

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: 'Comment content is required' });
      }

      if (content.length > 1500) {
        return res.status(400).json({ error: 'Comment content cannot exceed 1500 characters' });
      }

      // Check if post exists
      const post = await Post.findById(postId);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Create the comment
      const comment = await Comment.create({
        author: userId,
        post: postId,
        content: content.trim(),
      });

      console.log('Backend: Top-level comment created:', comment._id, 'with parentComment:', comment.parentComment);

      // Update post's comment count to include all comments and replies
      // This function now returns the updated count directly
      const commentCount = await updatePostCommentCount(postId);
      
      console.log(`Backend: Post ${postId} comment count after update: ${commentCount}`);
      
      // Emit comment count update via Socket.IO for real-time updates
      io.emit('commentCountUpdated', {
        postId,
        commentCount: commentCount,
        action: 'incremented'
      });
      console.log('Socket.IO: Emitted comment count update for post:', postId, 'with count:', commentCount);

      // Populate author information
      await comment.populate('author', 'username firstName lastName profileImageUrl');

      // Create notification for post author
      await createAndEmitNotification({
        recipient: post.author.toString(),
        sender: userId,
        type: 'comment',
        post: postId,
        comment: comment._id.toString(),
      });

      // Emit new comment to all users viewing this post via Socket.IO
      const commentWithStatus = {
        ...comment.toObject(),
        isLiked: false,
        replyCount: 0
      };

      io.to(`post_${postId}`).emit('newComment', commentWithStatus);
      console.log('Socket.IO: Emitted new comment to post room:', postId);

      res.status(201).json({ comment });
    } catch (error) {
      console.error('Backend: Comment creation error:', error);
      next(error);
    }
  }
);

// Repost a post
router.post(
  '/:postId/repost',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId;
      const { postId } = req.params;
      const { comment } = req.body;

      console.log('Backend: Repost request for post:', postId, 'by user:', userId, 'comment:', comment);

      // Check if post exists
      const originalPost = await Post.findById(postId);
      if (!originalPost) {
        console.log('Backend: Post not found for repost:', postId);
        return res.status(404).json({ error: 'Post not found' });
      }

      console.log('Backend: Found original post, creating repost...');

      // Create the repost (removed duplicate check to allow unlimited reposting)
      const repost = await Repost.create({
        user: userId,
        originalPost: postId,
        comment: comment?.trim() || undefined,
      });

      console.log('Backend: Repost created:', repost._id);

      // Increment original post's repost count
      await Post.findByIdAndUpdate(postId, { $inc: { repostCount: 1 } });

      console.log('Backend: Original post repost count incremented');

      // Emit repost count update via Socket.IO for real-time updates
      const updatedOriginalPost = await Post.findById(postId);
      io.emit('repostCountUpdated', {
        postId,
        repostCount: updatedOriginalPost?.repostCount || 0,
        action: 'incremented'
      });
      console.log('Socket.IO: Emitted repost count update for post:', postId);

      // Populate user information
      await repost.populate('user', 'username firstName lastName profileImageUrl');

      // Create notification for original post author
      await createAndEmitNotification({
        recipient: originalPost.author.toString(),
        sender: userId,
        type: 'repost',
        post: postId
      });

      // Populate original post information for Socket.IO emission
      await repost.populate({
        path: 'originalPost',
        populate: {
          path: 'author',
          select: 'username firstName lastName profileImageUrl'
        }
      });

      // Emit new repost to all connected users via Socket.IO
      const repostWithStatus = {
        _id: repost._id,
        isRepost: true,
        type: 'repost',
        repostUser: repost.user,
        originalPost: repost.originalPost,
        repostComment: repost.comment,
        repostCreatedAt: repost.createdAt,
        createdAt: repost.createdAt,
        isLiked: false,
        isReposted: false
      };

      io.emit('newRepost', repostWithStatus);
      console.log('Socket.IO: Emitted new repost to all users:', repost._id);

      console.log('Backend: Repost populated with user info, sending response');

      res.status(201).json({ repost });
    } catch (error: any) {
      console.error('Backend: Error in repost:', error);
      
      if (error.name === 'ValidationError') {
        // Validation error
        const validationErrors = Object.values(error.errors).map((err: any) => err.message);
        return res.status(400).json({ error: validationErrors.join(', ') });
      }
      
      next(error);
    }
  }
);

// Update a repost
router.put(
  '/reposts/:repostId',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId;
      const { repostId } = req.params;
      const { comment } = req.body;

      console.log('Backend: Updating repost:', repostId, 'by user:', userId, 'comment:', comment);

      if (comment && comment.length > 1500) {
        return res.status(400).json({ error: 'Repost comment cannot exceed 1500 characters' });
      }

      // Find the repost and check ownership
      const repost = await Repost.findById(repostId);
      if (!repost) {
        console.log('Backend: Repost not found:', repostId);
        return res.status(404).json({ error: 'Repost not found' });
      }

      if (repost.user.toString() !== userId) {
        console.log('Backend: User not authorized to edit repost:', userId, 'repost user:', repost.user);
        return res.status(403).json({ error: 'You can only edit your own reposts' });
      }

      console.log('Backend: Updating repost comment from:', repost.comment, 'to:', comment);

      // Update the repost
      const updatedRepost = await Repost.findByIdAndUpdate(
        repostId,
        { comment: comment?.trim() || undefined },
        { new: true }
      ).populate('user', 'username firstName lastName profileImageUrl');

      console.log('Backend: Repost updated successfully:', updatedRepost._id);

      res.json({ repost: updatedRepost });
    } catch (error) {
      console.error('Backend: Error updating repost:', error);
      next(error);
    }
  }
);

// Delete a repost
router.delete(
  '/reposts/:repostId',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId;
      const { repostId } = req.params;

      console.log('Backend: Deleting repost:', repostId, 'by user:', userId);

      // Find the repost and check ownership
      const repost = await Repost.findById(repostId);
      if (!repost) {
        console.log('Backend: Repost not found:', repostId);
        return res.status(404).json({ error: 'Repost not found' });
      }

      if (repost.user.toString() !== userId) {
        console.log('Backend: User not authorized to delete repost:', userId, 'repost user:', repost.user);
        return res.status(403).json({ error: 'You can only delete your own reposts' });
      }

      console.log('Backend: Deleting repost and decrementing original post count...');

      // Delete the repost
      await Repost.findByIdAndDelete(repostId);

      // Decrement original post's repost count
      await Post.findByIdAndUpdate(repost.originalPost, { $inc: { repostCount: -1 } });

      // Emit repost count update via Socket.IO for real-time updates
      const updatedOriginalPost = await Post.findById(repost.originalPost);
      io.emit('repostCountUpdated', {
        postId: repost.originalPost.toString(),
        repostCount: updatedOriginalPost?.repostCount || 0,
        action: 'decremented'
      });
      console.log('Socket.IO: Emitted repost count update for post:', repost.originalPost);

      // Emit repost deletion to all connected users via Socket.IO
      io.emit('repostDeleted', { repostId });
      console.log('Socket.IO: Emitted repost deletion to all users:', repostId);

      console.log('Backend: Repost deleted successfully');

      res.json({ message: 'Repost deleted successfully' });
    } catch (error) {
      console.error('Backend: Error deleting repost:', error);
      next(error);
    }
  }
);

// Get posts by user ID (with pagination and blocking filter)
router.get(
  '/user/:userId',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUserId = (req as any).userId;
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const pageNum = parseInt(String(page));
      const limitNum = parseInt(String(limit));
      const skip = (pageNum - 1) * limitNum;

      // Check if current user is blocked by the target user or vice versa
      const isBlocked = await Block.findOne({
        $or: [
          { blockerId: userId, blockedId: currentUserId },
          { blockerId: currentUserId, blockedId: userId }
        ]
      });

      if (isBlocked) {
        return res.status(403).json({ 
          error: 'Cannot view posts from this user due to blocking' 
        });
      }

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

      // Get posts by the user
      const posts = await Post.find({ author: userId })
        .sort({ createdAt: -1 })
        .populate({
          path: 'author',
          select: 'username firstName lastName profileImageUrl',
          match: { _id: { $ne: null } }
        })
        .lean();

      // Get reposts by the user
      const reposts = await Repost.find({ user: userId })
        .sort({ createdAt: -1 })
        .populate({
          path: 'user',
          select: 'username firstName lastName profileImageUrl',
          match: { _id: { $ne: null } }
        })
        .populate({
          path: 'originalPost',
          match: { author: { $ne: null } },
          populate: {
            path: 'author',
            select: 'username firstName lastName profileImageUrl',
            match: { _id: { $ne: null } }
          }
        })
        .lean();

      // Filter out posts with null authors after population
      const validPosts = posts.filter(post => post.author && post.author._id);
      const validReposts = reposts.filter(repost => repost.user && repost.user._id);

      // Combine posts and reposts and sort by creation date
      const allContent = [
        ...validPosts.map(post => ({
          ...post,
          isRepost: false,
          type: 'post'
        })),
        ...validReposts.map(repost => {
          const originalPost = repost.originalPost as any;
          
          // Check if the original post was deleted
          const isOriginalPostDeleted = !originalPost;
          const originalAuthor = originalPost?.author;
          
          // Check if the original author is blocked by current user or vice versa
          const isOriginalAuthorBlocked = originalAuthor ? blockedIds.includes(originalAuthor._id) : false;
          const isOriginalAuthorBlocking = originalAuthor ? blockedByIds.includes(originalAuthor._id) : false;
          
          // Build a safe originalPost to prevent spreading null
          const safeOriginalPost = isOriginalPostDeleted ? {
            _id: 'deleted',
            content: 'This post has been deleted',
            author: {
              _id: 'deleted',
              username: 'deleted_user',
              firstName: 'Deleted',
              lastName: 'Post',
              profileImageUrl: '/placeholder-user.jpg'
            },
            createdAt: repost.createdAt,
            likeCount: 0,
            commentCount: 0,
            repostCount: 0
          } : {
            ...originalPost,
            author: isOriginalAuthorBlocked || isOriginalAuthorBlocking ? {
              _id: originalAuthor?._id,
              username: 'blocked_user',
              firstName: 'Blocked',
              lastName: 'User',
              profileImageUrl: '/placeholder-user.jpg'
            } : originalAuthor
          };
          
          return {
            _id: repost._id,
            isRepost: true,
            type: 'repost',
            repostUser: repost.user,
            originalPost: safeOriginalPost,
            repostComment: repost.comment,
            repostCreatedAt: repost.createdAt,
            createdAt: repost.createdAt, // For sorting
            isOriginalAuthorBlocked: isOriginalAuthorBlocked,
            isOriginalAuthorBlocking: isOriginalAuthorBlocking,
            isOriginalPostDeleted: isOriginalPostDeleted
          };
        })
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Apply pagination
      const paginatedContent = allContent.slice(skip, skip + limitNum);

      console.log('Backend: Pagination details:', {
        totalContent: allContent.length,
        page: pageNum,
        limit: limitNum,
        skip,
        paginatedContentLength: paginatedContent.length,
        hasNextPage: (pageNum * limitNum) < allContent.length
      });

      // Get like status for current user (for original posts)
      const originalPostIds = posts.map((p: any) => p._id);
      const userLikes = await Like.find({ 
        user: currentUserId, 
        post: { $in: originalPostIds } 
      }).lean();
      
      const likeMap = new Set(userLikes.map((like: any) => like.post.toString()));

      // Note: Removed repost status check since we now allow unlimited reposting
      // Users can repost the same content multiple times

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

      console.log('Backend: Sending posts response:', {
        postsCount: contentWithStatus.length,
        pagination: response.pagination,
        totalPosts: allContent.length
      });

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/users/:userId/likes',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const clerkUser = (req as any).user;
    const currentUserId = userId;
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 24;
    const skip = (page - 1) * limit;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const isBlocked = await Block.findOne({
      $or: [
        { blockerId: userId, blockedId: currentUserId },
        { blockerId: currentUserId, blockedId: userId },
      ],
    });

    if (isBlocked) {
      return res.status(403).json({
        error: 'Cannot view liked posts from this user due to blocking',
      });
    }

    const blockedUsers = await Block.find({ blockerId: currentUserId })
      .select('blockedId')
      .lean();
    const blockedIds = blockedUsers.map((b: any) => b.blockedId);

    const blockedByUsers = await Block.find({ blockedId: currentUserId })
      .select('blockerId')
      .lean();
    const blockedByIds = blockedByUsers.map((b: any) => b.blockerId);

    const likes = await Like.find({
      user: userId,
      post: { $exists: true, $ne: null },
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'post',
        match: { author: { $ne: null } },
        populate: {
          path: 'author',
          select: 'username firstName lastName profileImageUrl',
          match: { _id: { $ne: null } },
        },
      })
      .lean();

    const filteredLikes = likes.filter(like => {
      const post = like.post as any;
      if (!post || !post.author || !post.media || !post.media.length) {
        return false;
      }
      const authorId = post.author?._id?.toString?.() ?? post.author?._id;
      if (!authorId) {
        return false;
      }
      return (
        !blockedIds.some((id: any) => id?.toString?.() === authorId) &&
        !blockedByIds.some((id: any) => id?.toString?.() === authorId)
      );
    });

    res.json({
      likes: filteredLikes,
      pagination: {
        page,
        limit,
        hasNextPage: likes.length === limit,
      },
    });
  })
);

router.get(
  '/users/:userId/reposts',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const clerkUser = (req as any).user;
    const currentUserId = userId;
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 24;
    const skip = (page - 1) * limit;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const isBlocked = await Block.findOne({
      $or: [
        { blockerId: userId, blockedId: currentUserId },
        { blockerId: currentUserId, blockedId: userId },
      ],
    });

    if (isBlocked) {
      return res.status(403).json({
        error: 'Cannot view reposts from this user due to blocking',
      });
    }

    const blockedUsers = await Block.find({ blockerId: currentUserId })
      .select('blockedId')
      .lean();
    const blockedIds = blockedUsers.map((b: any) => b.blockedId);

    const blockedByUsers = await Block.find({ blockedId: currentUserId })
      .select('blockerId')
      .lean();
    const blockedByIds = blockedByUsers.map((b: any) => b.blockerId);

    const reposts = await Repost.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'originalPost',
        match: { author: { $ne: null } },
        populate: {
          path: 'author',
          select: 'username firstName lastName profileImageUrl',
          match: { _id: { $ne: null } },
        },
      })
      .lean();

    const filteredReposts = reposts.filter(repost => {
      const post = repost.originalPost as any;
      if (!post || !post.author || !post.media || !post.media.length) {
        return false;
      }
      const authorId = post.author?._id?.toString?.() ?? post.author?._id;
      if (!authorId) {
        return false;
      }
      return (
        !blockedIds.some((id: any) => id?.toString?.() === authorId) &&
        !blockedByIds.some((id: any) => id?.toString?.() === authorId)
      );
    });

    res.json({
      reposts: filteredReposts,
      pagination: {
        page,
        limit,
        hasNextPage: reposts.length === limit,
      },
    });
  })
);

// Helper function to get human-readable time ago
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d`;
  } else if (diffInSeconds < 31536000) {
    const months = Math.floor(diffInSeconds / 2592000);
    return `${months}mo`;
  } else {
    const years = Math.floor(diffInSeconds / 31536000);
    return `${years}y`;
  }
}

export default router; 