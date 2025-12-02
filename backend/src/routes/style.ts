// @ts-nocheck
import express, { NextFunction, Request, RequestHandler, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Types } from 'mongoose';
import { requireAuth } from '../middleware/auth';
import { StyleProfile } from '../models/styleProfile.model';
import { runStyleGenerationWorkflow } from '../services/styleGenerationWorkflow.service';
import { Outfit } from '../models/outfit.model';
import { Product } from '../models/product.model';
import { Wishlist } from '../models/wishlist.model';
import { Post } from '../models/post.model';
import { User } from '../models/user.model';
import { AiUsage } from '../models/aiUsage.model';
import { AiConfig } from '../models/aiConfig.model';
import { Subscription } from '../models/subscription.model';
import { io } from '../index';

const router = express.Router();

type AuthedRequest = Request & { userId?: string };
type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

const asyncHandler = (handler: AsyncHandler): RequestHandler => {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
};

function getUserId(req: AuthedRequest): string {
  const userId = req.userId;
  if (!userId) {
    throw new Error('User ID missing from request context');
  }
  return userId;
}

function profileIsComplete(profile: {
  gender?: string;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  locale?: string;
  profileImageUrl?: string;
}): boolean {
  return Boolean(
    profile.gender &&
    profile.age &&
    profile.heightCm &&
    profile.weightKg &&
    profile.locale
  );
}

function getCurrentPeriodStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
}

async function getAiConfig(): Promise<import('../models/aiConfig.model').IAiConfig> {
  let cfg = await AiConfig.findOne();
  if (!cfg) {
    cfg = await AiConfig.create({ freeMonthlyOutfits: 3, plans: [] });
  }
  return cfg;
}

async function getUserSubscription(userId: string) {
  const sub = await Subscription.findOne({
    userId,
    status: 'active',
  });
  return sub || null;
}

router.get(
  '/profile',
  requireAuth,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserId(req as AuthedRequest);
      const profile = await StyleProfile.findOne({ userId });
      res.json({
        success: true,
        data: profile,
      });
      return;
    } catch (error: any) {
      console.error('Failed to fetch style profile:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch style profile.',
      });
      return;
    }
  })
);

router.put(
  '/profile',
  requireAuth,
  body('gender').optional().isString(),
  // Accept age/height/weight as numbers or numeric strings, and treat null as "not provided"
  body('age').optional({ nullable: true }).isInt({ min: 10, max: 100 }).toInt(),
  body('heightCm').optional({ nullable: true }).isFloat({ min: 50, max: 250 }).toFloat(),
  body('weightKg').optional({ nullable: true }).isFloat({ min: 20, max: 250 }).toFloat(),
  body('locale').optional().isString(),
  body('preferredUnits').optional().isIn(['metric', 'imperial']),
  body('profileImageUrl').optional().isString(),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    try {
      const userId = getUserId(req as AuthedRequest);
      const payload = req.body;
      const update = {
        ...payload,
      };
      if (profileIsComplete(payload)) {
        update.completedAt = new Date();
      }
      const profile = await StyleProfile.findOneAndUpdate(
        { userId },
        { $set: update, $setOnInsert: { userId } },
        { new: true, upsert: true }
      );

      res.json({
        success: true,
        data: profile,
      });
      return;
    } catch (error: any) {
      console.error('Failed to upsert style profile:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save style profile.',
      });
      return;
    }
  })
);

