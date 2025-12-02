// @ts-nocheck
import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { SupportTicket } from '../models/support.model';

const router = Router();

// Helper function for async route handlers
function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Sanitize input to prevent XSS attacks (simple version without external dependencies)
const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Create a new support ticket
router.post(
  '/',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
      const userId = (req as any).userId;
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
    const ticket = await SupportTicket.create({
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
  })
);

// Get user's support tickets
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
      const userId = (req as any).userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Get tickets for this user only
    const [tickets, total] = await Promise.all([
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
  })
);

// Get a specific support ticket
router.get(
  '/:ticketId',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
      const userId = (req as any).userId;
    const { ticketId } = req.params;

    const ticket = await SupportTicket.findById(ticketId).lean();

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
  })
);

// Update a support ticket (user can only update their own tickets and limited fields)
router.put(
  '/:ticketId',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
      const userId = (req as any).userId;
    const { ticketId } = req.params;
    const { message, status } = req.body;

    const ticket = await SupportTicket.findById(ticketId);

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
    const updates: any = {};

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

    const updatedTicket = await SupportTicket.findByIdAndUpdate(
      ticketId,
      updates,
      { new: true }
    ).lean();

    res.json({ 
      ticket: updatedTicket,
      message: 'Ticket updated successfully' 
    });
  })
);

export default router;

