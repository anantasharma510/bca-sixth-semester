var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Comment } from '../models/comment.model';
import { Post } from '../models/post.model';
dotenv.config();
function updateCommentCounts() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Connect to database
            yield mongoose.connect(process.env.MONGODB_URI);
            console.log('Connected to MongoDB');
            // Get all posts
            const posts = yield Post.find({});
            console.log(`Found ${posts.length} posts to update`);
            let updatedCount = 0;
            for (const post of posts) {
                // Count all comments for this post (including replies)
                const totalCommentCount = yield Comment.countDocuments({ post: post._id });
                // Update the post's comment count
                yield Post.findByIdAndUpdate(post._id, { commentCount: totalCommentCount });
                console.log(`Updated post ${post._id}: ${post.commentCount} -> ${totalCommentCount} comments`);
                updatedCount++;
            }
            console.log(`Successfully updated ${updatedCount} posts`);
        }
        catch (error) {
            console.error('Error updating comment counts:', error);
        }
        finally {
            yield mongoose.disconnect();
            console.log('Disconnected from MongoDB');
        }
    });
}
// Run the migration
updateCommentCounts();