router.post(
  '/generate',
  requireAuth,
  body('preparing_for').isString().isLength({ min: 3 }),
  body('preferred_brand').isString(),
  body('budget').isString(),
  body('description').isString().isLength({ min: 3 }),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    try {
      const userId = getUserId(req as AuthedRequest);

      // --- AI usage limiting ---
      const periodStart = getCurrentPeriodStart();
      const [config, subscription] = await Promise.all([
        getAiConfig(),
        getUserSubscription(userId),
      ]);

      const freeLimit = config.freeMonthlyOutfits ?? 3;
      const subscribedLimit =
        subscription && subscription.monthlyOutfitLimit != null
          ? subscription.monthlyOutfitLimit
          : null; // null here means "no explicit limit on the subscription itself"

      // If user has an active subscription and its monthlyOutfitLimit is null,
      // treat it as unlimited. Otherwise, fall back to either the subscription
      // limit (if present) or the free tier limit.
      const hasActiveSubscription = !!subscription && subscription.status === 'active';
      const isUnlimited = hasActiveSubscription && subscribedLimit === null;

      const effectiveLimit = subscribedLimit !== null ? subscribedLimit : freeLimit;

      let usage = await AiUsage.findOne({ userId, periodStart });
      if (!usage) {
        usage = await AiUsage.create({
          userId,
          periodStart,
          outfitGenerationsUsed: 0,
        });
      }

      if (!isUnlimited && usage.outfitGenerationsUsed >= effectiveLimit) {
        res.status(400).json({
          success: false,
          message:
            subscribedLimit !== null
              ? `You have used all ${effectiveLimit} AI outfits in your plan for this period.`
              : `You have used all ${effectiveLimit} free AI outfits for this month. Subscribe to generate more.`,
        });
        return;
      }
      // --- end AI usage limiting ---
      const profile = await StyleProfile.findOne({ userId });
      if (!profile || !profileIsComplete(profile)) {
        res.status(400).json({
          success: false,
          message: 'Complete your style profile before generating outfits.',
        });
        return;
      }

      const workflowResult = await runStyleGenerationWorkflow({
        userId,
        form: req.body,
        profile,
      });

      // If no outfit was created (e.g. no products could be scraped), treat this
      // as a client-visible error instead of returning a "successful" response
      // with undefined IDs that can break mobile clients.
      if (!workflowResult.outfitId) {
        res.status(400).json({
          success: false,
          message: 'Could not create an outfit for the generated plan. Try adjusting your budget or brands.',
        });
        return;
      }

      // Increment usage only on successful outfit creation
      await AiUsage.updateOne(
        { userId, periodStart },
        { $inc: { outfitGenerationsUsed: 1 } }
      );

      res.json({
        success: true,
        message: 'Generation complete.',
        data: {
          outfitId: workflowResult.outfitId,
          generationId: workflowResult.generationId,
        },
      });
      return;
    } catch (error: any) {
      console.error('Generation failed:', error);
      res.status(500).json({
        success: false,
        message: error?.message || 'Failed to generate outfit.',
      });
      return;
    }
  })
);

router.get(
  '/generate/:id',
  requireAuth,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserId(req as AuthedRequest);
      const { id } = req.params;
      if (!Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid outfit id.' });
        return;
      }

      const outfit = await Outfit.findById(id);
      if (!outfit) {
        res.status(404).json({ success: false, message: 'Outfit not found.' });
        return;
      }

      if (outfit.userId !== userId && !outfit.isPublic) {
        res.status(403).json({ success: false, message: 'Not authorized to view outfit.' });
        return;
      }

      const saved = await Wishlist.exists({ userId, outfitId: outfit._id });

      res.json({
        success: true,
        data: {
          ...outfit.toObject(),
          isSaved: Boolean(saved),
        },
      });
      return;
    } catch (error: any) {
      console.error('Failed to fetch outfit:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch outfit.',
      });
      return;
    }
  })
);

router.get(
  '/outfit/:id/products',
  requireAuth,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserId(req as AuthedRequest);
      const { id } = req.params;
      if (!Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid outfit id.' });
        return;
      }

      const outfit = await Outfit.findById(id);
      if (!outfit) {
        res.status(404).json({ success: false, message: 'Outfit not found.' });
        return;
      }

      if (outfit.userId !== userId && !outfit.isPublic) {
        res.status(403).json({ success: false, message: 'Not authorized to view outfit.' });
        return;
      }

      const productIds = outfit.items.map((item) => item.productId).filter(Boolean);
      const products = await Product.find({ _id: { $in: productIds } });

      const saved = await Wishlist.exists({ userId, outfitId: outfit._id });

      res.json({
        success: true,
        data: {
          outfit: {
            ...outfit.toObject(),
            isSaved: Boolean(saved),
          },
          products,
        },
      });
      return;
    } catch (error: any) {
      console.error('Failed to fetch outfit products:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch outfit products.',
      });
      return;
    }
  })
);

