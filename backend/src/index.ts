import express from 'express';
import { connectDB } from './config/db';
import dotenv from 'dotenv';
import { toNodeHandler } from "better-auth/node";
import { initializeAuth, BETTER_AUTH_TRUSTED_ORIGINS } from './auth';
import protectedRoute from './routes/protected';
import postsRoute from './routes/posts';
import commentsRoute from './routes/comments';
import blocksRoute from './routes/blocks';
import notificationsRoute from './routes/notifications';
import messagesRoute from './routes/messages';
import followsRoute from './routes/follows';
import billingRoute from './routes/billing';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import rateLimit from 'express-rate-limit';
import { verifyToken } from '@clerk/clerk-sdk-node';
import { Block } from './models/block.model';
import webhooksRoute from './routes/webhooks';
import liveStreamsRoute from './routes/liveStreams';
import chatRoute from './routes/chat';
import supportRoute from './routes/support';
import reportsRoute from './routes/reports';
import hashtagsRoute from './routes/hashtags';
import otpRoute from './routes/otp';
import styleRoute from './routes/style';
import helmet from 'helmet';
import { validateEnvironmentVariables } from './config/env';
import { initializeImageFilter } from './utils/imageFilter';

// Load environment variables first
dotenv.config();

// Validate all required environment variables before starting the app
validateEnvironmentVariables();

const app = express();

// Trust proxy for rate limiting behind nginx
app.set('trust proxy', 1);

// Fix PORT type
const PORT = Number(process.env.PORT) || 5000;

// CORS configuration with environment variables
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : [
    'http://localhost:3000', // web frontend
    'https://airwig.ca', // production frontend
    'https://www.airwig.ca', // production frontend with www
    'http://192.168.101.6:5000', // mobile app (Expo Go, etc.) - current IP
    'http://192.168.101.5:5000', // mobile app (Expo Go, etc.) - previous IP
    'http://192.168.101.10:5000', // mobile app (Expo Go, etc.) - previous IP
    'https://stupid-tools-stare.loca.lt', // localtunnel URL
    'https://stupid-tools-stare.loca.lt:443', // localtunnel URL with port
  ];

