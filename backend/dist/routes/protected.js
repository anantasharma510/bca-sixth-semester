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
import { requireAuth, requireAdmin } from '../middleware/auth';
import { User } from '../models/user.model';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary';
import { upload } from '../middleware/multer';
import { Post } from '../models/post.model';
import { Comment } from '../models/comment.model';
import { Repost } from '../models/repost.model';
import { Follow } from '../models/follow.model';
import { Block } from '../models/block.model';
import { Message } from '../models/message.model';
import { Conversation } from '../models/conversation.model';
import { LiveStream } from '../models/liveStream.model';
import { StreamChatMessage } from '../models/streamChat.model';
import { Notification } from '../models/notification.model';
import { SupportTicket } from '../models/support.model';
import { Like } from '../models/like.model';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { Maintenance } from '../models/maintenance.model';
import { io } from '../index';
import mongoose from 'mongoose';
import { getTrendingHashtags } from '../utils/post-utils';
const router = Router();
// Fixed asyncHandler to properly handle Express types
function asyncHandler(fn) {
    return function (req, res, next) {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
router.get('/', requireAuth, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // User is already fetched and attached by requireAuth middleware
    const dbUser = req.dbUser;
    const userId = req.userId || dbUser._id;
    if (!dbUser) {
        res.status(500).json({ error: 'User not found' });
        return;
    }
    // Get real-time follow counts and post count
    const { Follow } = yield import('../models/follow.model.js');
    const { Post } = yield import('../models/post.model.js');
    const [followersCount, followingCount, postCount] = yield Promise.all([
        Follow.countDocuments({ followingId: userId }),
        Follow.countDocuments({ followerId: userId }),
        Post.countDocuments({ author: userId })
    ]);
    // Update user object with real-time counts
    const userWithCounts = Object.assign(Object.assign({}, dbUser.toObject()), { followerCount: followersCount, followingCount: followingCount, postCount: postCount });
    res.status(200).json({ message: 'You are authenticated!', user: userWithCounts });
})));
// Admin-only: List all users
router.get('/admin/users', requireAdmin, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Admin check is done in requireAdmin middleware
    const dbUser = req.dbUser;
    const users = yield User.find({}, '_id username email firstName lastName profileImageUrl role status createdAt lastActivityAt followerCount followingCount postCount');
    res.json({ users });
})));
// Admin-only: Update user role
router.patch('/admin/users/:id/role', requireAdmin, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const dbUser = req.dbUser;
    const { id } = req.params;
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
        res.status(400).json({ error: 'Invalid role' });
        return;
    }
    // Prevent self-demotion
    if (id === dbUser._id && role !== 'admin') {
        res.status(400).json({ error: 'Cannot demote yourself' });
        return;
    }
    console.log(`🔄 Updating role for user ${id} from ${dbUser.role} to ${role}`);
    const updated = yield User.findByIdAndUpdate(id, { role }, { new: true });
    if (!updated) {
        res.status(404).json({ error: 'User not found' });
        return;
    }
    console.log(`✅ Database updated successfully for user ${id}`);
    res.json({
        success: true,
        user: updated
    });
})));
// Admin-only: Update user status
router.patch('/admin/users/:id/status', requireAdmin, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const dbUser = req.dbUser;
    const { id } = req.params;
    const { status } = req.body;
    if (!['active', 'suspended'].includes(status)) {
        res.status(400).json({ error: 'Invalid status' });
        return;
    }
    // Prevent self-suspension
    if (id === dbUser._id && status === 'suspended') {
        res.status(400).json({ error: 'Cannot suspend yourself' });
        return;
    }
    // If suspending, demote from admin to user role
    const updateData = { status };
    if (status === 'suspended') {
        updateData.role = 'user';
    }
    const updated = yield User.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) {
        res.status(404).json({ error: 'User not found' });
        return;
    }
    console.log(`User ${id} status updated to ${status}${status === 'suspended' ? ' and demoted to user' : ''}`);
    res.json({ success: true, user: updated });
})));
// Check if current user is suspended (for frontend logout)
router.get('/check-suspension', requireAuth, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const dbUser = req.dbUser;
    if (!dbUser) {
        res.status(404).json({ error: 'User not found' });
        return;
    }
    if (dbUser.status === 'suspended') {
        res.json({ suspended: true, message: 'Account suspended' });
        return;
    }
    res.json({ suspended: false });
})));
// Check suspension status by user ID (for sign-in process)
router.get('/check-suspension/:userId', asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
    }
    const dbUser = yield User.findOne({
        $or: [
            { _id: userId },
            { betterAuthUserId: userId }
        ]
    });
    if (!dbUser) {
        res.json({ suspended: false, userExists: false });
        return;
    }
    if (dbUser.status === 'suspended') {
        res.json({
            suspended: true,
            userExists: true,
            message: 'Account suspended'
        });
        return;
    }
    res.json({ suspended: false, userExists: true });
})));
// Helper function to generate unique username
function generateUniqueUsername(baseUsername) {
    return __awaiter(this, void 0, void 0, function* () {
        let username = baseUsername;
        let counter = 1;
        while (true) {
            try {
                const existingUser = yield User.findOne({ username });
                if (!existingUser) {
                    return username;
                }
                username = `${baseUsername}${counter}`;
                counter++;
            }
            catch (error) {
                console.error('Error checking username uniqueness:', error);
                return `${baseUsername}_${Date.now()}`;
            }
        }
    });
}
// Update user profile
router.put('/profile/update', requireAuth, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const dbUser = req.dbUser;
    const userId = req.userId;
    const { bio, website, location, profileImageUrl, coverImageUrl, username, firstName, lastName, } = req.body || {};
    // Prepare update data
    const updateData = {
        bio: bio === null || bio === void 0 ? void 0 : bio.trim(),
        website: website === null || website === void 0 ? void 0 : website.trim(),
        location: location === null || location === void 0 ? void 0 : location.trim(),
        profileImageUrl: profileImageUrl === null || profileImageUrl === void 0 ? void 0 : profileImageUrl.trim(),
        coverImageUrl: coverImageUrl === null || coverImageUrl === void 0 ? void 0 : coverImageUrl.trim(),
    };
    // Add fields if provided
    if (username)
        updateData.username = username.trim();
    if (firstName !== undefined) {
        updateData.firstName = typeof firstName === 'string' ? firstName.trim() : '';
    }
    if (lastName !== undefined) {
        updateData.lastName = typeof lastName === 'string' ? lastName.trim() : '';
    }
    // Remove undefined fields to avoid overwriting existing data
    Object.keys(updateData).forEach((key) => {
        if (typeof updateData[key] === 'undefined') {
            delete updateData[key];
        }
    });
    if (!Object.keys(updateData).length) {
        // Nothing to update; return current user data without error
        res.json({ user: dbUser });
        return;
    }
    console.log('🔄 Profile update requested:', {
        userId,
        updateData: Object.keys(updateData),
    });
    // Update user profile in database
    const updatedUser = yield User.findByIdAndUpdate(userId, updateData, { new: true });
    if (!updatedUser) {
        res.status(404).json({ error: 'User not found' });
        return;
    }
    console.log('✅ Profile updated for user:', {
        userId: updatedUser._id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        username: updatedUser.username,
    });
    // Emit profile update event if images were updated (for other devices)
    if (updateData.profileImageUrl || updateData.coverImageUrl) {
        io.emit('profileImageUpdated', {
            userId: updatedUser._id,
            type: updateData.profileImageUrl ? 'profile' : 'cover',
            imageUrl: updateData.profileImageUrl || updateData.coverImageUrl,
            updatedAt: new Date().toISOString()
        });
        console.log(`📡 Emitted profileImageUpdated event for user ${updatedUser._id}`);
    }
    // Emit userProfileUpdated event for full profile updates (for real-time sync across devices)
    // Send to user's personal room and broadcast for other devices
    io.to(`user_${updatedUser._id}`).emit('userProfileUpdated', updatedUser);
    io.emit('userProfileUpdated', updatedUser);
    console.log(`📡 Emitted userProfileUpdated event for user ${updatedUser._id}`);
    // If follower/following counts might have changed (unlikely from profile update, but include for completeness)
    // Note: This is mainly for consistency, follower counts typically change from follow/unfollow actions
    const { Follow } = yield import('../models/follow.model');
    const [followerCount, followingCount] = yield Promise.all([
        Follow.countDocuments({ followingId: updatedUser._id }),
        Follow.countDocuments({ followerId: updatedUser._id })
    ]);
    // Only emit if counts are different from what's in the updated user object
    if (updatedUser.followerCount !== followerCount || updatedUser.followingCount !== followingCount) {
        io.to(`user_${updatedUser._id}`).emit('followerCountUpdated', {
            userId: updatedUser._id,
            followerCount,
            followingCount
        });
        console.log(`📡 Emitted followerCountUpdated event for user ${updatedUser._id}`);
    }
    res.json({ user: updatedUser });
})));
// Test endpoint for debugging uploads
router.post('/test-upload', requireAuth, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const dbUser = req.dbUser;
    const userId = req.userId;
    console.log('🧪 Testing upload functionality...');
    console.log('🔑 Cloudinary config check:', {
        cloudName: !!process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: !!process.env.CLOUDINARY_API_KEY,
        apiSecret: !!process.env.CLOUDINARY_API_SECRET
    });
    console.log('👤 User info:', {
        userId: userId,
        userExists: !!dbUser
    });
    res.json({
        message: 'Test endpoint working',
        userId: userId,
        cloudinaryConfigured: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
    });
})));
// Upload profile or cover image
router.post('/profile/upload-image', requireAuth, upload.single('image'), asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const dbUser = req.dbUser;
    const userId = req.userId;
    const { type } = req.body; // 'profile' or 'cover'
    console.log('🔄 Profile image upload request received:', {
        userId: userId,
        type,
        hasFile: !!req.file,
        fileSize: (_a = req.file) === null || _a === void 0 ? void 0 : _a.size,
        originalName: (_b = req.file) === null || _b === void 0 ? void 0 : _b.originalname,
        mimetype: (_c = req.file) === null || _c === void 0 ? void 0 : _c.mimetype
    });
    if (!req.file) {
        console.error('❌ No image file provided in request');
        res.status(400).json({ error: 'No image file provided' });
        return;
    }
    if (!['profile', 'cover'].includes(type)) {
        console.error('❌ Invalid image type:', type);
        res.status(400).json({ error: 'Invalid image type. Must be "profile" or "cover"' });
        return;
    }
    try {
        console.log('☁️ Starting Cloudinary upload...');
        // Upload to Cloudinary
        const result = yield uploadToCloudinary(req.file.buffer, `profiles/${type}`);
        const imageUrl = result.secure_url;
        console.log('✅ Cloudinary upload successful:', imageUrl);
        // Update user's profile or cover image URL in database
        const updateField = type === 'profile' ? 'profileImageUrl' : 'coverImageUrl';
        console.log(`💾 Updating database field ${updateField} for user ${userId}...`);
        const updatedUser = yield User.findByIdAndUpdate(userId, { [updateField]: imageUrl }, { new: true });
        if (!updatedUser) {
            console.error('❌ User not found in database:', userId);
            res.status(404).json({ error: 'User not found' });
            return;
        }
        console.log('✅ Database updated successfully:', {
            userId: userId,
            field: updateField,
            newValue: imageUrl,
            updatedUser: {
                profileImageUrl: updatedUser.profileImageUrl,
                coverImageUrl: updatedUser.coverImageUrl
            }
        });
        // Emit profile image update event for other devices (delayed updates are OK)
        if (io) {
            io.emit('profileImageUpdated', {
                userId: userId,
                type: type,
                imageUrl: imageUrl,
                updatedAt: new Date().toISOString()
            });
            console.log(`📡 Emitted profileImageUpdated event for user ${userId}, type: ${type}`);
        }
        else {
            console.warn('⚠️ Socket.IO not available, cannot emit profileImageUpdated event');
        }
        console.log('✅ Upload process completed successfully');
        res.json({
            imageUrl
        });
    }
    catch (error) {
        console.error('❌ Error in upload process:', error);
        console.error('❌ Error stack:', error.stack);
        res.status(500).json({ error: 'Failed to upload image' });
    }
})));
// User search endpoint (MUST be before /users/:id)
router.get('/users/search', requireAuth, asyncHandler((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const q = (req.query.q || '').trim();
    const userId = req.userId;
    const currentUserId = userId;
    if (!q) {
        res.json({ users: [] });
        return;
    }
    const words = q.split(/\s+/).filter(Boolean);
    const orConditions = words.flatMap(word => [
        { username: new RegExp(word, 'i') },
        { firstName: new RegExp(word, 'i') },
        { lastName: new RegExp(word, 'i') }
    ]);
    // Get blocked users to exclude from search
    const blockedUsers = yield Block.find({ blockerId: currentUserId }).select('blockedId').lean();
    const blockedIds = blockedUsers.map((b) => b.blockedId);
    // Get users who blocked current user
    const blockedByUsers = yield Block.find({ blockedId: currentUserId }).select('blockerId').lean();
    const blockedByIds = blockedByUsers.map((b) => b.blockerId);
    const users = yield User.find({
        status: 'active',
        _id: { $nin: [...blockedIds, ...blockedByIds] },
        $or: orConditions
    })
        .select('_id username firstName lastName profileImageUrl bio')
        .limit(20)
        .lean();
    res.json({ users });
})));
// Get user by ID (for viewing other users' profiles)
router.get('/users/:userId', requireAuth, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    const currentUserId = req.userId;
    // Check if user exists
    const user = yield User.findById(userId).select('-email');
    if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
    }
    // Check if user is suspended
    if (user.status === 'suspended') {
        res.status(404).json({ error: 'User not found' });
        return;
    }
    // Check if either user has blocked the other
    const Block = (yield import('../models/block.model.js')).Block;
    const isBlocked = yield Block.findOne({
        $or: [
            { blockerId: currentUserId, blockedId: userId },
            { blockerId: userId, blockedId: currentUserId }
        ]
    });
    if (isBlocked) {
        res.status(404).json({ error: 'User not found' });
        return;
    }
    // Get follow counts
    const { Follow } = yield import('../models/follow.model.js');
    const [followersCount, followingCount] = yield Promise.all([
        Follow.countDocuments({ followingId: userId }),
        Follow.countDocuments({ followerId: userId })
    ]);
    // Get post count
    const { Post } = yield import('../models/post.model.js');
    const postCount = yield Post.countDocuments({ author: userId });
    // Add counts to user object
    const userWithCounts = Object.assign(Object.assign({}, user.toObject()), { followerCount: followersCount, followingCount: followingCount, postCount: postCount });
    res.json(userWithCounts);
})));
// Admin-only: Analytics dashboard
router.get('/admin/analytics', requireAdmin, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const dbUser = req.dbUser;
    // Get counts
    const [userCount, postCount, commentCount] = yield Promise.all([
        User.countDocuments(),
        Post.countDocuments(),
        Comment.countDocuments(),
    ]);
    // Trending hashtags (last 7 days, top 5)
    const trendingHashtags = yield getTrendingHashtags({ days: 7, limit: 5 });
    // Recent signups (last 7 days)
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentSignups = yield User.find({ createdAt: { $gte: since } })
        .select('_id username createdAt')
        .sort({ createdAt: -1 })
        .lean();
    res.json({
        userCount,
        postCount,
        commentCount,
        trendingHashtags,
        recentSignups,
    });
})));
// Admin-only: List/search posts (enhanced)
router.get('/admin/posts', requireAdmin, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const dbUser = req.dbUser;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = (req.query.search || '').trim();
    const author = (req.query.author || '').trim();
    const authorUsername = (req.query.authorUsername || '').trim();
    const from = req.query.from ? new Date(req.query.from) : undefined;
    const to = req.query.to ? new Date(req.query.to) : undefined;
    const hasMedia = req.query.hasMedia === 'true';
    const hashtag = (req.query.hashtag || '').trim();
    const query = {};
    if (search) {
        query.content = { $regex: search, $options: 'i' };
    }
    if (author) {
        query.author = author;
    }
    if (authorUsername) {
        const user = yield User.findOne({ username: authorUsername });
        if (user)
            query.author = user._id;
        else
            query.author = '__none__'; // will return empty
    }
    if (from || to) {
        query.createdAt = {};
        if (from)
            query.createdAt.$gte = from;
        if (to)
            query.createdAt.$lte = to;
    }
    if (hasMedia) {
        query.media = { $exists: true, $not: { $size: 0 } };
    }
    if (hashtag) {
        query.hashtags = hashtag.toLowerCase();
    }
    const total = yield Post.countDocuments(query);
    const posts = yield Post.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('author', 'username firstName lastName profileImageUrl')
        .lean();
    res.json({
        posts,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    });
})));
// Admin-only: Bulk delete posts
router.delete('/admin/posts', requireAdmin, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const dbUser = req.dbUser;
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({ error: 'No post IDs provided' });
        return;
    }
    // Find all posts to get their media before deletion
    const posts = yield Post.find({ _id: { $in: ids } });
    // Delete media files from Cloudinary
    const allMedia = posts.flatMap(post => post.media || []);
    const deletePromises = allMedia.map((mediaItem) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            // Extract public ID from Cloudinary URL
            const url = mediaItem.url;
            const urlParts = url.split('/');
            const uploadIndex = urlParts.findIndex(part => part === 'upload');
            if (uploadIndex !== -1 && uploadIndex + 2 < urlParts.length) {
                const folderAndFile = urlParts.slice(uploadIndex + 2).join('/');
                const publicId = folderAndFile.split('.')[0]; // Remove file extension
                // Delete from Cloudinary
                yield deleteFromCloudinary(publicId, mediaItem.type);
                console.log(`Admin bulk deleted ${mediaItem.type} from Cloudinary: ${publicId}`);
            }
            else {
                console.error(`Invalid Cloudinary URL format: ${url}`);
            }
        }
        catch (error) {
            console.error(`Error deleting ${mediaItem.type} from Cloudinary:`, error);
            // Continue with deletion even if Cloudinary cleanup fails
        }
    }));
    yield Promise.all(deletePromises);
    const result = yield Post.deleteMany({ _id: { $in: ids } });
    res.json({ success: true, deletedCount: result.deletedCount });
})));
// Admin-only: Delete post by ID (single)
router.delete('/admin/posts/:id', requireAuth, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const clerkUser = req.user;
    const dbUser = yield User.findById(clerkUser.sub);
    if (!dbUser || dbUser.role !== 'admin') {
        res.status(403).json({ error: 'Admins only' });
        return;
    }
    const { id } = req.params;
    const post = yield Post.findById(id);
    if (!post) {
        res.status(404).json({ error: 'Post not found' });
        return;
    }
    // Delete media files from Cloudinary
    if (post.media && post.media.length > 0) {
        const deletePromises = post.media.map((mediaItem) => __awaiter(void 0, void 0, void 0, function* () {
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
                    yield deleteFromCloudinary(publicId, mediaItem.type);
                    console.log(`Admin deleted ${mediaItem.type} from Cloudinary: ${publicId}`);
                }
                else {
                    console.error(`Invalid Cloudinary URL format: ${url}`);
                }
            }
            catch (error) {
                console.error(`Error deleting ${mediaItem.type} from Cloudinary:`, error);
                // Continue with deletion even if Cloudinary cleanup fails
            }
        }));
        yield Promise.all(deletePromises);
    }
    // Delete the post
    yield Post.findByIdAndDelete(id);
    res.json({ success: true, message: 'Post deleted' });
})));
// Admin-only: List/search reposts
router.get('/admin/reposts', requireAdmin, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const dbUser = req.dbUser;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = (req.query.search || '').trim();
    const user = (req.query.user || '').trim();
    const originalPost = (req.query.originalPost || '').trim();
    const from = req.query.from ? new Date(req.query.from) : undefined;
    const to = req.query.to ? new Date(req.query.to) : undefined;
    const query = {};
    if (search) {
        query.comment = { $regex: search, $options: 'i' };
    }
    if (user) {
        query.user = user;
    }
    if (originalPost) {
        query.originalPost = originalPost;
    }
    if (from || to) {
        query.createdAt = {};
        if (from)
            query.createdAt.$gte = from;
        if (to)
            query.createdAt.$lte = to;
    }
    const total = yield Repost.countDocuments(query);
    const reposts = yield Repost.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('user', 'username firstName lastName profileImageUrl')
        .populate('originalPost', 'content author')
        .lean();
    res.json({
        reposts,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    });
})));
// Admin-only: Delete repost by ID
router.delete('/admin/reposts/:id', requireAuth, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const clerkUser = req.user;
    const dbUser = yield User.findById(clerkUser.sub);
    if (!dbUser || dbUser.role !== 'admin') {
        res.status(403).json({ error: 'Admins only' });
        return;
    }
    const { id } = req.params;
    const repost = yield Repost.findByIdAndDelete(id);
    if (!repost) {
        res.status(404).json({ error: 'Repost not found' });
        return;
    }
    res.json({ success: true, message: 'Repost deleted' });
})));
// Admin-only: Trigger database backup
router.post('/admin/backup', requireAdmin, (req, res) => {
    try {
        const backupDir = path.join(__dirname, '../../backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(backupDir, `backup-${timestamp}`);
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            res.status(500).json({ error: 'MONGODB_URI not set' });
            return;
        }
        exec(`mongodump --uri="${mongoUri}" --out="${backupPath}"`, (error, stdout, stderr) => {
            if (error) {
                console.error('Backup error:', error);
                res.status(500).json({ error: 'Backup failed', details: stderr });
                return;
            }
            res.json({ success: true, message: 'Backup completed', backupPath });
        });
    }
    catch (err) {
        res.status(500).json({ error: 'Unexpected error' });
    }
});
// Admin-only: Download system logs
router.get('/admin/logs', requireAdmin, (req, res) => {
    try {
        const logFile = path.join(__dirname, '../../logs/app.log');
        if (!fs.existsSync(logFile)) {
            res.status(404).json({ error: 'Log file not found' });
            return;
        }
        res.download(logFile, 'app.log');
    }
    catch (err) {
        res.status(500).json({ error: 'Unexpected error' });
    }
});
// Public: Get maintenance status
router.get('/maintenance', (req, res) => {
    try {
        Maintenance.findOne().sort({ updatedAt: -1 }).then(doc => {
            res.json({ enabled: (doc === null || doc === void 0 ? void 0 : doc.enabled) || false, message: (doc === null || doc === void 0 ? void 0 : doc.message) || '', data: (doc === null || doc === void 0 ? void 0 : doc.data) || {} });
        }).catch(() => {
            res.json({ enabled: false, message: '', data: {} });
        });
    }
    catch (err) {
        res.json({ enabled: false, message: '', data: {} });
    }
});
// Admin: Set maintenance mode
router.post('/admin/maintenance', requireAdmin, (req, res) => {
    try {
        const { enabled, message, data } = req.body;
        Maintenance.findOne().then(doc => {
            if (!doc) {
                doc = new Maintenance({ enabled, message, data });
            }
            else {
                doc.enabled = enabled;
                if (message !== undefined)
                    doc.message = message;
                if (data !== undefined)
                    doc.data = data;
            }
            return doc.save();
        }).then(doc => {
            // Emit maintenance update to all connected clients
            const maintenanceData = {
                enabled: doc.enabled,
                message: doc.message || 'The website is under maintenance.',
                data: doc.data || {},
                updatedAt: doc.updatedAt,
                updatedBy: req.user.sub
            };
            console.log(`🔧 Emitting maintenance update: ${enabled ? 'ENABLED' : 'DISABLED'}`);
            io.emit('maintenance:update', maintenanceData);
            res.json({ success: true, maintenance: doc });
        }).catch(() => {
            res.status(500).json({ error: 'Failed to set maintenance mode' });
        });
    }
    catch (err) {
        res.status(500).json({ error: 'Unexpected error' });
    }
});
// ==================== ADMIN SUPPORT ROUTES ====================
// Get all support tickets (admin only)
router.get('/admin/support/tickets', requireAdmin, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status;
    const priority = req.query.priority;
    const category = req.query.category;
    const search = req.query.search;
    // Build query
    const query = {};
    if (status)
        query.status = status;
    if (priority)
        query.priority = priority;
    if (category)
        query.category = category;
    if (search) {
        query.$or = [
            { subject: { $regex: search, $options: 'i' } },
            { message: { $regex: search, $options: 'i' } },
        ];
    }
    const [tickets, total] = yield Promise.all([
        SupportTicket.find(query)
            .sort({ priority: -1, createdAt: -1 }) // Urgent first, then by date
            .skip(skip)
            .limit(limit)
            .populate('userId', 'username email firstName lastName profileImageUrl')
            .populate('resolvedBy', 'username email firstName lastName')
            .lean(),
        SupportTicket.countDocuments(query),
    ]);
    // Get statistics
    const stats = yield Promise.all([
        SupportTicket.countDocuments({ status: 'open' }),
        SupportTicket.countDocuments({ status: 'in_progress' }),
        SupportTicket.countDocuments({ status: 'resolved' }),
        SupportTicket.countDocuments({ priority: 'urgent' }),
    ]);
    res.json({
        tickets,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalTickets: total,
            limit,
        },
        stats: {
            open: stats[0],
            inProgress: stats[1],
            resolved: stats[2],
            urgent: stats[3],
        },
    });
})));
// Get a specific support ticket (admin only)
router.get('/admin/support/tickets/:ticketId', requireAdmin, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { ticketId } = req.params;
    const ticket = yield SupportTicket.findById(ticketId)
        .populate('userId', 'username email firstName lastName profileImageUrl')
        .populate('resolvedBy', 'username email firstName lastName')
        .lean();
    if (!ticket) {
        res.status(404).json({ error: 'Support ticket not found' });
        return;
    }
    res.json({ ticket });
})));
// Update a support ticket (admin only)
router.put('/admin/support/tickets/:ticketId', requireAdmin, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const clerkUser = req.user;
    const { ticketId } = req.params;
    const { status, priority, adminNotes, category } = req.body;
    const ticket = yield SupportTicket.findById(ticketId);
    if (!ticket) {
        res.status(404).json({ error: 'Support ticket not found' });
        return;
    }
    // Build updates
    const updates = {};
    if (status) {
        const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
        if (!validStatuses.includes(status)) {
            res.status(400).json({ error: 'Invalid status' });
            return;
        }
        updates.status = status;
        // If resolving or closing, set resolvedAt and resolvedBy
        if ((status === 'resolved' || status === 'closed') && !ticket.resolvedAt) {
            updates.resolvedAt = new Date();
            updates.resolvedBy = req.userId;
        }
    }
    if (priority) {
        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        if (!validPriorities.includes(priority)) {
            res.status(400).json({ error: 'Invalid priority' });
            return;
        }
        updates.priority = priority;
    }
    if (category) {
        const validCategories = ['bug', 'feature', 'account', 'billing', 'other'];
        if (!validCategories.includes(category)) {
            res.status(400).json({ error: 'Invalid category' });
            return;
        }
        updates.category = category;
    }
    if (adminNotes !== undefined) {
        if (adminNotes.length > 2000) {
            res.status(400).json({ error: 'Admin notes cannot exceed 2000 characters' });
            return;
        }
        updates.adminNotes = adminNotes;
    }
    const updatedTicket = yield SupportTicket.findByIdAndUpdate(ticketId, updates, { new: true })
        .populate('userId', 'username email firstName lastName profileImageUrl')
        .populate('resolvedBy', 'username email firstName lastName')
        .lean();
    console.log(`✅ Admin ${req.userId} updated support ticket ${ticketId}`);
    res.json({
        ticket: updatedTicket,
        message: 'Ticket updated successfully'
    });
})));
// Delete a support ticket (admin only)
router.delete('/admin/support/tickets/:ticketId', requireAdmin, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const clerkUser = req.user;
    const { ticketId } = req.params;
    const ticket = yield SupportTicket.findByIdAndDelete(ticketId);
    if (!ticket) {
        res.status(404).json({ error: 'Support ticket not found' });
        return;
    }
    console.log(`✅ Admin ${clerkUser.sub} deleted support ticket ${ticketId}`);
    res.json({ message: 'Ticket deleted successfully' });
})));
// ==================== ACCOUNT DELETION ====================
// Delete user account and all associated data
router.delete('/account', requireAuth, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const dbUser = req.dbUser;
    const userId = req.userId;
    console.log(`🗑️ Starting account deletion for user: ${userId}`);
    try {
        // Prevent admin account deletion
        if (!dbUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (dbUser.role === 'admin') {
            return res.status(403).json({ error: 'Admin accounts cannot be deleted' });
        }
        // Start MongoDB transaction for data consistency
        const session = yield mongoose.startSession();
        try {
            yield session.withTransaction(() => __awaiter(void 0, void 0, void 0, function* () {
                console.log(`🧹 Cleaning up data for user: ${userId}`);
                // 1. Get all user's posts to delete media files
                const userPosts = yield Post.find({ author: userId }).session(session);
                // Delete media files from Cloudinary
                for (const post of userPosts) {
                    if (post.media && post.media.length > 0) {
                        const deletePromises = post.media.map((mediaItem) => __awaiter(void 0, void 0, void 0, function* () {
                            try {
                                const url = mediaItem.url;
                                if (!url || typeof url !== 'string') {
                                    console.warn(`⚠️ Invalid media URL for post ${post._id}:`, url);
                                    return;
                                }
                                // Extract public ID from Cloudinary URL with better error handling
                                const urlParts = url.split('/');
                                const uploadIndex = urlParts.findIndex(part => part === 'upload');
                                if (uploadIndex !== -1 && uploadIndex + 2 < urlParts.length) {
                                    const folderAndFile = urlParts.slice(uploadIndex + 2).join('/');
                                    const publicId = folderAndFile.split('.')[0];
                                    if (publicId && publicId.length > 0) {
                                        yield deleteFromCloudinary(publicId, mediaItem.type);
                                        console.log(`🗑️ Deleted ${mediaItem.type} from Cloudinary: ${publicId}`);
                                    }
                                    else {
                                        console.warn(`⚠️ Could not extract valid public ID from URL: ${url}`);
                                    }
                                }
                                else {
                                    console.warn(`⚠️ Invalid Cloudinary URL format: ${url}`);
                                }
                            }
                            catch (error) {
                                console.error(`❌ Error deleting ${mediaItem.type} from Cloudinary:`, error);
                            }
                        }));
                        yield Promise.all(deletePromises);
                    }
                }
                // 2. Delete all user-related data in parallel
                yield Promise.all([
                    // Posts and related data
                    Post.deleteMany({ author: userId }).session(session),
                    Comment.deleteMany({ author: userId }).session(session),
                    Like.deleteMany({ userId: userId }).session(session),
                    Repost.deleteMany({ userId: userId }).session(session),
                    // Social interactions
                    Follow.deleteMany({ $or: [{ followerId: userId }, { followingId: userId }] }).session(session),
                    Block.deleteMany({ $or: [{ blockerId: userId }, { blockedId: userId }] }).session(session),
                    // Messaging
                    Message.deleteMany({ senderId: userId }).session(session),
                    // Remove user from conversations and delete empty conversations
                    Conversation.deleteMany({ participants: userId }).session(session),
                    Conversation.updateMany({ participants: userId }, { $pull: { participants: userId } }).session(session),
                    // Live streaming
                    LiveStream.deleteMany({ hostId: userId }).session(session),
                    StreamChatMessage.deleteMany({ userId: userId }).session(session),
                    // Notifications and support
                    Notification.deleteMany({ userId: userId }).session(session),
                    SupportTicket.deleteMany({ $or: [{ userId: userId }, { resolvedBy: userId }] }).session(session),
                ]);
                // 3. Delete the user record last
                yield User.findByIdAndDelete(userId).session(session);
                console.log(`✅ Successfully deleted account and all data for user: ${userId}`);
            }));
            res.json({
                success: true,
                message: 'Account deleted successfully. You will be signed out automatically.'
            });
        }
        finally {
            yield session.endSession();
        }
    }
    catch (error) {
        console.error(`❌ Error during account deletion for user ${userId}:`, error);
        res.status(500).json({
            error: 'Failed to delete account. Please try again or contact support.'
        });
    }
})));
export default router;