// Get current user's outfit history (paginated)
router.get(
  '/outfits',
  requireAuth,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserId(req as AuthedRequest);
      const page = parseInt((req.query.page as string) || '1', 10) || 1;
      const limit = parseInt((req.query.limit as string) || '10', 10) || 10;
      const skip = (page - 1) * limit;

      const [total, outfits] = await Promise.all([
        Outfit.countDocuments({ userId }),
        Outfit.find({ userId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
      ]);

      res.json({
        success: true,
        data: {
          outfits,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalOutfits: total,
            hasNextPage: page * limit < total,
            hasPrevPage: page > 1,
          },
        },
      });
      return;
    } catch (error: any) {
      console.error('Failed to fetch outfit history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch outfit history.',
      });
      return;
    }
  })
);

router.post(
  '/outfit/:id/share',
  requireAuth,
  body('isPublic').isBoolean(),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    try {
      const userId = getUserId(req as AuthedRequest);
      const { id } = req.params;
      if (!Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid outfit id.' });
        return;
      }

      const outfit = await Outfit.findById(id);
      if (!outfit) {
        res.status(404).json({ success: false, message: 'Outfit not found.' });
        return;
      }

      if (outfit.userId !== userId) {
        res.status(403).json({ success: false, message: 'Cannot update this outfit.' });
        return;
      }

      const isPublic = Boolean(req.body.isPublic);
      const wasPublic = outfit.isPublic;

      outfit.isPublic = isPublic;
      outfit.sharedAt = isPublic ? new Date() : undefined;

      // When public, ensure there is a corresponding feed post so the outfit
      // appears in the main feed with real-time updates. This is idempotent:
      // if a post already exists for this outfit+user, we don't create another.
      if (isPublic) {
        const existingPost = await Post.findOne({
          author: userId,
          outfitId: outfit._id,
          isOutfitPost: true,
        });

        if (!existingPost) {
          console.log(
            'Creating new outfit post for shared outfit',
            outfit._id,
            'by user',
            userId
          );

        // Ensure banner image exists – fall back to first product's main image if needed
        if (!outfit.bannerImageUrl && outfit.items?.length) {
          const firstItem = outfit.items[0];
          if (firstItem?.productId) {
            const firstProduct = await Product.findById(firstItem.productId);
            if (firstProduct?.mainImageUrl) {
              outfit.bannerImageUrl = firstProduct.mainImageUrl;
            }
          }
        }

          const media: any[] = [];
          if (outfit.bannerImageUrl) {
            media.push({
              type: 'image',
              url: outfit.bannerImageUrl,
              thumbnailUrl: outfit.bannerImageUrl,
            });
          }

          const content =
            (outfit.description && outfit.description.trim()) ||
            'Shared an AI generated outfit';

          const post = await Post.create({
            author: userId,
            content,
            media: media.length ? media : undefined,
            hashtags: [],
            mentions: [],
            isOutfitPost: true,
            outfitId: outfit._id,
          });

          // Keep user postCount in sync, like the regular post creation route
          await User.findByIdAndUpdate(userId, { $inc: { postCount: 1 } });

          await post.populate('author', 'username firstName lastName profileImageUrl');

          const postWithStatus = {
            ...post.toObject(),
            isRepost: false,
            type: 'post',
            isLiked: false,
            isReposted: false,
          };

          io.emit('newPost', postWithStatus);
          console.log('Socket.IO: Emitted new outfit post to all users:', post._id);

          // Increment outfit share stats safely
          if (!outfit.stats) {
            (outfit as any).stats = { saves: 0, shares: 0, clicks: 0 };
          }
          (outfit as any).stats.shares = ((outfit as any).stats.shares || 0) + 1;
        } else {
          console.log(
            'Outfit post already exists for outfit',
            outfit._id,
            'and user',
            userId,
            '– skipping creation'
          );
        }
      }

      await outfit.save();

      res.json({
        success: true,
        data: outfit,
      });
      return;
    } catch (error: any) {
      console.error('Failed to update outfit share state:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update outfit share state.',
      });
      return;
    }
  })
);

