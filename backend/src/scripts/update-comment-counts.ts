import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Comment } from '../models/comment.model';
import { Post } from '../models/post.model';

dotenv.config();

async function updateCommentCounts() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connected to MongoDB');

    // Get all posts
    const posts = await Post.find({});
    console.log(`Found ${posts.length} posts to update`);

    let updatedCount = 0;

    for (const post of posts) {
      // Count all comments for this post (including replies)
      const totalCommentCount = await Comment.countDocuments({ post: post._id });
      
      // Update the post's comment count
      await Post.findByIdAndUpdate(post._id, { commentCount: totalCommentCount });
      
      console.log(`Updated post ${post._id}: ${post.commentCount} -> ${totalCommentCount} comments`);
      updatedCount++;
    }

    console.log(`Successfully updated ${updatedCount} posts`);
  } catch (error) {
    console.error('Error updating comment counts:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the migration
updateCommentCounts(); 