// Add React Native support - allow localhost with any port for development
const isProduction = process.env.NODE_ENV === 'production';
// Fix CORS callback types (remove any duplicate definitions)
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps)
    if (!origin) return callback(null, true);

    // Allow production domain
    if (origin === 'https://airwig.ca' || origin === 'https://www.airwig.ca') {
      return callback(null, true);
    }

    // In development, allow localhost with any port for React Native
    if (!isProduction && origin.match(/^http:\/\/localhost:\d+$/)) {
      return callback(null, true);
    }

    // Allow local network IPs in development (for mobile app testing)
    if (!isProduction && origin.match(/^http:\/\/192\.168\.\d+\.\d+:\d+$/)) {
      return callback(null, true);
    }

    // Allow localtunnel URLs in development
    if (!isProduction && origin.match(/^https:\/\/.*\.loca\.lt(:\d+)?$/)) {
      return callback(null, true);
    }

    // Check if origin is in allowed list
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }

    console.log('🚫 CORS blocked origin:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

console.log('🔒 CORS configuration:', isProduction ? 'Production mode' : 'Development mode (allows localhost)');
console.log('🔒 CORS allowed origins:', ALLOWED_ORIGINS);

// 🔒 SAFE Helmet configuration - minimal settings to avoid breaking existing functionality
console.log('🛡️ Initializing Helmet security middleware...');
app.use(helmet({
  // ❌ DISABLED: Content Security Policy (CSP) - to avoid blocking Cloudinary images and external resources
  contentSecurityPolicy: false,

  // ❌ DISABLED: Cross-Origin Embedder Policy - to avoid breaking external resources
  crossOriginEmbedderPolicy: false,

  // ✅ ENABLED: HTTP Strict Transport Security (HSTS) - forces HTTPS
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },

  // ✅ ENABLED: Remove X-Powered-By header - hides server technology info
  hidePoweredBy: true,

  // ✅ ENABLED: Prevent MIME type sniffing - security against content confusion
  noSniff: true,

  // ✅ ENABLED: Prevent clickjacking attacks
  frameguard: {
    action: 'deny'
  },

  // ✅ ENABLED: Basic XSS protection
  xssFilter: true,

  // ✅ ENABLED: Prevent IE from executing downloads
  ieNoOpen: true,

  // ✅ ENABLED: Prevent cross-domain policy abuse
  permittedCrossDomainPolicies: false,

  // ✅ ENABLED: Control referrer information
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

console.log('✅ Helmet security headers configured successfully');

app.use(cors(corsOptions));

// Basic request logging - Log ALL incoming requests immediately
const colorize = (text: string, colorCode: number) => `\x1b[${colorCode}m${text}\x1b[0m`;

app.use((req, res, next) => {
  // Log immediately when request arrives (before processing)
  console.log(`📥 INCOMING REQUEST: ${req.method} ${req.originalUrl}`, {
    contentType: req.headers['content-type'],
    contentLength: req.headers['content-length'],
    userAgent: req.headers['user-agent']?.substring(0, 50),
    origin: req.headers.origin
  });

  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const isSuccess = status >= 200 && status < 400;
    const color = isSuccess ? 32 : 31; // green or red
    const message = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${status} (${duration}ms)`;
    console.log(colorize(message, color));
  });
  next();
});

// CRITICAL: Better Auth handler will be mounted after initialization in startServer()
// We need to mount it BEFORE express.json(), so we'll do that after DB connection
// JSON middleware will also be mounted conditionally in startServer()

// Rate limiting - Different limits for different routes
// Disable rate limiting in development mode
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Development mode: Rate limiting disabled');
} else {
  const globalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: 2500, // softened: 1500 requests per minute for general routes
    message: {
      error: 'Too many requests from this IP, please try again later.',
      statusCode: 429
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      console.log(`Global rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(60 / 500)
      });
    }
  });

  const strictLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 600, // softened: higher limit for sensitive operations
    message: {
      error: 'Too many requests for this operation, please try again later.',
      statusCode: 429
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      console.log(`Strict rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({
        error: 'Too many requests for this operation, please try again later.',
        retryAfter: Math.ceil(60 / 100)
      });
    }
  });

  const chatLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 600, // softened: higher limit for chat operations
    message: {
      error: 'Too many chat requests, please try again later.',
      statusCode: 429
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      console.log(`Chat rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({
        error: 'Too many chat requests, please try again later.',
        retryAfter: Math.ceil(60 / 300)
      });
    }
  });

  // Apply rate limiting to specific routes
  app.use('/api/posts', globalLimiter);
  app.use('/api/comments', globalLimiter);
  app.use('/api/blocks', globalLimiter);
  app.use('/api/notifications', globalLimiter);
  // Don't apply rate limiting to messages upload endpoint in development
  if (process.env.NODE_ENV === 'development') {
    app.use('/api/messages', (req, res, next) => {
      if (req.path === '/upload') {
        return next(); // Skip rate limiting for upload endpoint
      }
      return chatLimiter(req, res, next);
    });
  } else {
    app.use('/api/messages', chatLimiter);
  }
  app.use('/api/protected', strictLimiter);
  app.use('/api/style', strictLimiter);
}

// Static for uploads
app.use('/uploads', express.static('uploads'));

// API routes

const server = http.createServer(app);

// Configure server timeouts for large file uploads
server.timeout = 300000; // 5 minutes timeout for large video uploads
server.keepAliveTimeout = 65000; // Keep-alive timeout
server.headersTimeout = 66000; // Headers timeout

