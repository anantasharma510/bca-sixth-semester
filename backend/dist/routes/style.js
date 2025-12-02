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
import { body, validationResult } from 'express-validator';
import { Types } from 'mongoose';
import { requireAuth } from '../middleware/auth';
import { StyleProfile } from '../models/styleProfile.model';
import { runStyleGenerationWorkflow } from '../services/styleGenerationWorkflow.service';
import { Outfit } from '../models/outfit.model';
import { Product } from '../models/product.model';
const router = express.Router();
const asyncHandler = (handler) => {
    return (req, res, next) => {
        handler(req, res, next).catch(next);
    };
};
function getUserId(req) {
    const userId = req.userId;
    if (!userId) {
        throw new Error('User ID missing from request context');
    }
    return userId;
}
function profileIsComplete(profile) {
    return Boolean(profile.gender &&
        profile.age &&
        profile.heightCm &&
        profile.weightKg &&
        profile.locale &&
        profile.profileImageUrl);
}
router.get('/profile', requireAuth, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = getUserId(req);
        const profile = yield StyleProfile.findOne({ userId });
        res.json({
            success: true,
            data: profile,
        });
        return;
    }
    catch (error) {
        console.error('Failed to fetch style profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch style profile.',
        });
        return;
    }
})));
router.put('/profile', requireAuth, body('gender').optional().isString(), body('age').optional().isInt({ min: 10, max: 100 }), body('heightCm').optional().isFloat({ min: 50, max: 250 }), body('weightKg').optional().isFloat({ min: 20, max: 250 }), body('locale').optional().isString(), body('preferredUnits').optional().isIn(['metric', 'imperial']), body('profileImageUrl').optional().isString(), asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
    }
    try {
        const userId = getUserId(req);
        const payload = req.body;
        const update = Object.assign({}, payload);
        if (profileIsComplete(payload)) {
            update.completedAt = new Date();
        }
        const profile = yield StyleProfile.findOneAndUpdate({ userId }, { $set: update, $setOnInsert: { userId } }, { new: true, upsert: true });
        res.json({
            success: true,
            data: profile,
        });
        return;
    }
    catch (error) {
        console.error('Failed to upsert style profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save style profile.',
        });
        return;
    }
})));
router.post('/generate', requireAuth, body('preparing_for').isString().isLength({ min: 3 }), body('preferred_brand').isString(), body('budget').isString(), body('description').isString().isLength({ min: 3 }), asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
    }
    try {
        const userId = getUserId(req);
        const profile = yield StyleProfile.findOne({ userId });
        if (!profile || !profileIsComplete(profile)) {
            res.status(400).json({
                success: false,
                message: 'Complete your style profile before generating outfits.',
            });
            return;
        }
        const workflowResult = yield runStyleGenerationWorkflow({
            userId,
            form: req.body,
            profile,
        });
        res.json({
            success: true,
            message: 'Generation complete.',
            data: {
                outfitId: workflowResult.outfitId,
                generationId: workflowResult.generationId,
            },
        });
        return;
    }
    catch (error) {
        console.error('Generation failed:', error);
        res.status(500).json({
            success: false,
            message: (error === null || error === void 0 ? void 0 : error.message) || 'Failed to generate outfit.',
        });
        return;
    }
})));
router.get('/generate/:id', requireAuth, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = getUserId(req);
        const { id } = req.params;
        if (!Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: 'Invalid outfit id.' });
            return;
        }
        const outfit = yield Outfit.findById(id);
        if (!outfit) {
            res.status(404).json({ success: false, message: 'Outfit not found.' });
            return;
        }
        if (outfit.userId !== userId && !outfit.isPublic) {
            res.status(403).json({ success: false, message: 'Not authorized to view outfit.' });
            return;
        }
        res.json({
            success: true,
            data: outfit,
        });
        return;
    }
    catch (error) {
        console.error('Failed to fetch outfit:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch outfit.',
        });
        return;
    }
})));
router.get('/outfit/:id/products', requireAuth, asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = getUserId(req);
        const { id } = req.params;
        if (!Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: 'Invalid outfit id.' });
            return;
        }
        const outfit = yield Outfit.findById(id);
        if (!outfit) {
            res.status(404).json({ success: false, message: 'Outfit not found.' });
            return;
        }
        if (outfit.userId !== userId && !outfit.isPublic) {
            res.status(403).json({ success: false, message: 'Not authorized to view outfit.' });
            return;
        }
        const productIds = outfit.items.map((item) => item.productId).filter(Boolean);
        const products = yield Product.find({ _id: { $in: productIds } });
        res.json({
            success: true,
            data: {
                outfit,
                products,
            },
        });
        return;
    }
    catch (error) {
        console.error('Failed to fetch outfit products:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch outfit products.',
        });
        return;
    }
})));
router.post('/outfit/:id/share', requireAuth, body('isPublic').isBoolean(), asyncHandler((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
    }
    try {
        const userId = getUserId(req);
        const { id } = req.params;
        if (!Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: 'Invalid outfit id.' });
            return;
        }
        const outfit = yield Outfit.findById(id);
        if (!outfit) {
            res.status(404).json({ success: false, message: 'Outfit not found.' });
            return;
        }
        if (outfit.userId !== userId) {
            res.status(403).json({ success: false, message: 'Cannot update this outfit.' });
            return;
        }
        const isPublic = Boolean(req.body.isPublic);
        outfit.isPublic = isPublic;
        outfit.sharedAt = isPublic ? new Date() : undefined;
        yield outfit.save();
        res.json({
            success: true,
            data: outfit,
        });
        return;
    }
    catch (error) {
        console.error('Failed to update outfit share state:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update outfit share state.',
        });
        return;
    }
})));
export default router;
