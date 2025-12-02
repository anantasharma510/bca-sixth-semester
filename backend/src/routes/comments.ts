// @ts-nocheck
import { Request, Response, NextFunction, Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { Comment } from '../models/comment.model';
import { Like } from '../models/like.model';
import { Notification } from '../models/notification.model';
import { updatePostCommentCount } from '../utils/comment-utils';
import { io } from '../index';
import { createAndEmitNotification } from '../utils/notification-utils';
import { Post } from '../models/post.model';

const router = Router();

// Update a comment
router.put(
  '/:commentId',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId;
      const { commentId } = req.params;
      const { content } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: 'Comment content is required' });
      }

      if (content.length > 280) {
        return res.status(400).json({ error: 'Comment content cannot exceed 280 characters' });
      }

      // Find the comment and check ownership
      const comment = await Comment.findById(commentId);
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      if (comment.author.toString() !== userId) {
        return res.status(403).json({ error: 'You can only edit your own comments' });
      }

      // Update the comment
      const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        { content: content.trim() },
        { new: true }
      ).populate('author', 'username firstName lastName profileImageUrl');

      // Emit comment update event via Socket.IO
      io.to(`post_${comment.post.toString()}`).emit('commentUpdated', {
        commentId,
        content: content.trim(),
        updatedAt: updatedComment.updatedAt
      });
      console.log('Socket.IO: Emitted comment update to post room:', comment.post.toString());

      res.json({ comment: updatedComment });
    } catch (error) {
      next(error);
    }
  }
);

// Delete a comment
router.delete(
  '/:commentId',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId;
      const { commentId } = req.params;

      // Find the comment and check ownership
      const comment = await Comment.findById(commentId);
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      if (comment.author.toString() !== userId) {
        return res.status(403).json({ error: 'You can only delete your own comments' });
      }

      // Delete all replies to this comment first
      await Comment.deleteMany({ parentComment: commentId });

      // Delete associated likes for the comment and its replies
      await Like.deleteMany({ 
        $or: [
          { comment: commentId },
          { comment: { $in: await Comment.find({ parentComment: commentId }).select('_id').lean() } }
        ]
      });

      // Delete the comment
      await Comment.findByIdAndDelete(commentId);

      // Update post's comment count to reflect the deletion
      // This function now returns the updated count directly
      const postId = comment.post.toString();
      const commentCount = await updatePostCommentCount(postId);
      
      console.log(`Backend: Post ${postId} comment count after deletion: ${commentCount}`);
      
      // Emit comment count update via Socket.IO for real-time updates
      io.emit('commentCountUpdated', {
        postId: postId,
        commentCount: commentCount,
        action: 'decremented'
      });
      console.log('Socket.IO: Emitted comment count update for post:', postId, 'with count:', commentCount);

      // Emit comment deletion event via Socket.IO
      io.to(`post_${comment.post.toString()}`).emit('commentDeleted', {
        commentId,
        postId: comment.post.toString()
      });
      console.log('Socket.IO: Emitted comment deletion to post room:', comment.post.toString());

      res.json({ message: 'Comment deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// Like/Unlike a comment
router.post(
  '/:commentId/like',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId;
      const { commentId } = req.params;

      const comment = await Comment.findById(commentId);
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      const existingLike = await Like.findOne({
        user: userId,
        comment: commentId
      });

      if (existingLike) {
        // Unlike
        await Like.findByIdAndDelete(existingLike._id);
        const updatedComment = await Comment.findByIdAndUpdate(
          commentId, 
          { $inc: { likeCount: -1 } },
          { new: true }
        );
        
        // Emit unlike event via Socket.IO
        io.to(`post_${comment.post.toString()}`).emit('commentLiked', {
          commentId,
          liked: false,
          likeCount: updatedComment?.likeCount || 0
        });
        
        res.json({ liked: false, likeCount: updatedComment?.likeCount || 0 });
      } else {
        // Like
        // First, ensure no conflicting likes exist for this user
        await Like.deleteMany({
          user: userId,
          $or: [
            { comment: commentId },
            { post: { $exists: false } }
          ]
        });
        
        // Create the new like
        const newLike = await Like.create({
          user: userId,
          comment: commentId
        });
        
        const updatedComment = await Comment.findByIdAndUpdate(
          commentId, 
          { $inc: { likeCount: 1 } },
          { new: true }
        );
        
        // Emit like event via Socket.IO
        io.to(`post_${comment.post.toString()}`).emit('commentLiked', {
          commentId,
          liked: true,
          likeCount: updatedComment?.likeCount || 0
        });
        
        res.json({ liked: true, likeCount: updatedComment?.likeCount || 0 });
      }
    } catch (error) {
      console.error('Backend: Error in comment like/unlike:', error);
      
      // Handle duplicate key errors specifically
      if (error.code === 11000) {
        console.log('Backend: Duplicate key error detected in comment like, attempting to fix...');
        
        try {
          // Try to find and remove any conflicting likes
          await Like.deleteMany({
            user: userId,
            comment: commentId
          });
          
          // Try the operation again
          const newLike = await Like.create({
            user: userId,
            comment: commentId
          });
          
          const updatedComment = await Comment.findByIdAndUpdate(
            commentId, 
            { $inc: { likeCount: 1 } },
            { new: true }
          );
          
          console.log('Backend: Fixed duplicate key error in comment like, like added successfully');
          res.json({ liked: true, likeCount: updatedComment?.likeCount || 0 });
          return;
        } catch (retryError) {
          console.error('Backend: Failed to fix duplicate key error in comment like:', retryError);
        }
      }
      
      next(error);
    }
  }
);

// Create a reply to a comment
router.post(
  '/:commentId/replies',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId;
      const { commentId } = req.params;
      const { content } = req.body;

      console.log('Backend: Creating reply to comment:', commentId, 'by user:', userId, 'content:', content);

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: 'Reply content is required' });
      }

      if (content.length > 280) {
        return res.status(400).json({ error: 'Reply content cannot exceed 280 characters' });
      }

      // Find the parent comment
      const parentComment = await Comment.findById(commentId);
      if (!parentComment) {
        console.log('Backend: Parent comment not found:', commentId);
        return res.status(404).json({ error: 'Parent comment not found' });
      }

      console.log('Backend: Found parent comment:', parentComment._id, 'post:', parentComment.post);

      // Create the reply
      const reply = await Comment.create({
        author: userId,
        post: parentComment.post,
        content: content.trim(),
        parentComment: commentId,
      });

      console.log('Backend: Reply created:', reply._id, 'with parentComment:', reply.parentComment);

      // Add the reply to the parent comment's replies array
      await Comment.findByIdAndUpdate(
        commentId,
        { $push: { replies: reply._id } }
      );

      console.log('Backend: Added reply to parent comment replies array');

      // Update post's comment count to include the new reply
      // This function now returns the updated count directly
      const postId = parentComment.post.toString();
      const commentCount = await updatePostCommentCount(postId);
      
      console.log(`Backend: Post ${postId} comment count after reply: ${commentCount}`);
      
      // Emit comment count update via Socket.IO for real-time updates
      io.emit('commentCountUpdated', {
        postId: postId,
        commentCount: commentCount,
        action: 'incremented'
      });
      console.log('Socket.IO: Emitted comment count update for post:', postId, 'with count:', commentCount);

      // Populate author information
      await reply.populate('author', 'username firstName lastName profileImageUrl');

      // Create notification for parent comment author
      await createAndEmitNotification({
        recipient: parentComment.author.toString(),
        sender: userId,
        type: 'comment',
        post: parentComment.post.toString(),
        comment: reply._id.toString(),
      });

      // Emit new reply to all users viewing this post via Socket.IO
      const replyWithStatus = {
        ...reply.toObject(),
        isLiked: false,
        replyCount: 0
      };

      io.to(`post_${parentComment.post.toString()}`).emit('newReply', {
        reply: replyWithStatus,
        parentCommentId: commentId
      });
      console.log('Socket.IO: Emitted new reply to post room:', parentComment.post.toString());

      console.log('Backend: Reply creation completed successfully');

      res.status(201).json({ comment: reply });
    } catch (error) {
      console.error('Backend: Reply creation error:', error);
      next(error);
    }
  }
);

