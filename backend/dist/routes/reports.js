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
import { Report } from '../models/report.model';
import { Post } from '../models/post.model';
import { User } from '../models/user.model';
import { Comment } from '../models/comment.model';
const router = Router();
// Helper function to handle async routes
function asyncHandler(fn) {
    return function (req, res, next) {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
// Create a new report
router.post('/', requireAuth, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.userId;
    const { reportedEntityType, reportedEntityId, reason, description } = req.body;
    if (!reportedEntityType || !reportedEntityId || !reason) {
        return res.status(400).json({ error: 'Report type, entity ID, and reason are required.' });
    }
    // Prevent users from reporting their own content
    if (reportedEntityType === 'Post') {
        const post = yield Post.findById(reportedEntityId);
        if (post && post.author.toString() === userId) {
            return res.status(403).json({ error: 'You cannot report your own post.' });
        }
    }
    else if (reportedEntityType === 'User') {
        if (reportedEntityId === userId) {
            return res.status(403).json({ error: 'You cannot report yourself.' });
        }
    }
    else if (reportedEntityType === 'Comment') {
        const comment = yield Comment.findById(reportedEntityId);
        if (comment && comment.author.toString() === userId) {
            return res.status(403).json({ error: 'You cannot report your own comment.' });
        }
    }
    // Check if the reported entity exists
    let entityExists = false;
    if (reportedEntityType === 'Post') {
        entityExists = !!(yield Post.findById(reportedEntityId));
    }
    else if (reportedEntityType === 'User') {
        entityExists = !!(yield User.findById(reportedEntityId));
    }
    else if (reportedEntityType === 'Comment') {
        entityExists = !!(yield Comment.findById(reportedEntityId));
    }
    if (!entityExists) {
        return res.status(404).json({ error: `${reportedEntityType} not found.` });
    }
    // Check for duplicate report by the same user on the same entity
    const existingReport = yield Report.findOne({
        reporterId: userId,
        reportedEntityId: reportedEntityId,
    });
    if (existingReport) {
        return res.status(409).json({ error: 'You have already reported this content.' });
    }
    const report = yield Report.create({
        reporterId: userId,
        reportedEntityType,
        reportedEntityId,
        reason,
        description,
        status: 'pending',
        priority: 'medium', // Default priority
    });
    // Notify admins about the new report
    console.log(`🚨 New report created by ${userId} for ${reportedEntityType} ${reportedEntityId}`);
    res.status(201).json({ message: 'Report submitted successfully.', reportId: report._id });
})));
// Get reports (admin only)
router.get('/', requireAdmin, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const priority = req.query.priority;
    const reason = req.query.reason;
    const skip = (page - 1) * limit;
    // Build filter object
    const filter = {};
    if (status)
        filter.status = status;
    if (priority)
        filter.priority = priority;
    if (reason)
        filter.reason = reason;
    // Get reports with pagination
    const reports = yield Report.find(filter)
        .sort({
        // Sort by creation date (newest first)
        createdAt: -1
    })
        .skip(skip)
        .limit(limit)
        .lean();
    // Get total count for pagination
    const totalReports = yield Report.countDocuments(filter);
    // Get stats
    const stats = yield Report.aggregate([
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                underReview: { $sum: { $cond: [{ $eq: ['$status', 'under_review'] }, 1, 0] } },
                resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
                dismissed: { $sum: { $cond: [{ $eq: ['$status', 'dismissed'] }, 1, 0] } },
                urgent: { $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] } }
            }
        }
    ]);
    const reportStats = stats[0] || {
        total: 0, pending: 0, underReview: 0, resolved: 0, dismissed: 0, urgent: 0
    };
    res.json({
        reports,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalReports / limit),
            totalReports,
            hasNextPage: page * limit < totalReports,
            hasPrevPage: page > 1
        },
        stats: reportStats
    });
})));
// Get a specific report (admin only)
router.get('/:reportId', requireAdmin, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { reportId } = req.params;
    const report = yield Report.findById(reportId).lean();
    if (!report) {
        return res.status(404).json({ error: 'Report not found' });
    }
    res.json({ report });
})));
// Update report status (admin only)
router.put('/:reportId', requireAdmin, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.userId;
    const { reportId } = req.params;
    const { status, priority, adminNotes } = req.body;
    const report = yield Report.findById(reportId);
    if (!report) {
        return res.status(404).json({ error: 'Report not found' });
    }
    // Update fields
    const updateFields = { adminNotes };
    if (status) {
        updateFields.status = status;
        if (status === 'resolved' || status === 'dismissed') {
            updateFields.resolvedAt = new Date();
            updateFields.resolvedBy = userId;
        }
        else {
            updateFields.resolvedAt = null;
            updateFields.resolvedBy = null;
        }
    }
    if (priority) {
        updateFields.priority = priority;
    }
    const updatedReport = yield Report.findByIdAndUpdate(reportId, { $set: updateFields }, { new: true, runValidators: true });
    console.log(`📝 Report ${reportId} updated by admin ${userId}: status=${status}, priority=${priority}`);
    res.json({
        report: updatedReport,
        message: 'Report updated successfully'
    });
})));
// Delete report (admin only)
router.delete('/:reportId', requireAdmin, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { reportId } = req.params;
    const report = yield Report.findByIdAndDelete(reportId);
    if (!report) {
        return res.status(404).json({ error: 'Report not found' });
    }
    console.log(`📝 Report ${reportId} deleted by admin`);
    res.json({ message: 'Report deleted successfully' });
})));
// Get user's own reports
router.get('/my-reports', requireAuth, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const reports = yield Report.find({ reporterId: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    const totalReports = yield Report.countDocuments({ reporterId: userId });
    res.json({
        reports,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalReports / limit),
            totalReports,
            hasNextPage: page * limit < totalReports,
            hasPrevPage: page > 1
        }
    });
})));
export default router;
