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
import { Conversation } from '../models/conversation.model';
import { Message } from '../models/message.model';
import { Follow } from '../models/follow.model';
import { Block } from '../models/block.model';
import { io } from '../index';
import { body, validationResult, param, query } from 'express-validator';
import multer from 'multer';
import { uploadToCloudinary } from '../utils/cloudinary';
import { requireAuth } from '../middleware/auth';
const router = Router();
// Test endpoint to verify basic functionality
router.get('/test', requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        res.json({
            message: 'Messages API is working',
            userId: userId,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Test endpoint error:', error);
        res.status(500).json({ error: 'Test endpoint failed' });
    }
}));
// Enhanced file upload configuration with better security - IMAGES AND VIDEOS
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB for videos
        files: 1 // Only one file at a time
    },
    fileFilter: (req, file, cb) => {
        console.log('🔍 Multer fileFilter called for:', {
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size
        });
        // Allow image and video files - more lenient validation
        const mimetype = file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/');
        console.log('🔍 File validation:', { mimetype, originalname: file.originalname });
        // Additional security checks - file.size might be undefined in fileFilter
        if (file.size && file.size > 100 * 1024 * 1024) {
            console.log('❌ File too large:', file.size);
            return cb(new Error('File size too large. Maximum 100MB allowed.'));
        }
        if (mimetype) {
            console.log('✅ File validation passed');
            return cb(null, true);
        }
        else {
            console.log('❌ File validation failed:', { mimetype });
            cb(new Error('Invalid file type. Only images and videos are allowed.'));
        }
    }
});
// Input sanitization helper
const sanitizeInput = (input) => {
    return DOMPurify.sanitize(input.trim());
};
// Check if users can message each other (mutual followers and not blocked)
const canMessageEachOther = (userId1, userId2) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Check if they follow each other
        const [user1FollowsUser2, user2FollowsUser1] = yield Promise.all([
            Follow.findOne({ followerId: userId1, followingId: userId2 }),
            Follow.findOne({ followerId: userId2, followingId: userId1 })
        ]);
        if (!user1FollowsUser2 || !user2FollowsUser1) {
            return false;
        }
        // Check if either user has blocked the other
        const [user1BlockedUser2, user2BlockedUser1] = yield Promise.all([
            Block.findOne({ blockerId: userId1, blockedId: userId2 }),
            Block.findOne({ blockerId: userId2, blockedId: userId1 })
        ]);
        return !user1BlockedUser2 && !user2BlockedUser1;
    }
    catch (error) {
        console.error('Error checking message permissions:', error);
        return false;
    }
});
// Get users the current user is following (for messaging) - Enhanced with mutual follow check
router.get('/following/:userId', requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        console.log('🔍 Fetching following users for:', userId);
        // Get users the current user follows
        const following = yield Follow.find({ followerId: userId })
            .populate({
            path: 'followingId',
            select: 'username firstName lastName profileImageUrl isOnline lastSeen',
            model: 'User'
        })
            .lean();
        console.log('📊 Found following relationships:', following.length);
        console.log('📊 Following data sample:', following.slice(0, 2));
        // Get users who follow the current user
        const followers = yield Follow.find({ followingId: userId })
            .populate({
            path: 'followerId',
            select: 'username firstName lastName profileImageUrl isOnline lastSeen',
            model: 'User'
        })
            .lean();
        console.log('📊 Found follower relationships:', followers.length);
        console.log('📊 Followers data sample:', followers.slice(0, 2));
        // Find mutual followers with null checks
        const followingIds = new Set(following
            .filter(f => f.followingId && f.followingId._id)
            .map(f => f.followingId._id.toString()));
        const followersIds = new Set(followers
            .filter(f => f.followerId && f.followerId._id)
            .map(f => f.followerId._id.toString()));
        console.log('📊 Following IDs:', Array.from(followingIds));
        console.log('📊 Followers IDs:', Array.from(followersIds));
        const mutualFollowers = following.filter(f => f.followingId &&
            f.followingId._id &&
            followersIds.has(f.followingId._id.toString()));
        console.log('🤝 Found mutual followers:', mutualFollowers.length);
        // Check for blocks
        const blockedUsers = yield Block.find({ blockerId: userId }).lean();
        const blockedIds = new Set(blockedUsers.map(b => b.blockedId));
        console.log('🚫 Blocked users:', Array.from(blockedIds));
        const messageableUsers = mutualFollowers
            .filter(f => f.followingId && f.followingId._id && !blockedIds.has(f.followingId._id.toString()))
            .map(f => (Object.assign(Object.assign({}, f.followingId), { _id: f.followingId._id.toString() })));
        console.log('💬 Messageable users:', messageableUsers.length);
        res.json({ users: messageableUsers });
    }
    catch (error) {
        console.error('❌ Error fetching following users:', error);
        console.error('❌ Error stack:', error.stack);
        console.error('❌ Error name:', error.name);
        console.error('❌ Error message:', error.message);
        res.status(500).json({ error: 'Failed to fetch following users' });
    }
}));
// Get user's conversations with unread counts - Optimized with aggregation
router.get('/conversations/:userId', requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { userId } = req.params;
        console.log('🔍 Fetching conversations for userId:', userId);
        console.log('🔍 Authenticated user:', (_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
        console.log('🔍 DB User ID:', req.userId);
        // Use aggregation for better performance
        // Fix: Use $in operator to check if userId is in the participants array
        const conversations = yield Conversation.aggregate([
            {
                $match: {
                    participants: { $in: [userId] }
                }
            },
            { $sort: { updatedAt: -1 } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'participants',
                    foreignField: '_id',
                    as: 'participantDetails'
                }
            },
            {
                $addFields: {
                    unreadCount: {
                        $ifNull: [
                            {
                                $getField: {
                                    field: userId,
                                    input: { $ifNull: ['$unreadCount', {}] }
                                }
                            },
                            0
                        ]
                    },
                    otherParticipant: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: '$participantDetails',
                                    cond: { $ne: ['$$this._id', userId] }
                                }
                            },
                            0
                        ]
                    }
                }
            },
            {
                $project: {
                    _id: 1,
                    participants: 1,
                    lastMessage: 1,
                    unreadCount: 1,
                    otherParticipant: {
                        _id: 1,
                        username: 1,
                        firstName: 1,
                        lastName: 1,
                        profileImageUrl: 1,
                        isOnline: 1,
                        lastSeen: 1
                    },
                    createdAt: 1,
                    updatedAt: 1
                }
            }
        ]);
        console.log('✅ Found conversations:', conversations.length);
        // Convert ObjectIds to strings for frontend compatibility
        const formattedConversations = conversations.map((conv) => (Object.assign(Object.assign({}, conv), { _id: conv._id.toString(), otherParticipant: conv.otherParticipant ? Object.assign(Object.assign({}, conv.otherParticipant), { _id: conv.otherParticipant._id ? conv.otherParticipant._id.toString() : null }) : null })));
        res.json({ conversations: formattedConversations });
    }
    catch (error) {
        console.error('❌ Error fetching conversations:', error);
        console.error('❌ Error stack:', error.stack);
        res.status(500).json({ error: 'Failed to fetch conversations', details: error.message });
    }
}));
// Search conversations by participant name, username, or message content
router.get('/conversations/:userId/search', requireAuth, [
    query('q').isString().notEmpty(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 })
], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { userId } = req.params;
        const { q } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const searchQuery = sanitizeInput(q);
        // First, find conversations that match the search criteria
        const conversations = yield Conversation.aggregate([
            { $match: { participants: userId } },
            { $sort: { updatedAt: -1 } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'participants',
                    foreignField: '_id',
                    as: 'participantDetails'
                }
            },
            {
                $lookup: {
                    from: 'messages',
                    localField: '_id',
                    foreignField: 'conversationId',
                    as: 'messages'
                }
            },
            {
                $addFields: {
                    unreadCount: {
                        $ifNull: [
                            { $getField: { field: userId, input: '$unreadCount' } },
                            0
                        ]
                    },
                    otherParticipant: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: '$participantDetails',
                                    cond: { $ne: ['$$this._id', userId] }
                                }
                            },
                            0
                        ]
                    }
                }
            },
            // Filter out conversations where otherParticipant is null
            {
                $match: {
                    otherParticipant: { $ne: null }
                }
            },
            {
                $match: {
                    $or: [
                        // Match by participant first name
                        { 'otherParticipant.firstName': { $regex: searchQuery, $options: 'i' } },
                        // Match by participant last name
                        { 'otherParticipant.lastName': { $regex: searchQuery, $options: 'i' } },
                        // Match by participant username
                        { 'otherParticipant.username': { $regex: searchQuery, $options: 'i' } },
                        // Match by message content
                        { 'messages.content': { $regex: searchQuery, $options: 'i' } }
                    ]
                }
            },
            {
                $project: {
                    _id: 1,
                    participants: 1,
                    lastMessage: 1,
                    unreadCount: 1,
                    otherParticipant: 1,
                    createdAt: 1,
                    updatedAt: 1
                }
            },
            { $skip: skip },
            { $limit: limit }
        ]).catch(error => {
            console.error('❌ Aggregation error:', error);
            return [];
        });
        // Get total count for pagination
        const totalConversations = yield Conversation.aggregate([
            { $match: { participants: userId } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'participants',
                    foreignField: '_id',
                    as: 'participantDetails'
                }
            },
            {
                $lookup: {
                    from: 'messages',
                    localField: '_id',
                    foreignField: 'conversationId',
                    as: 'messages'
                }
            },
            {
                $addFields: {
                    otherParticipant: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: '$participantDetails',
                                    cond: { $ne: ['$$this._id', userId] }
                                }
                            },
                            0
                        ]
                    }
                }
            },
            // Filter out conversations where otherParticipant is null
            {
                $match: {
                    otherParticipant: { $ne: null }
                }
            },
            {
                $match: {
                    $or: [
                        { 'otherParticipant.firstName': { $regex: searchQuery, $options: 'i' } },
                        { 'otherParticipant.lastName': { $regex: searchQuery, $options: 'i' } },
                        { 'otherParticipant.username': { $regex: searchQuery, $options: 'i' } },
                        { 'messages.content': { $regex: searchQuery, $options: 'i' } }
                    ]
                }
            },
            { $count: 'total' }
        ]).catch(error => {
            console.error('❌ Count aggregation error:', error);
            return [{ total: 0 }];
        });
        const totalCount = ((_a = totalConversations[0]) === null || _a === void 0 ? void 0 : _a.total) || 0;
        // Convert ObjectIds to strings for frontend compatibility
        const formattedConversations = conversations.map((conv) => (Object.assign(Object.assign({}, conv), { _id: conv._id.toString(), otherParticipant: conv.otherParticipant ? Object.assign(Object.assign({}, conv.otherParticipant), { _id: conv.otherParticipant._id.toString() }) : null })));
        res.json({
            conversations: formattedConversations,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalCount / limit),
                totalConversations: totalCount,
                hasNextPage: page * limit < totalCount,
                hasPrevPage: page > 1
            }
        });
    }
    catch (error) {
        console.error('❌ Error searching conversations:', error);
        res.status(500).json({ error: 'Failed to search conversations' });
    }
}));
// Get unread message count for user
router.get('/unread-count/:userId', requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const conversations = yield Conversation.find({ participants: userId });
        const totalUnread = conversations.reduce((sum, conv) => {
            return sum + (conv.unreadCount.get(userId) || 0);
        }, 0);
        res.json({ unreadCount: totalUnread });
    }
    catch (error) {
        console.error('❌ Error fetching unread count:', error);
        res.status(500).json({ error: 'Failed to fetch unread count' });
    }
}));
// Create or get conversation with another user - Enhanced with security checks
router.post('/conversations', requireAuth, [
    body('userId').isString().notEmpty(),
    body('participantId').isString().notEmpty()
], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { userId, participantId } = req.body;
        // Prevent self-messaging
        if (userId === participantId) {
            return res.status(400).json({ error: 'Cannot message yourself' });
        }
        // Check if users can message each other
        const canMessage = yield canMessageEachOther(userId, participantId);
        if (!canMessage) {
            return res.status(403).json({ error: 'Cannot message this user. You must be mutual followers and not blocked.' });
        }
        console.log('🔍 Creating/getting conversation between:', userId, 'and', participantId);
        let conversation = yield Conversation.findOne({ participants: { $all: [userId, participantId] } });
        if (!conversation) {
            console.log('📝 Creating new conversation...');
            conversation = new Conversation({
                participants: [userId, participantId],
                unreadCount: new Map()
            });
            yield conversation.save();
            console.log('✅ New conversation saved with ID:', conversation._id);
        }
        else {
            console.log('📖 Found existing conversation with ID:', conversation._id);
        }
        // Get participant details with a simpler approach
        const conversationWithDetails = yield Conversation.findById(conversation._id)
            .populate('participants', 'username firstName lastName profileImageUrl isOnline lastSeen')
            .lean();
        if (!conversationWithDetails) {
            console.error('❌ No conversation found after creation:', conversation._id);
            return res.status(500).json({ error: 'Failed to retrieve conversation details' });
        }
        // Find the other participant
        const otherParticipant = conversationWithDetails.participants.find((participant) => participant._id.toString() !== userId);
        // Convert ObjectIds to strings for frontend compatibility
        const formattedResult = Object.assign(Object.assign({}, conversationWithDetails), { _id: conversationWithDetails._id.toString(), participants: conversationWithDetails.participants.map((participant) => (Object.assign(Object.assign({}, participant), { _id: participant._id.toString() }))), otherParticipant: otherParticipant ? Object.assign(Object.assign({}, otherParticipant), { _id: otherParticipant._id.toString() }) : null });
        console.log('📤 Sending conversation to frontend:', {
            _id: formattedResult._id,
            participants: formattedResult.participants,
            createdAt: formattedResult.createdAt
        });
        // Emit newConversation event to all other participants
        const otherParticipants = conversation.participants.filter(p => p !== userId);
        otherParticipants.forEach(participantId => {
            io.to(`user_${participantId}`).emit('newConversation', formattedResult);
        });
        res.json({ conversation: formattedResult });
    }
    catch (error) {
        console.error('❌ Error creating conversation:', error);
        res.status(500).json({ error: 'Failed to create conversation' });
    }
}));
// Mark conversation as read
router.put('/conversations/:conversationId/read', requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { conversationId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.sub;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        // Verify user is part of the conversation
        const conversation = yield Conversation.findOne({
            _id: conversationId,
            participants: userId
        });
        if (!conversation) {
            res.status(404).json({ error: 'Conversation not found or access denied' });
            return;
        }
        yield Conversation.findByIdAndUpdate(conversationId, {
            $set: { [`unreadCount.${userId}`]: 0 }
        });
        // Emit read receipt to all participants
        io.to(conversationId).emit('conversationRead', { conversationId, userId });
        res.json({ success: true });
    }
    catch (error) {
        console.error('❌ Error marking conversation as read:', error);
        res.status(500).json({ error: 'Failed to mark conversation as read' });
    }
}));
// Get messages for a conversation (paginated) - Enhanced with better validation
router.get('/messages/:conversationId', requireAuth, [
    param('conversationId').isString().notEmpty(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { conversationId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.sub;
        // Verify user is part of the conversation
        const conversation = yield Conversation.findOne({
            _id: conversationId,
            participants: userId
        });
        if (!conversation) {
            res.status(404).json({ error: 'Conversation not found or access denied' });
            return;
        }
        const messages = yield Message.find({
            conversationId,
            deletedAt: { $exists: false }
        })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('senderId', 'username firstName lastName profileImageUrl');
        // Transform messages to include senderId_details
        const transformedMessages = messages.map(message => {
            const messageObj = message.toObject();
            const senderId = messageObj.senderId;
            return Object.assign(Object.assign({}, messageObj), { senderId: senderId._id || senderId, senderId_details: {
                    _id: senderId._id,
                    username: senderId.username,
                    firstName: senderId.firstName,
                    lastName: senderId.lastName,
                    profileImageUrl: senderId.profileImageUrl
                } });
        });
        res.json({ messages: transformedMessages.reverse() });
    }
    catch (error) {
        console.error('❌ Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
}));
// Search messages in a conversation - Enhanced with security
router.get('/messages/:conversationId/search', requireAuth, [
    param('conversationId').isString().notEmpty(),
    query('q').isString().notEmpty(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { conversationId } = req.params;
        const { q } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.sub;
        // Verify user is part of the conversation
        const conversation = yield Conversation.findOne({
            _id: conversationId,
            participants: userId
        });
        if (!conversation) {
            res.status(404).json({ error: 'Conversation not found or access denied' });
            return;
        }
        const messages = yield Message.find({
            conversationId,
            deletedAt: { $exists: false },
            content: { $regex: sanitizeInput(q), $options: 'i' }
        })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('senderId', 'username firstName lastName profileImageUrl');
        // Transform messages to include senderId_details
        const transformedMessages = messages.map(message => {
            const messageObj = message.toObject();
            const senderId = messageObj.senderId;
            return Object.assign(Object.assign({}, messageObj), { senderId: senderId._id || senderId, senderId_details: {
                    _id: senderId._id,
                    username: senderId.username,
                    firstName: senderId.firstName,
                    lastName: senderId.lastName,
                    profileImageUrl: senderId.profileImageUrl
                } });
        });
        res.json({ messages: transformedMessages.reverse() });
    }
    catch (error) {
        console.error('❌ Error searching messages:', error);
        res.status(500).json({ error: 'Failed to search messages' });
    }
}));
// Send a message (for persistence) - Enhanced with security and validation
router.post('/messages', requireAuth, [
    body('conversationId').isString().notEmpty(),
    body('senderId').isString().notEmpty(),
    body('content').optional().isString().isLength({ min: 0, max: 5000 }),
    body('messageType').optional().isIn(['text', 'image', 'video', 'file', 'system', 'audio']),
    body('attachments').optional().isArray(),
    body('replyTo').optional().isString()
], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        console.log('📝 Message creation request:', {
            conversationId: req.body.conversationId,
            senderId: req.body.senderId,
            content: req.body.content,
            messageType: req.body.messageType,
            attachments: req.body.attachments,
            replyTo: req.body.replyTo
        });
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('❌ Validation errors:', errors.array());
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { conversationId, senderId, content, messageType, attachments, replyTo } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.sub;
        // Verify sender is authenticated user
        if (senderId !== userId) {
            res.status(403).json({ error: 'Cannot send message as another user' });
            return;
        }
        // Verify user is part of the conversation
        const conversation = yield Conversation.findOne({
            _id: conversationId,
            participants: senderId
        });
        if (!conversation) {
            res.status(404).json({ error: 'Conversation not found or access denied' });
            return;
        }
        // Validate required fields
        if (!conversationId || !senderId || (messageType !== 'image' && messageType !== 'video' && !content)) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        if ((messageType === 'image' || messageType === 'video') && (!attachments || attachments.length === 0)) {
            return res.status(400).json({ error: `${messageType} attachment required` });
        }
        // Sanitize content only if present
        const sanitizedContent = content ? DOMPurify.sanitize(content.trim()) : '';
        if (messageType !== 'image' && messageType !== 'video' && !sanitizedContent) {
            return res.status(400).json({ error: 'Message content cannot be empty' });
        }
        const message = new Message({
            conversationId,
            senderId,
            content: sanitizedContent,
            messageType: messageType || 'text',
            attachments,
            replyTo
        });
        yield message.save();
        // Update conversation's last message and increment unread count for other participants
        const otherParticipants = conversation.participants.filter(p => p !== senderId);
        const updateSet = {
            lastMessage: {
                content: sanitizedContent,
                senderId,
                timestamp: new Date(),
                messageType: messageType || 'text'
            }
        };
        const updateInc = {};
        otherParticipants.forEach((participantId) => {
            updateInc[`unreadCount.${participantId}`] = 1;
        });
        yield Conversation.findByIdAndUpdate(conversationId, {
            $set: updateSet,
            $inc: updateInc
        });
        // Populate sender details
        yield message.populate('senderId', 'username firstName lastName profileImageUrl');
        // Transform message to include senderId_details
        const messageObj = message.toObject();
        const senderIdDetails = {
            _id: messageObj.senderId._id,
            username: messageObj.senderId.username,
            firstName: messageObj.senderId.firstName,
            lastName: messageObj.senderId.lastName,
            profileImageUrl: messageObj.senderId.profileImageUrl
        };
        const transformedMessage = Object.assign(Object.assign({}, messageObj), { senderId: messageObj.senderId._id || messageObj.senderId, senderId_details: senderIdDetails });
        // Emit to all users in the conversation room
        io.to(conversationId).emit('newMessage', transformedMessage);
        res.json({ message: transformedMessage });
    }
    catch (error) {
        console.error('❌ Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
}));
// Edit a message - Enhanced with security
router.put('/messages/:messageId', requireAuth, [
    param('messageId').isString().notEmpty(),
    body('content').isString().isLength({ min: 0, max: 5000 })
], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { messageId } = req.params;
        const { content } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.sub;
        const message = yield Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }
        // Verify user owns the message
        if (message.senderId !== userId) {
            return res.status(403).json({ error: 'Cannot edit another user\'s message' });
        }
        // Sanitize content
        const sanitizedContent = sanitizeInput(content);
        message.content = sanitizedContent;
        message.editedAt = new Date();
        yield message.save();
        // Populate sender details
        yield message.populate('senderId', 'username firstName lastName profileImageUrl');
        // Transform message to include senderId_details (consistent with other endpoints)
        const messageObj = message.toObject();
        const senderIdDetails = {
            _id: messageObj.senderId._id,
            username: messageObj.senderId.username,
            firstName: messageObj.senderId.firstName,
            lastName: messageObj.senderId.lastName,
            profileImageUrl: messageObj.senderId.profileImageUrl
        };
        const transformedMessage = Object.assign(Object.assign({}, messageObj), { senderId: messageObj.senderId._id || messageObj.senderId, senderId_details: senderIdDetails });
        // Emit message update to conversation
        io.to(message.conversationId).emit('messageEdited', transformedMessage);
        res.json({ message: transformedMessage });
    }
    catch (error) {
        console.error('❌ Error editing message:', error);
        res.status(500).json({ error: 'Failed to edit message' });
    }
}));
// Delete a message (soft delete) - Enhanced with security
router.delete('/messages/:messageId', requireAuth, [
    param('messageId').isString().notEmpty()
], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { messageId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.sub;
        const message = yield Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }
        // Verify user owns the message
        if (message.senderId !== userId) {
            return res.status(403).json({ error: 'Cannot delete another user\'s message' });
        }
        message.deletedAt = new Date();
        yield message.save();
        // Emit message deletion to conversation
        io.to(message.conversationId).emit('messageDeleted', { messageId });
        res.json({ success: true });
    }
    catch (error) {
        console.error('❌ Error deleting message:', error);
        res.status(500).json({ error: 'Failed to delete message' });
    }
}));
// Mark message as read - Enhanced with security
router.put('/messages/:messageId/read', requireAuth, [
    param('messageId').isString().notEmpty(),
    body('conversationId').isString().notEmpty()
], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { messageId } = req.params;
        const { conversationId } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.sub;
        // Verify user is part of the conversation
        const conversation = yield Conversation.findOne({
            _id: conversationId,
            participants: userId
        });
        if (!conversation) {
            res.status(404).json({ error: 'Conversation not found or access denied' });
            return;
        }
        // Mark message as read in database
        yield Message.findByIdAndUpdate(messageId, {
            $addToSet: { readBy: userId }
        });
        // Emit read receipt to conversation
        io.to(conversationId).emit('messageRead', { messageId, userId });
        res.json({ success: true });
    }
    catch (error) {
        console.error('❌ Error marking message as read:', error);
        res.status(500).json({ error: 'Failed to mark message as read' });
    }
}));
// Enhanced file upload with Cloudinary - Improved security for images and videos
// Simplified to match profile upload route structure
router.post('/upload', requireAuth, (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            console.log('❌ Multer error:', err);
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'File size too large. Maximum 100MB allowed.' });
            }
            return res.status(400).json({ error: `Upload error: ${err.message}` });
        }
        else if (err) {
            console.log('❌ File validation error:', err);
            return res.status(400).json({ error: err.message });
        }
        next();
    });
}, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('📁 File upload request received');
        if (!req.file) {
            console.log('❌ No file in request');
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }
        console.log('📁 File details:', {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            fieldname: req.file.fieldname
        });
        // Additional file validation - IMAGES AND VIDEOS
        const allowedImageMimeTypes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'
        ];
        const allowedVideoMimeTypes = [
            'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv',
            'video/webm', 'video/mkv', 'video/m4v', 'video/3gp'
        ];
        const isImage = allowedImageMimeTypes.includes(req.file.mimetype);
        const isVideo = allowedVideoMimeTypes.includes(req.file.mimetype);
        console.log('🔍 File type detection:', { isImage, isVideo, mimetype: req.file.mimetype });
        if (!isImage && !isVideo) {
            console.log('❌ Invalid file type:', req.file.mimetype);
            return res.status(400).json({ error: 'Only image files (JPEG, PNG, GIF, WebP) and video files (MP4, AVI, MOV, WMV, FLV, WebM, MKV, M4V, 3GP) are allowed' });
        }
        // Check file size limit (100MB for videos, 10MB for images)
        const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
        if (req.file.size > maxSize) {
            console.log('❌ File too large:', { size: req.file.size, maxSize });
            return res.status(400).json({
                error: `File size too large. Maximum ${isVideo ? '100MB' : '10MB'} allowed for ${isVideo ? 'videos' : 'images'}.`
            });
        }
        console.log('☁️ Starting Cloudinary upload for:', isVideo ? 'video' : 'image');
        // Upload to Cloudinary using buffer with appropriate resource type
        const result = yield uploadToCloudinary(req.file.buffer, 'messages', isVideo ? 'video' : 'image');
        console.log('✅ Cloudinary upload successful:', {
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            size: result.bytes,
            duration: result.duration,
            thumbnail: result.thumbnail_url
        });
        res.json({
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            size: result.bytes,
            duration: result.duration, // For videos
            thumbnail: result.thumbnail_url // For videos
        });
    }
    catch (error) {
        console.error('❌ Error uploading file:', error);
        console.error('❌ Error stack:', error.stack);
        res.status(500).json({ error: 'Failed to upload file' });
    }
}));
// Add reaction to message - Enhanced with security
router.post('/messages/:messageId/reactions', requireAuth, [
    param('messageId').isString().notEmpty(),
    body('reaction').isString().isLength({ min: 1, max: 10 })
], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { messageId } = req.params;
        const { reaction } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.sub;
        const message = yield Message.findById(messageId);
        if (!message) {
            res.status(404).json({ error: 'Message not found' });
            return;
        }
        // Verify user is part of the conversation
        const conversation = yield Conversation.findOne({
            _id: message.conversationId,
            participants: userId
        });
        if (!conversation) {
            res.status(403).json({ error: 'Access denied to this conversation' });
            return;
        }
        yield message.addReaction(userId, reaction);
        // Populate sender details
        yield message.populate('senderId', 'username firstName lastName profileImageUrl');
        // Transform message to include senderId_details (consistent with other endpoints)
        const messageObj = message.toObject();
        const senderIdDetails = {
            _id: messageObj.senderId._id,
            username: messageObj.senderId.username,
            firstName: messageObj.senderId.firstName,
            lastName: messageObj.senderId.lastName,
            profileImageUrl: messageObj.senderId.profileImageUrl
        };
        const transformedMessage = Object.assign(Object.assign({}, messageObj), { senderId: messageObj.senderId._id || messageObj.senderId, senderId_details: senderIdDetails });
        // Emit reaction to conversation
        io.to(message.conversationId).emit('messageReaction', {
            messageId,
            userId,
            reaction,
            reactions: message.reactions
        });
        res.json({ message: transformedMessage });
    }
    catch (error) {
        console.error('❌ Error adding reaction:', error);
        res.status(500).json({ error: 'Failed to add reaction' });
    }
}));
// Remove reaction from message - Enhanced with security
router.delete('/messages/:messageId/reactions', requireAuth, [
    param('messageId').isString().notEmpty(),
    body('userId').isString().notEmpty()
], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { messageId } = req.params;
        const { userId } = req.body;
        const authenticatedUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.sub;
        // Verify user is removing their own reaction
        if (userId !== authenticatedUserId) {
            res.status(403).json({ error: 'Cannot remove another user\'s reaction' });
            return;
        }
        const message = yield Message.findById(messageId);
        if (!message) {
            res.status(404).json({ error: 'Message not found' });
            return;
        }
        yield message.removeReaction(userId);
        // Populate sender details
        yield message.populate('senderId', 'username firstName lastName profileImageUrl');
        // Transform message to include senderId_details (consistent with other endpoints)
        const messageObj = message.toObject();
        const senderIdDetails = {
            _id: messageObj.senderId._id,
            username: messageObj.senderId.username,
            firstName: messageObj.senderId.firstName,
            lastName: messageObj.senderId.lastName,
            profileImageUrl: messageObj.senderId.profileImageUrl
        };
        const transformedMessage = Object.assign(Object.assign({}, messageObj), { senderId: messageObj.senderId._id || messageObj.senderId, senderId_details: senderIdDetails });
        // Emit reaction removal to conversation
        io.to(message.conversationId).emit('messageReactionRemoved', {
            messageId,
            userId,
            reactions: message.reactions
        });
        res.json({ message: transformedMessage });
    }
    catch (error) {
        console.error('❌ Error removing reaction:', error);
        res.status(500).json({ error: 'Failed to remove reaction' });
    }
}));
// Mark message as delivered - Enhanced with security
router.put('/messages/:messageId/delivered', requireAuth, [
    param('messageId').isString().notEmpty(),
    body('userId').isString().notEmpty()
], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { messageId } = req.params;
        const { userId } = req.body;
        const authenticatedUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.sub;
        // Verify user is marking their own delivery
        if (userId !== authenticatedUserId) {
            res.status(403).json({ error: 'Cannot mark delivery for another user' });
            return;
        }
        const message = yield Message.findById(messageId);
        if (!message) {
            res.status(404).json({ error: 'Message not found' });
            return;
        }
        yield message.markAsDelivered(userId);
        // Emit delivery receipt to conversation
        io.to(message.conversationId).emit('messageDelivered', {
            messageId,
            userId,
            deliveredTo: message.deliveredTo
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('❌ Error marking message as delivered:', error);
        res.status(500).json({ error: 'Failed to mark message as delivered' });
    }
}));
// Get message statistics - Enhanced with security
router.get('/messages/:messageId/stats', requireAuth, [
    param('messageId').isString().notEmpty()
], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { messageId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.sub;
        const message = yield Message.findById(messageId);
        if (!message) {
            res.status(404).json({ error: 'Message not found' });
            return;
        }
        // Verify user is part of the conversation
        const conversation = yield Conversation.findOne({
            _id: message.conversationId,
            participants: userId
        });
        if (!conversation) {
            res.status(403).json({ error: 'Access denied to this conversation' });
            return;
        }
        const stats = {
            reactionCount: message.reactions ? message.reactions.size : 0,
            readCount: message.readBy ? message.readBy.length : 0,
            deliveryCount: message.deliveredTo ? message.deliveredTo.length : 0,
            reactions: message.reactions ? Object.fromEntries(message.reactions) : {},
            readBy: message.readBy || [],
            deliveredTo: message.deliveredTo || []
        };
        res.json({ stats });
    }
    catch (error) {
        console.error('❌ Error getting message stats:', error);
        res.status(500).json({ error: 'Failed to get message statistics' });
    }
}));
export default router;