// Get replies for a comment
router.get(
  '/:commentId/replies',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId;
      const { commentId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      // Check if parent comment exists
      const parentComment = await Comment.findById(commentId);
      if (!parentComment) {
        return res.status(404).json({ error: 'Parent comment not found' });
      }

      // Get replies with author info
      const replies = await Comment.find({ parentComment: commentId })
        .populate('author', 'username firstName lastName profileImageUrl')
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .lean();

      // Get like status for current user
      const replyIds = replies.map(reply => reply._id);
      const userLikes = await Like.find({
        user: userId,
        comment: { $in: replyIds }
      }).lean();

      const likeMap = new Map(userLikes.map(like => [like.comment.toString(), true]));

      // Get reply counts for each reply (for nested replies)
      const replyCounts = await Comment.aggregate([
        {
          $match: {
            parentComment: { $in: replyIds }
          }
        },
        {
          $group: {
            _id: '$parentComment',
            replyCount: { $sum: 1 }
          }
        }
      ]);

      const replyCountMap = new Map(replyCounts.map(item => [item._id.toString(), item.replyCount]));

      // Add like status and reply count to replies
      const repliesWithLikeStatus = replies.map((reply: any) => {
        let authorData = reply.author;
        if (!authorData || typeof authorData === 'string') {
          authorData = {
            _id: reply.author || 'unknown',
            username: 'Unknown User',
            firstName: 'Unknown',
            lastName: 'User',
            profileImageUrl: '/placeholder-user.jpg'
          };
        }
        
        return {
          ...reply,
          author: authorData,
          isLiked: likeMap.has(reply._id.toString()),
          replyCount: replyCountMap.get(reply._id.toString()) || 0
        };
      });

      // Get total count for pagination
      const totalReplies = await Comment.countDocuments({ parentComment: commentId });

      const response = {
        replies: repliesWithLikeStatus,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalReplies / limit),
          totalReplies,
          hasNextPage: page * limit < totalReplies,
          hasPrevPage: page > 1
        }
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
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