// Simple health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
});
const io = new SocketIOServer(server, {
  cors: {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps)
      if (!origin) return callback(null, true);

      // In development, allow localhost with any port for React Native
      if (!isProduction && origin.match(/^http:\/\/localhost:\d+$/)) {
        return callback(null, true);
      }

      // Allow local network IPs in development (for mobile app testing)
      if (!isProduction && origin.match(/^http:\/\/192\.168\.\d+\.\d+:\d+$/)) {
        return callback(null, true);
      }

      // Allow localtunnel URLs in development
      if (!isProduction && origin.match(/^https:\/\/.*\.loca\.lt(:\d+)?$/)) {
        return callback(null, true);
      }

      // Check if origin is in allowed list
      if (ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      console.log('🚫 Socket.IO CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // Enhanced security settings
  allowEIO3: false, // Disable Engine.IO v3 for security
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6, // 1MB max message size
});

// Socket.IO rate limiting
const socketRateLimit = new Map();
const SOCKET_RATE_LIMIT = {
  windowMs: 60000, // 1 minute
  maxEvents: 300, // Increased from 100 to 300 for better UX
};

// Socket.IO authentication middleware with Better Auth
io.use(async (socket, next) => {
  try {
    // Better Auth uses cookies, not tokens
    // Get cookies from handshake headers
    const cookieHeader = socket.handshake.headers.cookie;
    console.log('Socket auth attempt with cookies:', cookieHeader ? 'present' : 'missing');

    if (!cookieHeader) {
      console.log('No cookies provided, rejecting connection');
      return next(new Error('No session cookie provided'));
    }

    // Create Headers object for Better Auth
    const headers = new Headers();
    headers.set('cookie', cookieHeader);

    // Get session from Better Auth
    const { getAuth } = await import('./auth');
    const auth = getAuth();
    const session = await auth.api.getSession({
      headers: headers,
    });

    if (!session || !session.user) {
      console.log('Invalid or missing session');
      return next(new Error('Invalid session'));
    }

    console.log('Session verified for user:', session.user.id);

    // Check if user is suspended
    const { User } = await import('./models/user.model.js');
    const dbUser = await User.findOne({
      $or: [
        { _id: session.user.id },
        { betterAuthUserId: session.user.id }
      ]
    });

    if (dbUser && dbUser.status === 'suspended') {
      return next(new Error('Account suspended'));
    }

    socket.data.user = {
      id: dbUser?._id || session.user.id
    };

    next();
  } catch (err: any) {
    console.log('Socket authentication failed:', err.message);
    next(new Error('Authentication failed'));
  }
});

// Socket.IO rate limiting middleware
io.use((socket, next) => {
  const userId = socket.data.user?.id;
  if (!userId) {
    return next(new Error('User not authenticated'));
  }

  const now = Date.now();
  const userLimits = socketRateLimit.get(userId) || { count: 0, resetTime: now + SOCKET_RATE_LIMIT.windowMs };

  if (now > userLimits.resetTime) {
    userLimits.count = 0;
    userLimits.resetTime = now + SOCKET_RATE_LIMIT.windowMs;
  }

  if (userLimits.count >= SOCKET_RATE_LIMIT.maxEvents) {
    return next(new Error('Rate limit exceeded'));
  }

  userLimits.count++;
  socketRateLimit.set(userId, userLimits);
  next();
});

io.on('connection', (socket) => {
  const userId = socket.data.user.id;
  console.log(`User ${userId} connected`);

  // Join user's personal room for direct messages
  socket.join(`user_${userId}`);

  // Update user's online status
  const updateUserOnlineStatus = async (isOnline: boolean) => {
    try {
      const { User } = await import('./models/user.model.js');
      await User.findByIdAndUpdate(userId, {
        isOnline,
        lastSeen: isOnline ? new Date() : new Date(),
        lastActivityAt: new Date()
      });

      // Emit status change to all users who might be interested
      // (users who have conversations with this user)
      const { Conversation } = await import('./models/conversation.model.js');
      const conversations = await Conversation.find({ participants: userId });

      conversations.forEach((conversation: any) => {
        io.to(conversation._id).emit('userStatusChange', {
          userId,
          isOnline,
          lastSeen: new Date()
        });
      });
    } catch (error) {
      console.error('Error updating user online status:', error);
    }
  };

  // Set user as online when they connect
  updateUserOnlineStatus(true);

  // Add connection health monitoring
  const connectionHealthCheck = setInterval(() => {
    if (socket.connected) {
      // Send ping to check connection health
      socket.emit('ping');
    } else {
      clearInterval(connectionHealthCheck);
    }
  }, 30000); // Check every 30 seconds

  // Handle ping response
  socket.on('pong', () => {
    // Connection is healthy
    console.log(`User ${userId} connection health check passed`);
  });

  // Handle connection errors
  socket.on('error', (error) => {
    console.error(`Socket error for user ${userId}:`, error);
  });

  socket.on('joinConversations', async (conversationIds: string[]) => {
    console.log(`User ${userId} joining conversations:`, conversationIds);

    try {
      // Verify user has access to these conversations
      const { Conversation } = await import('./models/conversation.model.js');
      const conversations = await Conversation.find({
        _id: { $in: conversationIds },
        participants: userId
      });

      const validConversationIds = conversations.map((c: any) => c._id.toString());

      // Leave previous rooms first
      socket.rooms.forEach(room => {
        if (room !== socket.id && room !== `user_${userId}`) {
          socket.leave(room);
        }
      });

      // Join new conversation rooms
      validConversationIds.forEach((id: string) => socket.join(id));

      console.log(`User ${userId} joined valid conversations:`, validConversationIds);
    } catch (error) {
      console.error('Error joining conversations:', error);
      socket.emit('error', { message: 'Failed to join conversations' });
    }
  });

  socket.on('sendMessage', async (data) => {
    console.log(`User ${userId} sending message:`, data);
    const { conversationId, senderId, content, messageType, attachments, replyTo } = data;

    // Validate required fields
    if (!conversationId || !senderId || (messageType !== 'image' && !content)) {
      console.log('Missing required fields for message');
      socket.emit('messageError', { error: 'Missing required fields' });
      return;
    }
    if (messageType === 'image' && (!attachments || attachments.length === 0)) {
      socket.emit('messageError', { error: 'Image attachment required' });
      return;
    }

    // Verify sender is the authenticated user
    if (senderId !== userId) {
      console.log('User trying to send message as another user');
      socket.emit('messageError', { error: 'Cannot send message as another user' });
      return;
    }

    try {
      const { Message } = await import('./models/message.model.js');
      const { Conversation } = await import('./models/conversation.model.js');
      const { User } = await import('./models/user.model.js');

      // Verify user is part of the conversation
      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: senderId
      });

      if (!conversation) {
        socket.emit('messageError', { error: 'Conversation not found or access denied' });
        return;
      }

      // Check if any participants are blocked
      const otherParticipants = conversation.participants.filter((p: string) => p !== senderId);
      const blockChecks = await Promise.all(
        otherParticipants.map(async (participantId: string) => {
          const [userBlockedOther, otherBlockedUser] = await Promise.all([
            Block.findOne({ blockerId: senderId, blockedId: participantId }),
            Block.findOne({ blockerId: participantId, blockedId: senderId })
          ]);
          return { participantId, blocked: userBlockedOther || otherBlockedUser };
        })
      );

      const blockedParticipants = blockChecks.filter(check => check.blocked);
      if (blockedParticipants.length > 0) {
        socket.emit('messageError', { error: 'Cannot send message to blocked users' });
        return;
      }

      // Sanitize content only if present
      let sanitizedContent = '';
      if (content) {
        try {
          // Dynamic import for isomorphic-dompurify (ESM compatible)
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment

          const DOMPurifyModule = await import('isomorphic-dompurify');
          const DOMPurify = DOMPurifyModule.default || DOMPurifyModule;
          sanitizedContent = DOMPurify.sanitize(content.trim());
        } catch (error) {
          // Fallback to simple sanitization if DOMPurify fails
          console.warn('DOMPurify import failed, using simple sanitization:', error);
          sanitizedContent = content.trim()
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
        }
      }
      if (messageType !== 'image' && !sanitizedContent) {
        socket.emit('messageError', { error: 'Message content cannot be empty' });
        return;
      }

      const message = new Message({
        conversationId,
        senderId,
        content: sanitizedContent,
        messageType: messageType || 'text',
        attachments,
        replyTo
      });
      await message.save();
      console.log(`Message saved with ID: ${message._id}`);

      // Update conversation's last message and increment unread count for other participants
      const updateSet = {
        lastMessage: { content: sanitizedContent, senderId, timestamp: new Date() }
      };
      const updateInc: Record<string, number> = {};
      otherParticipants.forEach((participantId: string) => {
        updateInc[`unreadCount.${participantId}`] = 1;
      });
      await Conversation.findByIdAndUpdate(conversationId, {
        $set: updateSet,
        $inc: updateInc
      });

      // Get sender details from User model
      const sender = await User.findById(senderId);
      const messageWithSender = {
        ...message.toObject(),
        senderId_details: sender ? {
          username: sender.username,
          firstName: sender.firstName,
          lastName: sender.lastName,
          profileImageUrl: sender.profileImageUrl,
          isOnline: sender.isOnline,
          lastSeen: sender.lastSeen
        } : null
      };

      // Emit to all users in the conversation room
      io.to(conversationId).emit('newMessage', messageWithSender);

      // Emit delivery receipt
      io.to(conversationId).emit('messageDelivered', { messageId: message._id, userId });
      console.log(`Message emitted to conversation ${conversationId}`);
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('messageError', { error: 'Failed to send message' });
    }
  });

  socket.on('messageRead', async ({ conversationId, messageId }) => {
    console.log(`User ${userId} marked message ${messageId} as read in conversation ${conversationId}`);

    try {
      // Verify user is part of the conversation
      const { Conversation } = await import('./models/conversation.model.js');
      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: userId
      });

      if (!conversation) {
        console.log('User not part of conversation, ignoring read receipt');
        return;
      }

      // Mark message as read in database
      const { Message } = await import('./models/message.model.js');
      await Message.findByIdAndUpdate(messageId, {
        $addToSet: { readBy: userId }
      });

      io.to(conversationId).emit('messageRead', { messageId, userId });
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  });

  socket.on('typing', async ({ conversationId }) => {
    console.log(`User ${userId} typing in conversation ${conversationId}`);

    try {
      // Verify user is part of the conversation
      const { Conversation } = await import('./models/conversation.model.js');
      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: userId
      });

      if (!conversation) {
        console.log('User not part of conversation, ignoring typing indicator');
        return;
      }

      socket.to(conversationId).emit('typing', { userId });
    } catch (error) {
      console.error('Error handling typing indicator:', error);
    }
  });

  socket.on('stopTyping', async ({ conversationId }) => {
    console.log(`User ${userId} stopped typing in conversation ${conversationId}`);

    try {
      // Verify user is part of the conversation
      const { Conversation } = await import('./models/conversation.model.js');
      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: userId
      });

      if (!conversation) {
        console.log('User not part of conversation, ignoring stop typing indicator');
        return;
      }

      socket.to(conversationId).emit('stopTyping', { userId });
    } catch (error) {
      console.error('Error handling stop typing indicator:', error);
    }
  });

  // Handle block events
  socket.on('userBlocked', async ({ blockedUserId }) => {
    console.log(`User ${userId} blocked user ${blockedUserId}`);

    try {
      // Emit to the blocked user to update their UI
      io.to(`user_${blockedUserId}`).emit('userBlockedYou', {
        blockedBy: userId,
        timestamp: new Date()
      });

      // Emit to the blocker to confirm the action
      socket.emit('blockConfirmed', {
        blockedUserId,
        timestamp: new Date()
      });

      console.log(`Block event emitted for users ${userId} and ${blockedUserId}`);
    } catch (error) {
      console.error('Error handling block event:', error);
    }
  });

  socket.on('userUnblocked', async ({ unblockedUserId }) => {
    console.log(`User ${userId} unblocked user ${unblockedUserId}`);

    try {
      // Emit to the unblocked user to update their UI
      io.to(`user_${unblockedUserId}`).emit('userUnblockedYou', {
        unblockedBy: userId,
        timestamp: new Date()
      });

      // Emit to the unblocker to confirm the action
      socket.emit('unblockConfirmed', {
        unblockedUserId,
        timestamp: new Date()
      });

      console.log(`Unblock event emitted for users ${userId} and ${unblockedUserId}`);
    } catch (error) {
      console.error('Error handling unblock event:', error);
    }
  });

  // Comment-related Socket.IO events
  socket.on('joinPost', (postId) => {
    console.log(`User ${userId} joining post room: post_${postId}`);
    socket.join(`post_${postId}`);
  });

  socket.on('leavePost', (postId) => {
    console.log(`User ${userId} leaving post room: post_${postId}`);
    socket.leave(`post_${postId}`);
  });

  socket.on('joinUserRoom', (userId) => {
    if (userId) {
      socket.join(`user_${userId}`);
      console.log(`User ${userId} joined their personal room explicitly.`);
    }
  });

  // Live Streaming Events
  socket.on('joinStream', async (streamId: string) => {
    console.log(`User ${userId} joining stream: ${streamId}`);
    socket.join(`stream_${streamId}`);

    // Notify others in the stream that someone joined
    socket.to(`stream_${streamId}`).emit('userJoinedStream', {
      userId,
      timestamp: new Date()
    });

    // Update viewer count
    try {
      const { LiveStream } = await import('./models/liveStream.model.js');
      await LiveStream.findByIdAndUpdate(streamId, {
        $inc: { viewerCount: 1 }
      });

      // Broadcast updated viewer count
      const stream = await LiveStream.findById(streamId);
      if (stream) {
        io.to(`stream_${streamId}`).emit('viewerCountUpdate', {
          streamId,
          viewerCount: stream.viewerCount
        });
      }
    } catch (error) {
      console.error('Error updating viewer count:', error);
    }
  });

  socket.on('leaveStream', async (streamId: string) => {
    console.log(`User ${userId} leaving stream: ${streamId}`);
    socket.leave(`stream_${streamId}`);

    // Notify others in the stream that someone left
    socket.to(`stream_${streamId}`).emit('userLeftStream', {
      userId,
      timestamp: new Date()
    });

    // Update viewer count
    try {
      const { LiveStream } = await import('./models/liveStream.model.js');
      await LiveStream.findByIdAndUpdate(streamId, {
        $inc: { viewerCount: -1 }
      });

      // Broadcast updated viewer count
      const stream = await LiveStream.findById(streamId);
      if (stream) {
        io.to(`stream_${streamId}`).emit('viewerCountUpdate', {
          streamId,
          viewerCount: Math.max(0, stream.viewerCount)
        });
      }
    } catch (error) {
      console.error('Error updating viewer count:', error);
    }
  });

  socket.on('streamChatMessage', async (data: any) => {
    const { streamId, message } = data;

    if (!streamId || !message || typeof message !== 'string') {
      return;
    }

    if (message.trim().length === 0 || message.trim().length > 500) {
      return;
    }

    console.log(`User ${userId} sending chat message to stream ${streamId}`);

    try {
      // Get user data for chat message
      const { User } = await import('./models/user.model.js');
      const { StreamChatMessage } = await import('./models/streamChat.model.js');
      const user = await User.findById(userId);

      const chatMessage = {
        id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
        streamId,
        userId,
        username: user?.username || user?.firstName || 'Anonymous',
        message: message.trim(),
        timestamp: new Date(),
        avatar: user?.profileImageUrl
      };

      // Save message to database for persistence
      await StreamChatMessage.create({
        streamId,
        userId,
        username: chatMessage.username,
        message: message.trim(),
        avatar: user?.profileImageUrl,
        timestamp: new Date()
      });

      // Broadcast to all users in the stream
      io.to(`stream_${streamId}`).emit('chatMessage', chatMessage);

    } catch (error) {
      console.error('Error sending stream chat message:', error);
    }
  });

  socket.on('streamReaction', async (data: any) => {
    const { streamId, reaction } = data;

    if (!streamId || !reaction) {
      return;
    }

    console.log(`User ${userId} sent reaction ${reaction} to stream ${streamId}`);

    // Broadcast reaction to all users in the stream
    socket.to(`stream_${streamId}`).emit('streamReaction', {
      userId,
      reaction,
      timestamp: new Date()
    });
  });

  socket.on('disconnect', (reason) => {
    console.log(`User ${userId} disconnected: ${reason}`);

    // Clean up health check interval
    clearInterval(connectionHealthCheck);

    // Set user as offline when they disconnect
    updateUserOnlineStatus(false);

    // Clean up rate limiting
    socketRateLimit.delete(userId);
  });
});

