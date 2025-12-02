// @ts-nocheck
import { Request, Response, NextFunction, Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { LiveStream } from '../models/liveStream.model';
import { User } from '../models/user.model';
import { Block } from '../models/block.model';
import { generateAgoraToken, generateChannelName, generateRandomUid } from '../utils/agoraToken';
import { uploadToCloudinary } from '../utils/cloudinary';
import { upload } from '../middleware/multer';
import { io } from '../index';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Helper function for async route handlers
function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return function (req: Request, res: Response, next: NextFunction): void {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Create a new live stream
router.post(
  '/',
  requireAuth,
  upload.single('thumbnail'),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { title, description, isPrivate, category, tags, scheduledAt } = req.body;

      if (!title || title.trim().length === 0) {
        return res.status(400).json({ error: 'Title is required' });
      }

      // Generate unique stream ID
      const streamId = uuidv4();

      // Generate Agora channel name and UID
      const channelName = generateChannelName(userId);
      const agoraUid = generateRandomUid();

      // Generate Agora token for the host (publisher role)
      const agoraToken = generateAgoraToken({
        channelName,
        uid: agoraUid,
        role: 'publisher',
        expirationTimeInSeconds: 3600 // 1 hour
      });

      // Upload thumbnail if provided
      let thumbnailUrl: string | undefined;
      if (req.file) {
        try {
          const uploadResult = await uploadToCloudinary(req.file.path, 'livestream-thumbnails');
          thumbnailUrl = uploadResult.secure_url;
        } catch (uploadError) {
          console.error('Error uploading thumbnail:', uploadError);
          // Continue without thumbnail if upload fails
        }
      }

      // Parse tags if provided as string
      const parsedTags = tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : [];

      // Create the live stream
      const liveStream = await LiveStream.create({
        _id: streamId,
        hostId: userId,
        title: title.trim(),
        description: description?.trim(),
        thumbnailUrl,
        status: scheduledAt ? 'scheduled' : 'scheduled', // Start as scheduled, will change to 'live' when started
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        agoraChannelName: channelName,
        agoraToken,
        agoraUid,
        viewerCount: 0,
        maxViewers: 1000,
        isPrivate: isPrivate === 'true' || isPrivate === true,
        tags: parsedTags,
        category: category?.trim()
      });

      // Emit socket event for new stream
      if (io) {
        io.emit('new-live-stream', {
          streamId: liveStream._id,
          title: liveStream.title,
          hostId: liveStream.hostId
        });
      }

      res.status(201).json({
        message: 'Live stream created successfully',
        liveStream: {
          _id: liveStream._id,
          hostId: liveStream.hostId,
          title: liveStream.title,
          description: liveStream.description,
          thumbnailUrl: liveStream.thumbnailUrl,
          status: liveStream.status,
          agoraChannelName: liveStream.agoraChannelName,
          agoraToken: liveStream.agoraToken,
          agoraUid: liveStream.agoraUid,
          viewerCount: liveStream.viewerCount,
          scheduledAt: liveStream.scheduledAt,
          createdAt: liveStream.createdAt
        }
      });
    } catch (error: any) {
      console.error('Error creating live stream:', error);
      res.status(500).json({ 
        error: 'Failed to create live stream',
        message: error.message 
      });
    }
  })
);

// Get all live streams
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 20, status = 'live' } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const query: any = {};
      if (status && status !== 'all') {
        query.status = status;
      }

      const streams = await LiveStream.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('hostId', 'username firstName lastName profileImageUrl')
        .lean();

      // Ensure all hostIds are properly populated
      const { User } = await import('../models/user.model.js');
      for (const stream of streams) {
        if (typeof stream.hostId === 'string' || !stream.hostId || (typeof stream.hostId === 'object' && !stream.hostId.username)) {
          const hostIdToFind = typeof stream.hostId === 'string' ? stream.hostId : (stream.hostId?._id || stream.hostId);
          const hostUser = await User.findById(hostIdToFind).lean();
          if (hostUser) {
            stream.hostId = {
              _id: hostUser._id,
              username: hostUser.username,
              firstName: hostUser.firstName,
              lastName: hostUser.lastName,
              profileImageUrl: hostUser.profileImageUrl
            };
          }
        }
      }

      const total = await LiveStream.countDocuments(query);

      res.json({
        streams,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error: any) {
      console.error('Error fetching live streams:', error);
      res.status(500).json({ error: 'Failed to fetch live streams' });
    }
  })
);

