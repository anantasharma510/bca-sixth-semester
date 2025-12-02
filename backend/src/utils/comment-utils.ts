import { Comment } from '../models/comment.model';

/**
 * Calculate total comment count for a post (including replies)
 * @param postId - The post ID
 * @returns Promise<number> - Total comment count
 */
export async function calculateTotalCommentCount(postId: string): Promise<number> {
  try {
    // Count all comments for this post (both top-level and replies)
    const totalCount = await Comment.countDocuments({ post: postId });
    console.log(`Calculated comment count for post ${postId}: ${totalCount} comments`);
    return totalCount;
  } catch (error) {
    console.error('Error calculating total comment count:', error);
    return 0;
  }
}

/**
 * Update post's comment count to reflect total comments (including replies)
 * @param postId - The post ID
 * @returns Promise<number> - The updated comment count
 */
export async function updatePostCommentCount(postId: string): Promise<number> {
  try {
    const totalCount = await calculateTotalCommentCount(postId);
    
    // Update the post's comment count with { new: true } to ensure we get the updated document
    const { Post } = require('../models/post.model');
    const updatedPost = await Post.findByIdAndUpdate(
      postId, 
      { commentCount: totalCount },
      { new: true }
    );
    
    const finalCount = updatedPost?.commentCount ?? totalCount;
    console.log(`Updated post ${postId} comment count to ${finalCount} (calculated: ${totalCount})`);
    return finalCount;
  } catch (error) {
    console.error('Error updating post comment count:', error);
    // Return calculated count even if update fails
    const totalCount = await calculateTotalCommentCount(postId);
    return totalCount;
  }
} 