export { io };

const startServer = async () => {
  await connectDB();

  // Initialize Better Auth after DB connection
  try {
    await initializeAuth();
    console.log('✅ Better Auth initialized');

    // CRITICAL: Mount Better Auth handler AFTER initialization
    // Better Auth needs to handle requests without JSON parsing
    // We need to insert it BEFORE express.json() middleware
    // Since Express middleware order matters, we'll use a workaround:
    // Remove express.json temporarily, mount auth handler, then re-add express.json
    const { getAuth } = await import('./auth');

    // Create a new router for routes that need JSON parsing
    const jsonRouter = express.Router();
    jsonRouter.use(express.json({ limit: '500mb' }));
    jsonRouter.use(express.urlencoded({ extended: true, limit: '500mb' }));

    const BETTER_AUTH_PROXY_ORIGIN =
      process.env.BETTER_AUTH_PROXY_ORIGIN ||
      process.env.FRONTEND_URL ||
      'http://localhost:3000';

    app.use((req, _res, next) => {
      if (req.path.startsWith('/api/auth')) {
        const originHeader = (req.headers.origin as string | undefined)?.trim();
        if (
          !originHeader ||
          !BETTER_AUTH_TRUSTED_ORIGINS.includes(originHeader)
        ) {
          req.headers.origin = BETTER_AUTH_PROXY_ORIGIN;
        }
      }
      next();
    });

    // Mount Better Auth handler BEFORE JSON middleware
    // Use a catch-all route for Better Auth
    app.use("/api/auth", toNodeHandler(getAuth()));
    console.log('✅ Better Auth handler mounted');

    // Mount JSON middleware for all other routes
    app.use((req, res, next) => {
      // Skip JSON parsing for Better Auth routes
      if (req.path.startsWith('/api/auth/')) {
        return next();
      }
      // Skip body parsing for multipart/form-data (FormData uploads)
      // Multer needs to handle these requests directly
      const contentType = req.headers['content-type'] || '';
      if (contentType.includes('multipart/form-data')) {
        return next();
      }
      return express.json({ limit: '500mb' })(req, res, next);
    });
    app.use((req, res, next) => {
      if (req.path.startsWith('/api/auth/')) {
        return next();
      }
      // Skip URL-encoded parsing for multipart/form-data (FormData uploads)
      const contentType = req.headers['content-type'] || '';
      if (contentType.includes('multipart/form-data')) {
        return next();
      }
      return express.urlencoded({ extended: true, limit: '500mb' })(req, res, next);
    });

    // Mount API routes after body parsers so JSON payloads are available
    app.use('/api/posts', postsRoute);
    app.use('/api/comments', commentsRoute);
    app.use('/api/blocks', blocksRoute);
    app.use('/api/notifications', notificationsRoute);
    app.use('/api/messages', messagesRoute);
    app.use('/api/protected', protectedRoute);
    app.use('/api/follows', followsRoute);
    app.use('/api/webhooks', webhooksRoute);
    app.use('/api/live-streams', liveStreamsRoute);
    app.use('/api/chat', chatRoute);
    app.use('/api/support', supportRoute);
    app.use('/api/reports', reportsRoute);
    app.use('/api/hashtags', hashtagsRoute);
    app.use('/api/otp', otpRoute);
    app.use('/api/style', styleRoute);
    app.use('/api/billing', billingRoute);
  } catch (error) {
    console.error('❌ Failed to initialize Better Auth:', error);
    process.exit(1);
  }

  // Initialize image filtering system
  try {
    await initializeImageFilter();
  } catch (error) {
    console.error('Failed to initialize image filtering system:', error);
    // Continue server startup even if image filtering fails
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();


