// Get streams for a specific user (MUST come before /:streamId route)
router.get(
  '/user/:userId',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20, status } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const query: any = { hostId: userId };
      if (status && status !== 'all') {
        query.status = status;
      }

      const userStreams = await LiveStream.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('hostId', 'username firstName lastName profileImageUrl')
        .lean();

      const total = await LiveStream.countDocuments(query);

      res.json({
        streams: userStreams,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error: any) {
      console.error('Error fetching user streams:', error);
      res.status(500).json({ error: 'Failed to fetch user streams' });
    }
  })
);

// Get a specific live stream
router.get(
  '/:streamId',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { streamId } = req.params;
      const userId = (req as any).userId; // May be undefined for public access

      const stream = await LiveStream.findById(streamId)
        .populate('hostId', 'username firstName lastName profileImageUrl')
        .lean();

      if (!stream) {
        return res.status(404).json({ error: 'Live stream not found' });
      }

      // Debug: Check if hostId was populated correctly
      console.log('📺 Stream hostId debug:', {
        streamId: stream._id,
        hostIdType: typeof stream.hostId,
        hostIdIsObject: typeof stream.hostId === 'object' && stream.hostId !== null,
        hostIdValue: typeof stream.hostId === 'object' ? {
          _id: stream.hostId._id,
          username: stream.hostId.username,
          firstName: stream.hostId.firstName,
          lastName: stream.hostId.lastName
        } : stream.hostId
      });

      // If hostId is not populated (still a string), try to populate it manually
      if (typeof stream.hostId === 'string' || !stream.hostId || (typeof stream.hostId === 'object' && !stream.hostId.username)) {
        console.warn('⚠️ hostId not populated, fetching user manually');
        const { User } = await import('../models/user.model.js');
        const hostIdToFind = typeof stream.hostId === 'string' ? stream.hostId : (stream.hostId?._id || stream.hostId);
        const hostUser = await User.findById(hostIdToFind).lean();
        if (hostUser) {
          stream.hostId = {
            _id: hostUser._id,
            username: hostUser.username,
            firstName: hostUser.firstName,
            lastName: hostUser.lastName,
            profileImageUrl: hostUser.profileImageUrl
          };
        } else {
          console.error('❌ Host user not found for stream:', stream._id, 'hostId:', hostIdToFind);
        }
      }

      // Check if stream is private and user is not the host
      const hostIdString = typeof stream.hostId === 'object' ? stream.hostId._id : stream.hostId;
      if (stream.isPrivate && hostIdString !== userId) {
        // Check if user is in allowed viewers list
        if (!stream.allowedViewers?.includes(userId)) {
          return res.status(403).json({ error: 'This stream is private' });
        }
      }

      console.log('📺 Returning stream:', {
        streamId: stream._id,
        title: stream.title,
        status: stream.status,
        hasToken: !!stream.agoraToken,
        hasChannel: !!stream.agoraChannelName,
        hostUsername: typeof stream.hostId === 'object' ? stream.hostId.username : 'N/A'
      });
      res.json({ stream });
    } catch (error: any) {
      console.error('Error fetching live stream:', error);
      res.status(500).json({ error: 'Failed to fetch live stream' });
    }
  })
);

// Get chat messages for a stream
router.get(
  '/:streamId/chat',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { streamId } = req.params;
      const { limit = 50 } = req.query;

      const { StreamChatMessage } = await import('../models/streamChat.model.js');
      const messages = await StreamChatMessage.find({ streamId })
        .sort({ timestamp: -1 })
        .limit(Number(limit))
        .lean();

      res.json({ messages: messages.reverse() }); // Reverse to show oldest first
    } catch (error: any) {
      console.error('Error fetching chat messages:', error);
      res.status(500).json({ error: 'Failed to fetch chat messages' });
    }
  })
);

