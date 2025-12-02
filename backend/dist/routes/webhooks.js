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
import express from 'express';
import { User } from '../models/user.model';
import { Webhook } from 'svix';
import { users } from '@clerk/clerk-sdk-node';
const router = express.Router();
// In-memory cache for webhook idempotency (use Redis in production)
const webhookCache = new Map();
const WEBHOOK_CACHE_TTL = 60 * 60 * 1000; // 1 hour
// Clean up old webhook cache entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, timestamp] of webhookCache.entries()) {
        if (now - timestamp > WEBHOOK_CACHE_TTL) {
            webhookCache.delete(key);
        }
    }
}, 5 * 60 * 1000); // Clean every 5 minutes
// Ensure JSON body parsing for this route
router.use(express.json());
// Helper function to sync user role from database to Clerk
function syncUserRoleToClerk(clerkId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const dbUser = yield User.findById(clerkId);
            if (dbUser && dbUser.role) {
                // Update Clerk publicMetadata with the role from database
                yield users.updateUser(clerkId, {
                    publicMetadata: { role: dbUser.role }
                });
                console.log(`✅ Synced role '${dbUser.role}' to Clerk for user: ${clerkId}`);
            }
        }
        catch (error) {
            console.error(`❌ Error syncing role to Clerk for user ${clerkId}:`, error);
        }
    });
}
// Helper function to get raw body for signature verification
const getRawBody = (req) => {
    return Buffer.from(JSON.stringify(req.body), 'utf8');
};
// Clerk webhook handler with signature verification
router.post('/clerk', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('🔐 Webhook received at /api/webhooks/clerk');
    // Set timeout for webhook processing
    const timer = setTimeout(() => {
        console.error('❌ Webhook handler timeout');
        res.status(200).send('timeout');
    }, 4000); // 4 seconds max
    try {
        // Get webhook secret from environment
        const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
        if (!webhookSecret) {
            console.error('❌ CLERK_WEBHOOK_SECRET environment variable not set');
            clearTimeout(timer);
            return res.status(500).json({ error: 'Webhook secret not configured' });
        }
        // Get headers for signature verification
        const svixId = req.headers['svix-id'];
        const svixTimestamp = req.headers['svix-timestamp'];
        const svixSignature = req.headers['svix-signature'];
        // Validate required headers
        if (!svixId || !svixTimestamp || !svixSignature) {
            console.error('❌ Missing required Svix headers:', { svixId, svixTimestamp, svixSignature: svixSignature ? 'present' : 'missing' });
            clearTimeout(timer);
            return res.status(400).json({ error: 'Missing required headers' });
        }
        // Check for duplicate webhook using svix-id for idempotency
        const now = Date.now();
        if (webhookCache.has(svixId)) {
            console.log('ℹ️ Duplicate webhook detected, skipping processing:', svixId);
            clearTimeout(timer);
            return res.status(200).json({ success: true, message: 'Webhook already processed' });
        }
        // Mark webhook as processed
        webhookCache.set(svixId, now);
        // Get raw body for signature verification
        const rawBody = getRawBody(req);
        // Create webhook instance for verification
        const webhook = new Webhook(webhookSecret);
        // Verify webhook signature
        let evt;
        try {
            evt = webhook.verify(rawBody, {
                'svix-id': svixId,
                'svix-timestamp': svixTimestamp,
                'svix-signature': svixSignature,
            });
            console.log('✅ Webhook signature verified successfully');
        }
        catch (err) {
            console.error('❌ Webhook signature verification failed:', err);
            // Remove from cache on verification failure
            webhookCache.delete(svixId);
            clearTimeout(timer);
            return res.status(400).json({ error: 'Invalid signature' });
        }
        // Process the verified webhook event
        const event = evt;
        console.log('📨 Processing webhook event type:', event.type);
        if (event.type === 'user.updated') {
            const clerkUser = event.data;
            // Check if user exists in database first
            const existingUser = yield User.findById(clerkUser.id);
            if (!existingUser) {
                console.log('ℹ️ User not found in database, skipping update:', clerkUser.id);
                clearTimeout(timer);
                console.log('✅ Webhook processed successfully (user not found)');
                return res.status(200).json({ success: true, message: 'User not found in database' });
            }
            const update = {};
            // Build update object with validated data - only if different from current
            if (clerkUser.username && clerkUser.username.toLowerCase() !== existingUser.username) {
                update.username = clerkUser.username.toLowerCase();
            }
            if (clerkUser.first_name && clerkUser.first_name !== existingUser.firstName) {
                update.firstName = clerkUser.first_name;
            }
            if (clerkUser.last_name && clerkUser.last_name !== existingUser.lastName) {
                update.lastName = clerkUser.last_name;
            }
            const newImageUrl = clerkUser.profile_image_url || clerkUser.image_url;
            if (newImageUrl && newImageUrl !== existingUser.profileImageUrl) {
                update.profileImageUrl = newImageUrl;
            }
            console.log('👤 Updating user:', clerkUser.id, update);
            if (Object.keys(update).length > 0) {
                yield User.findByIdAndUpdate(clerkUser.id, update, { runValidators: true });
                console.log('✅ User updated in DB successfully');
                // Sync role from database to Clerk if it exists (only if role sync is needed)
                if (existingUser.role) {
                    yield syncUserRoleToClerk(clerkUser.id);
                }
            }
            else {
                console.log('ℹ️ No updates needed for user:', clerkUser.id);
            }
            console.log('✅ User verified in DB');
        }
        else if (event.type === 'user.deleted') {
            const clerkUser = event.data;
            const clerkId = clerkUser.id;
            console.log(`🗑️ Processing user deletion webhook for: ${clerkId}`);
            // Check if user exists in database
            const existingUser = yield User.findById(clerkId);
            if (!existingUser) {
                console.log('ℹ️ User not found in database, skipping deletion cleanup:', clerkId);
                clearTimeout(timer);
                console.log('✅ Webhook processed successfully (user not found)');
                return res.status(200).json({ success: true, message: 'User not found in database' });
            }
            // Prevent admin account cleanup (should not happen via webhook, but safety check)
            if (existingUser.role === 'admin') {
                console.log('⚠️ Admin user deletion detected via webhook, skipping cleanup:', clerkId);
                clearTimeout(timer);
                return res.status(200).json({ success: true, message: 'Admin account cleanup skipped' });
            }
            // Import required models for cleanup (direct imports like protected.ts)
            const { Post } = yield import('../models/post.model');
            const { Comment } = yield import('../models/comment.model');
            const { Like } = yield import('../models/like.model');
            const { Repost } = yield import('../models/repost.model');
            const { Follow } = yield import('../models/follow.model');
            const { Block } = yield import('../models/block.model');
            const { Message } = yield import('../models/message.model');
            const { Conversation } = yield import('../models/conversation.model');
            const { LiveStream } = yield import('../models/liveStream.model');
            const { StreamChatMessage } = yield import('../models/streamChat.model');
            const { Notification } = yield import('../models/notification.model');
            const { SupportTicket } = yield import('../models/support.model');
            const { deleteFromCloudinary } = yield import('../utils/cloudinary');
            const mongoose = (yield import('mongoose')).default;
            try {
                // Start MongoDB transaction for data consistency
                const session = yield mongoose.startSession();
                try {
                    yield session.withTransaction(() => __awaiter(void 0, void 0, void 0, function* () {
                        console.log(`🧹 Cleaning up data for deleted user: ${clerkId}`);
                        // 1. Get all user's posts to delete media files
                        const userPosts = yield Post.find({ author: clerkId }).session(session);
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
                                        const uploadIndex = urlParts.findIndex((part) => part === 'upload');
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
                            Post.deleteMany({ author: clerkId }).session(session),
                            Comment.deleteMany({ author: clerkId }).session(session),
                            Like.deleteMany({ userId: clerkId }).session(session),
                            Repost.deleteMany({ userId: clerkId }).session(session),
                            // Social interactions
                            Follow.deleteMany({ $or: [{ followerId: clerkId }, { followingId: clerkId }] }).session(session),
                            Block.deleteMany({ $or: [{ blockerId: clerkId }, { blockedId: clerkId }] }).session(session),
                            // Messaging
                            Message.deleteMany({ senderId: clerkId }).session(session),
                            // Remove user from conversations and delete empty conversations
                            Conversation.deleteMany({ participants: clerkId }).session(session),
                            Conversation.updateMany({ participants: clerkId }, { $pull: { participants: clerkId } }).session(session),
                            // Live streaming
                            LiveStream.deleteMany({ hostId: clerkId }).session(session),
                            StreamChatMessage.deleteMany({ userId: clerkId }).session(session),
                            // Notifications and support
                            Notification.deleteMany({ userId: clerkId }).session(session),
                            SupportTicket.deleteMany({ $or: [{ userId: clerkId }, { resolvedBy: clerkId }] }).session(session),
                        ]);
                        // 3. Delete the user record last
                        yield User.findByIdAndDelete(clerkId).session(session);
                        console.log(`✅ Successfully cleaned up data for deleted user: ${clerkId}`);
                    }));
                }
                finally {
                    yield session.endSession();
                }
                console.log('✅ User deletion webhook processed successfully');
            }
            catch (cleanupError) {
                console.error(`❌ Error during user deletion cleanup for ${clerkId}:`, cleanupError);
                // Don't fail the webhook - user is already deleted from Clerk
            }
        }
        else {
            console.log('ℹ️ Unhandled webhook event type:', event.type);
        }
        clearTimeout(timer);
        console.log('✅ Webhook processed successfully');
        res.status(200).json({ success: true, message: 'Webhook processed' });
    }
    catch (err) {
        clearTimeout(timer);
        console.error('❌ Webhook processing error:', err);
        // Remove from cache on processing error to allow retry
        const svixId = req.headers['svix-id'];
        if (svixId) {
            webhookCache.delete(svixId);
        }
        // Return 200 to prevent webhook retries for processing errors
        res.status(200).json({ error: 'Webhook processing failed' });
    }
}));
export default router;
