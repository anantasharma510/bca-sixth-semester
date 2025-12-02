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
import { SupportTicket } from '../models/support.model';
const router = Router();
// Helper function for async route handlers
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
// Sanitize input to prevent XSS attacks (simple version without external dependencies)
const sanitizeInput = (input) => {
    return input
        .trim()
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
};
// Create a new support ticket
router.post('/', requireAuth, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.userId;
    const { subject, message, category, priority } = req.body;
    // Validation
    if (!subject || subject.trim().length === 0) {
        res.status(400).json({ error: 'Subject is required' });
        return;
    }
    if (!message || message.trim().length === 0) {
        res.status(400).json({ error: 'Message is required' });
        return;
    }
    if (subject.length > 200) {
        res.status(400).json({ error: 'Subject cannot exceed 200 characters' });
        return;
    }
    if (message.length > 5000) {
        res.status(400).json({ error: 'Message cannot exceed 5000 characters' });
        return;
    }
    // Validate category
    const validCategories = ['bug', 'feature', 'account', 'billing', 'other'];
    if (category && !validCategories.includes(category)) {
        res.status(400).json({ error: 'Invalid category' });
        return;
    }
    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (priority && !validPriorities.includes(priority)) {
        res.status(400).json({ error: 'Invalid priority' });
        return;
    }
    // Create support ticket
    const ticket = yield SupportTicket.create({
        userId: userId,
        subject: sanitizeInput(subject),
        message: sanitizeInput(message),
        category: category || 'other',
        priority: priority || 'medium',
        status: 'open',
    });
    console.log(`✅ Support ticket created: ${ticket._id} by user ${userId}`);
    res.status(201).json({
        ticket,
        message: 'Support ticket created successfully'
    });
})));
// Get user's support tickets
router.get('/', requireAuth, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    // Get tickets for this user only
    const [tickets, total] = yield Promise.all([
        SupportTicket.find({ userId: userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        SupportTicket.countDocuments({ userId: userId }),
    ]);
    res.json({
        tickets,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalTickets: total,
            limit,
        },
    });
})));
// Get a specific support ticket
router.get('/:ticketId', requireAuth, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.userId;
    const { ticketId } = req.params;
    const ticket = yield SupportTicket.findById(ticketId).lean();
    if (!ticket) {
        res.status(404).json({ error: 'Support ticket not found' });
        return;
    }
    // Ensure user can only access their own tickets
    if (ticket.userId !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
    }
    res.json({ ticket });
})));
// Update a support ticket (user can only update their own tickets and limited fields)
router.put('/:ticketId', requireAuth, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.userId;
    const { ticketId } = req.params;
    const { message, status } = req.body;
    const ticket = yield SupportTicket.findById(ticketId);
    if (!ticket) {
        res.status(404).json({ error: 'Support ticket not found' });
        return;
    }
    // Ensure user can only update their own tickets
    if (ticket.userId !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
    }
    // Users can only add additional messages or close their tickets
    const updates = {};
    if (message && message.trim().length > 0) {
        if (message.length > 5000) {
            res.status(400).json({ error: 'Message cannot exceed 5000 characters' });
            return;
        }
        // Append new message to existing message
        updates.message = `${ticket.message}\n\n--- User Update ---\n${sanitizeInput(message)}`;
    }
    // Users can only close their own tickets
    if (status && status === 'closed') {
        updates.status = 'closed';
    }
    if (Object.keys(updates).length === 0) {
        res.status(400).json({ error: 'No valid updates provided' });
        return;
    }
    const updatedTicket = yield SupportTicket.findByIdAndUpdate(ticketId, updates, { new: true }).lean();
    res.json({
        ticket: updatedTicket,
        message: 'Ticket updated successfully'
    });
})));
export default router;