// Join a live stream (get viewer token)
router.post(
  '/:streamId/join',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { streamId } = req.params;
      const userId = (req as any).userId;

      const stream = await LiveStream.findById(streamId);
      if (!stream) {
        return res.status(404).json({ error: 'Live stream not found' });
      }

      // Check if stream is private
      if (stream.isPrivate && stream.hostId.toString() !== userId) {
        if (!stream.allowedViewers?.includes(userId)) {
          return res.status(403).json({ error: 'This stream is private' });
        }
      }

      // Generate viewer-specific UID and token
      const viewerUid = generateRandomUid();
      const viewerToken = generateAgoraToken({
        channelName: stream.agoraChannelName,
        uid: viewerUid,
        role: 'subscriber',
        expirationTimeInSeconds: 3600
      });

      // Increment viewer count
      stream.viewerCount += 1;
      await stream.save();

      // Emit socket event
      if (io) {
        io.emit('viewer-joined', {
          streamId: stream._id,
          viewerCount: stream.viewerCount
        });
      }

      res.json({
        token: viewerToken,
        uid: viewerUid,
        channelName: stream.agoraChannelName,
        appId: process.env.AGORA_APP_ID
      });
    } catch (error: any) {
      console.error('Error joining live stream:', error);
      res.status(500).json({ error: 'Failed to join live stream' });
    }
  })
);

// End a live stream
router.post(
  '/:streamId/end',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { streamId } = req.params;
      const userId = (req as any).userId;

      const stream = await LiveStream.findById(streamId);
      if (!stream) {
        return res.status(404).json({ error: 'Live stream not found' });
      }

      // Check if user is the host
      if (stream.hostId.toString() !== userId) {
        return res.status(403).json({ error: 'Only the host can end the stream' });
      }

      stream.status = 'ended';
      stream.endedAt = new Date();
      if (stream.startedAt) {
        stream.duration = Math.floor((stream.endedAt.getTime() - stream.startedAt.getTime()) / 1000);
      }
      await stream.save();

      // Emit socket event
      if (io) {
        io.emit('stream-ended', {
          streamId: stream._id
        });
      }

      res.json({ message: 'Stream ended successfully', stream });
    } catch (error: any) {
      console.error('Error ending live stream:', error);
      res.status(500).json({ error: 'Failed to end live stream' });
    }
  })
);


// Update a live stream
router.patch(
  '/:streamId',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { streamId } = req.params;
      const userId = (req as any).userId;
      const { title, description, status, scheduledAt } = req.body;

      const stream = await LiveStream.findById(streamId);
      if (!stream) {
        return res.status(404).json({ error: 'Live stream not found' });
      }

      // Check if user is the host
      if (stream.hostId.toString() !== userId) {
        return res.status(403).json({ error: 'Only the host can update the stream' });
      }

      // Update fields
      if (title !== undefined) stream.title = title;
      if (description !== undefined) stream.description = description;
      if (status !== undefined) stream.status = status;
      if (scheduledAt !== undefined) stream.scheduledAt = new Date(scheduledAt);
      
      // If status is changing to 'live', set startedAt
      if (status === 'live' && !stream.startedAt) {
        stream.startedAt = new Date();
      }

      await stream.save();

      // Emit socket event
      if (io) {
        io.emit('stream-updated', {
          streamId: stream._id,
          stream
        });
      }

      res.json({ message: 'Stream updated successfully', liveStream: stream });
    } catch (error: any) {
      console.error('Error updating live stream:', error);
      res.status(500).json({ error: 'Failed to update live stream' });
    }
  })
);

// Delete a live stream
router.delete(
  '/:streamId',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { streamId } = req.params;
      const userId = (req as any).userId;

      const stream = await LiveStream.findById(streamId);
      if (!stream) {
        return res.status(404).json({ error: 'Live stream not found' });
      }

      // Check if user is the host
      if (stream.hostId.toString() !== userId) {
        return res.status(403).json({ error: 'Only the host can delete the stream' });
      }

      await LiveStream.findByIdAndDelete(streamId);

      // Emit socket event
      if (io) {
        io.emit('stream-deleted', {
          streamId: stream._id
        });
      }

      res.json({ message: 'Stream deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting live stream:', error);
      res.status(500).json({ error: 'Failed to delete live stream' });
    }
  })
);

export default router;
