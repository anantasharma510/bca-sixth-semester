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
import { requireAuth } from '../middleware/auth';
import { io } from '../index';
const router = Router();
// Helper function for async route handlers
function asyncHandler(fn) {
    return function (req, res, next) {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
// Send chat message to live stream
router.post('/live-stream/:streamId/message', requireAuth, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { streamId } = req.params;
        const { message } = req.body;
        const clerkUser = ((_a = req.auth) === null || _a === void 0 ? void 0 : _a.userId) ? { sub: req.auth.userId } : null;
        if (!clerkUser) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({ error: 'Message is required' });
        }
        if (message.trim().length > 500) {
            return res.status(400).json({ error: 'Message too long (max 500 characters)' });
        }
        // Get user data (simplified for now)
        const chatMessage = {
            id: Date.now().toString(),
            streamId,
            userId: userId,
            username: 'User', // Should fetch from database
            message: message.trim(),
            timestamp: new Date(),
            avatar: null // Should fetch from database
        };
        // Emit to all users in the stream room
        io.to(`stream_${streamId}`).emit('chatMessage', chatMessage);
        res.json({
            success: true,
            message: 'Message sent successfully',
            chatMessage
        });
    }
    catch (error) {
        console.error('❌ Error sending chat message:', error);
        res.status(500).json({
            error: 'Failed to send message',
            details: error.message
        });
    }
})));
// Join live stream chat room
router.post('/live-stream/:streamId/join', requireAuth, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { streamId } = req.params;
        const clerkUser = ((_a = req.auth) === null || _a === void 0 ? void 0 : _a.userId) ? { sub: req.auth.userId } : null;
        if (!clerkUser) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        // Note: Socket.IO room joining will be handled on the frontend socket connection
        res.json({
            success: true,
            message: 'Ready to join chat',
            room: `stream_${streamId}`
        });
    }
    catch (error) {
        console.error('❌ Error joining chat:', error);
        res.status(500).json({
            error: 'Failed to join chat',
            details: error.message
        });
    }
})));
export default router;