// Get current AI usage / limits for the authenticated user
router.get(
  '/usage',
  requireAuth,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserId(req as AuthedRequest);
      const periodStart = getCurrentPeriodStart();

      const [config, subscription, usage] = await Promise.all([
        getAiConfig(),
        getUserSubscription(userId),
        AiUsage.findOne({ userId, periodStart }),
      ]);

      const freeMonthlyOutfits = config.freeMonthlyOutfits ?? 3;
      const subscribedLimit =
        subscription && subscription.monthlyOutfitLimit != null
          ? subscription.monthlyOutfitLimit
          : null;

      const effectiveLimit =
        subscribedLimit !== null ? subscribedLimit : freeMonthlyOutfits;

      res.json({
        success: true,
        data: {
          freeMonthlyOutfits,
          usedThisPeriod: usage?.outfitGenerationsUsed ?? 0,
          effectiveLimit,
          isSubscribed: Boolean(subscription && subscription.status === 'active'),
          subscription: subscription
            ? {
                status: subscription.status,
                monthlyOutfitLimit: subscription.monthlyOutfitLimit,
                currentPeriodEnd: subscription.currentPeriodEnd,
              }
            : null,
        },
      });
      return;
    } catch (error: any) {
      console.error('Failed to fetch AI usage:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch AI usage.',
      });
      return;
    }
  })
);

// Save an outfit to wishlist
router.post(
  '/wishlist/outfit/:id',
  requireAuth,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserId(req as AuthedRequest);
      const { id } = req.params;
      if (!Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid outfit id.' });
        return;
      }

      const outfit = await Outfit.findById(id);
      if (!outfit) {
        res.status(404).json({ success: false, message: 'Outfit not found.' });
        return;
      }

      if (!outfit.isPublic && outfit.userId !== userId) {
        res.status(403).json({ success: false, message: 'Cannot save this outfit.' });
        return;
      }

      const existing = await Wishlist.findOne({ userId, outfitId: outfit._id });
      if (!existing) {
        await Wishlist.create({ userId, outfitId: outfit._id });
        (outfit as any).stats = outfit.stats || { saves: 0, shares: 0, clicks: 0 };
        (outfit as any).stats.saves = ((outfit as any).stats.saves || 0) + 1;
        await outfit.save();
      }

      res.json({
        success: true,
        data: { saved: true },
      });
      return;
    } catch (error: any) {
      // If the user has already saved this outfit (duplicate key), treat it as success
      if (error?.code === 11000) {
        console.warn('Wishlist duplicate detected for user/outfit, returning success.');
        res.json({
          success: true,
          data: { saved: true, duplicate: true },
        });
        return;
      }

      console.error('Failed to save outfit to wishlist:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save outfit to wishlist.',
      });
      return;
    }
  })
);

// Remove an outfit from wishlist
router.delete(
  '/wishlist/outfit/:id',
  requireAuth,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserId(req as AuthedRequest);
      const { id } = req.params;
      if (!Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid outfit id.' });
        return;
      }

      const outfit = await Outfit.findById(id);
      if (!outfit) {
        res.status(404).json({ success: false, message: 'Outfit not found.' });
        return;
      }

      const deleted = await Wishlist.findOneAndDelete({ userId, outfitId: outfit._id });
      if (deleted && outfit.stats) {
        (outfit as any).stats.saves = Math.max(0, (outfit as any).stats.saves - 1);
        await outfit.save();
      }

      res.json({
        success: true,
        data: { saved: false },
      });
      return;
    } catch (error: any) {
      console.error('Failed to remove outfit from wishlist:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove outfit from wishlist.',
      });
      return;
    }
  })
);

// Get current user's saved outfits
router.get(
  '/wishlist/outfits',
  requireAuth,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserId(req as AuthedRequest);
      const page = parseInt((req.query.page as string) || '1', 10) || 1;
      const limit = parseInt((req.query.limit as string) || '10', 10) || 10;
      const skip = (page - 1) * limit;

      const [total, entries] = await Promise.all([
        Wishlist.countDocuments({ userId, outfitId: { $exists: true } }),
        Wishlist.find({ userId, outfitId: { $exists: true } })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('outfitId'),
      ]);

      const outfits = entries
        .map((entry: any) => entry.outfitId)
        .filter(Boolean)
        .map((outfit: any) => ({
          ...outfit.toObject(),
          isSaved: true,
        }));

      res.json({
        success: true,
        data: {
          outfits,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalItems: total,
            hasNextPage: page * limit < total,
            hasPrevPage: page > 1,
          },
        },
      });
      return;
    } catch (error: any) {
      console.error('Failed to fetch wishlist outfits:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch wishlist outfits.',
      });
      return;
    }
  })
);

export default router;

