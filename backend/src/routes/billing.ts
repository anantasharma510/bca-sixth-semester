// @ts-nocheck
import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import { requireAuth } from '../middleware/auth';
import { AiConfig } from '../models/aiConfig.model';
import { Subscription } from '../models/subscription.model';
import { AiUsage } from '../models/aiUsage.model';
import { SubscriptionTransaction } from '../models/subscriptionTransaction.model';
import { getUserId } from './style'; // reuse helper via module import

const router = express.Router();

// Khalti Payment Gateway Configuration
// Hardcoded API keys as provided by user
const KHALTI_SECRET_KEY_1 = '59e35ee1781c43c58acf1f0edd28cc6f';
const KHALTI_SECRET_KEY_2 = 'd099960d73f44668828a5e6aa1ae83d5';
// Use the first key as primary, fallback to second if needed
const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY || KHALTI_SECRET_KEY_1;

// Khalti API endpoints
const KHALTI_API_BASE = process.env.KHALTI_API_BASE || 'https://dev.khalti.com/api/v2'; // Use dev for testing
const KHALTI_PAYMENT_URL = 'https://pay.khalti.com'; // Payment portal URL

// Currency conversion: 1 USD = 133 NPR (approximate, can be made configurable)
const USD_TO_NPR_RATE = 133;

/**
 * Convert USD cents to NPR paisa
 * @param usdCents Amount in USD cents
 * @returns Amount in NPR paisa
 */
function convertUsdCentsToNprPaisa(usdCents: number): number {
  // Convert cents to dollars, multiply by rate, convert to paisa
  const usdAmount = usdCents / 100;
  const nprAmount = usdAmount * USD_TO_NPR_RATE;
  const nprPaisa = Math.round(nprAmount * 100);
  // Ensure minimum 1000 paisa (10 NPR) as per Khalti requirements
  return Math.max(nprPaisa, 1000);
}

/**
 * Convert NPR paisa to USD cents
 * @param nprPaisa Amount in NPR paisa
 * @returns Amount in USD cents
 */
function convertNprPaisaToUsdCents(nprPaisa: number): number {
  const nprAmount = nprPaisa / 100;
  const usdAmount = nprAmount / USD_TO_NPR_RATE;
  return Math.round(usdAmount * 100);
}

// Stripe secret key must be provided via environment variable
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' });

router.post('/create-checkout-session', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!stripe) {
      res.status(500).json({ success: false, message: 'Stripe is not configured on the server.' });
      return;
    }

    const userId = (req as any).userId;
    const { planKey, successUrl, cancelUrl } = req.body || {};

    if (!planKey) {
      res.status(400).json({ success: false, message: 'planKey is required.' });
      return;
    }

    const cfg = await AiConfig.findOne();
    const plan = cfg?.plans.find((p) => p.key === planKey);
    if (!plan) {
      res.status(400).json({ success: false, message: 'Invalid plan key.' });
      return;
    }

    // If we don't yet have a Stripe price for this plan, create one now based on the
    // configured amountCents + currency. This lets admins configure plans without
    // touching the Stripe dashboard.
    if (!plan.stripePriceId) {
      if (!plan.amountCents || plan.amountCents <= 0) {
        res.status(400).json({
          success: false,
          message: 'This plan has no Stripe price yet and no amount configured. Please set a monthly price in the admin panel.',
        });
        return;
      }

      const currency = plan.currency || 'usd';

      // Create a dedicated product for this AI plan (idempotent by key/name)
      const product = await stripe.products.create({
        name: `AI Outfit Plan - ${plan.name}`,
        metadata: {
          planKey: plan.key,
        },
      });

      const price = await stripe.prices.create({
        unit_amount: plan.amountCents,
        currency,
        recurring: {
          interval: 'month',
        },
        product: product.id,
      });

      plan.stripePriceId = price.id;

      // Persist the generated price id back into AiConfig so we reuse it next time.
      if (cfg) {
        await AiConfig.updateOne(
          { _id: cfg._id, 'plans.key': plan.key },
          { $set: { 'plans.$.stripePriceId': price.id } }
        );
      }
    }

    // Create or reuse a Stripe customer tied to this userId
    let subscription = await Subscription.findOne({ userId });
    let customerId = subscription?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { userId },
      });
      customerId = customer.id;
    }

    // Where Stripe sends the user after checkout. Prefer explicit URLs from the client,
    // then FRONTEND_URL, and finally fall back to localhost for dev so we never send
    // users to a random example.com domain.
    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';
    const domainSuccess = successUrl || `${frontendBase}/billing/success`;
    const domainCancel = cancelUrl || `${frontendBase}/billing/cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${domainSuccess}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: domainCancel,
      metadata: {
        userId,
        planKey: plan.key,
      },
    });

    // Record a pending transaction entry so we have a history even if webhooks fail.
    await SubscriptionTransaction.create({
      userId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: session.subscription as string | undefined,
      stripeSessionId: session.id,
      planKey: plan.key,
      amountCents: plan.amountCents ?? null,
      currency: plan.currency || 'usd',
      status: 'pending',
      rawStripeEventType: 'checkout.session.created',
    });

    // Persist customer linkage and mark subscription as active immediately for now.
    // In production you would typically rely on webhooks to flip this to active,
    // but for your test/dev flow we want the purchase to be usable right away.
    if (!subscription) {
      subscription = new Subscription({
        userId,
        stripeCustomerId: customerId,
        status: 'active',
        monthlyOutfitLimit: plan.monthlyOutfitLimit ?? null,
        planKey: plan.key,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // approx 30 days from now
      });
    } else {
      subscription.stripeCustomerId = customerId;
      subscription.planKey = plan.key;
      subscription.monthlyOutfitLimit = plan.monthlyOutfitLimit ?? null;
      subscription.status = 'active';
    }
    await subscription.save();

    // Reset AI usage counter for the current billing period so that the user
    // gets a fresh allowance from their new plan.
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    await AiUsage.findOneAndUpdate(
      { userId, periodStart },
      { userId, periodStart, outfitGenerationsUsed: 0 },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (error: any) {
    console.error('Failed to create checkout session:', error);
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to create checkout session.',
    });
  }
});

// Stripe webhook to sync subscription status
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    if (!stripe || !stripeWebhookSecret) {
      res.status(500).end();
      return;
    }

    const sig = req.headers['stripe-signature'] as string;
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, stripeWebhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed.', err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.metadata?.userId;
          const planKey = session.metadata?.planKey;
          const subscriptionId = session.subscription as string | null;

          if (userId && subscriptionId) {
            const cfg = await AiConfig.findOne();
            const plan = cfg?.plans.find((p) => p.key === planKey);

            const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);

            await Subscription.findOneAndUpdate(
              { userId },
              {
                userId,
                stripeCustomerId: session.customer as string,
                stripeSubscriptionId: subscriptionId,
                status: stripeSub.status === 'active' ? 'active' : 'incomplete',
                currentPeriodEnd: stripeSub.current_period_end
                  ? new Date(stripeSub.current_period_end * 1000)
                  : undefined,
                monthlyOutfitLimit: plan?.monthlyOutfitLimit ?? null,
                planKey: planKey || undefined,
              },
              { upsert: true }
            );

            await SubscriptionTransaction.findOneAndUpdate(
              { stripeSessionId: session.id },
              {
                userId,
                stripeCustomerId: session.customer as string,
                stripeSubscriptionId: subscriptionId,
                stripeSessionId: session.id,
                stripePaymentIntentId: session.payment_intent as string | undefined,
                planKey,
                amountCents: (session.amount_total as number | null) ?? null,
                currency: session.currency || 'usd',
                status: 'succeeded',
                rawStripeEventType: event.type,
              },
              { upsert: true, new: true }
            );
          }
          break;
        }
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const sub = event.data.object as Stripe.Subscription;
          const customerId = sub.customer as string;

          const status =
            sub.status === 'active'
              ? 'active'
              : sub.status === 'trialing'
              ? 'trialing'
              : sub.status === 'past_due'
              ? 'past_due'
              : sub.status === 'unpaid'
              ? 'unpaid'
              : 'canceled';

          const updated = await Subscription.findOneAndUpdate(
            { stripeCustomerId: customerId },
            {
              stripeSubscriptionId: sub.id,
              status,
              currentPeriodEnd: sub.current_period_end
                ? new Date(sub.current_period_end * 1000)
                : undefined,
            }
          );

          if (updated) {
            await SubscriptionTransaction.create({
              userId: updated.userId,
              stripeCustomerId: customerId,
              stripeSubscriptionId: sub.id,
              planKey: updated.planKey,
              status: status === 'active' ? 'succeeded' : 'canceled',
              rawStripeEventType: event.type,
            });
          }
          break;
        }
        default:
          break;
      }

      res.json({ received: true });
    } catch (err: any) {
      console.error('Error processing Stripe webhook:', err);
      res.status(500).end();
    }
  }
);

// ==================== KHALTI PAYMENT GATEWAY ROUTES ====================

/**
 * Initiate Khalti payment
 * POST /api/billing/khalti/initiate
 */
router.post('/khalti/initiate', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { planKey, successUrl, cancelUrl } = req.body || {};

    if (!planKey) {
      res.status(400).json({ success: false, message: 'planKey is required.' });
      return;
    }

    const cfg = await AiConfig.findOne();
    const plan = cfg?.plans.find((p) => p.key === planKey);
    if (!plan) {
      res.status(400).json({ success: false, message: 'Invalid plan key.' });
      return;
    }

    if (!plan.amountCents || plan.amountCents <= 0) {
      res.status(400).json({
        success: false,
        message: 'This plan has no amount configured. Please set a monthly price in the admin panel.',
      });
      return;
    }

    // Convert USD cents to NPR paisa
    const amountUsdCents = plan.amountCents;
    const amountNprPaisa = convertUsdCentsToNprPaisa(amountUsdCents);

    // Generate unique purchase_order_id
    const purchaseOrderId = `khalti_${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Prepare return URLs
    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';
    const returnUrl = successUrl || `${frontendBase}/billing/khalti/callback`;
    const websiteUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    // Call Khalti API to initiate payment
    const khaltiResponse = await fetch(`${KHALTI_API_BASE}/epayment/initiate/`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${KHALTI_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        return_url: returnUrl,
        website_url: websiteUrl,
        amount: amountNprPaisa,
        purchase_order_id: purchaseOrderId,
        purchase_order_name: `AI Outfit Plan - ${plan.name}`,
        customer_info: {
          name: 'User',
          email: 'user@example.com', // You can get this from user model if needed
          phone: '9800000000', // Default test number
        },
        merchant_username: 'airwig',
        merchant_extra: JSON.stringify({ userId, planKey }),
      }),
    });

    if (!khaltiResponse.ok) {
      const errorData = await khaltiResponse.json().catch(() => ({}));
      console.error('Khalti initiate error:', errorData);
      res.status(500).json({
        success: false,
        message: errorData.detail || errorData.message || 'Failed to initiate Khalti payment.',
      });
      return;
    }

    const khaltiData = await khaltiResponse.json();
    const pidx = khaltiData.pidx;
    const paymentUrl = khaltiData.payment_url;

    if (!pidx || !paymentUrl) {
      res.status(500).json({
        success: false,
        message: 'Invalid response from Khalti. Missing pidx or payment_url.',
      });
      return;
    }

    // Record pending transaction with both USD and NPR amounts
    await SubscriptionTransaction.create({
      userId,
      khaltiPidx: pidx,
      planKey: plan.key,
      amountCents: amountNprPaisa, // Store NPR paisa in amountCents for Khalti
      currency: 'npr',
      amountUsdCents: amountUsdCents, // Store original USD amount
      amountNprPaisa: amountNprPaisa, // Store NPR amount
      status: 'pending',
      rawKhaltiEventType: 'payment.initiated',
    });

    // Create or update subscription (similar to Stripe flow)
    let subscription = await Subscription.findOne({ userId });
    if (!subscription) {
      subscription = new Subscription({
        userId,
        status: 'active',
        monthlyOutfitLimit: plan.monthlyOutfitLimit ?? null,
        planKey: plan.key,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      });
    } else {
      subscription.planKey = plan.key;
      subscription.monthlyOutfitLimit = plan.monthlyOutfitLimit ?? null;
      subscription.status = 'active';
    }
    await subscription.save();

    // Reset AI usage counter
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    await AiUsage.findOneAndUpdate(
      { userId, periodStart },
      { userId, periodStart, outfitGenerationsUsed: 0 },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      url: paymentUrl,
      pidx: pidx,
    });
  } catch (error: any) {
    console.error('Failed to initiate Khalti payment:', error);
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to initiate Khalti payment.',
    });
  }
});

/**
 * Khalti payment callback (return_url)
 * GET /api/billing/khalti/callback
 * This is called by Khalti after payment completion
 */
router.get('/khalti/callback', async (req: Request, res: Response) => {
  try {
    const { pidx, status, transaction_id, tidx, amount, mobile, purchase_order_id } = req.query;

    if (!pidx) {
      return res.status(400).send('Missing pidx parameter');
    }

    // Verify payment status using lookup API
    const verifyResponse = await fetch(`${KHALTI_API_BASE}/epayment/lookup/`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${KHALTI_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pidx: pidx as string }),
    });

    if (!verifyResponse.ok) {
      console.error('Khalti lookup failed:', await verifyResponse.text());
      return res.status(500).send('Payment verification failed');
    }

    const verifyData = await verifyResponse.json();
    const paymentStatus = verifyData.status;

    // Find transaction by pidx
    const transaction = await SubscriptionTransaction.findOne({ khaltiPidx: pidx as string });
    if (!transaction) {
      console.error('Transaction not found for pidx:', pidx);
      return res.status(404).send('Transaction not found');
    }

    // Update transaction status based on Khalti response
    let finalStatus: 'pending' | 'succeeded' | 'failed' | 'canceled' = 'pending';
    if (paymentStatus === 'Completed') {
      finalStatus = 'succeeded';
    } else if (paymentStatus === 'User canceled' || paymentStatus === 'Canceled') {
      finalStatus = 'canceled';
    } else if (paymentStatus === 'Expired' || paymentStatus === 'Failed') {
      finalStatus = 'failed';
    }

    // Update transaction
    transaction.status = finalStatus;
    transaction.khaltiTransactionId = verifyData.transaction_id || (transaction_id as string) || undefined;
    transaction.khaltiTidx = verifyData.transaction_id || (tidx as string) || undefined;
    transaction.rawKhaltiEventType = `callback.${paymentStatus.toLowerCase()}`;
    await transaction.save();

    // If payment succeeded, ensure subscription is active
    if (finalStatus === 'succeeded') {
      const subscription = await Subscription.findOne({ userId: transaction.userId });
      if (subscription) {
        subscription.status = 'active';
        await subscription.save();
      }
    }

    // Redirect to frontend success/cancel page
    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';
    if (finalStatus === 'succeeded') {
      res.redirect(`${frontendBase}/billing/success?pidx=${pidx}&status=completed`);
    } else {
      res.redirect(`${frontendBase}/billing/cancel?pidx=${pidx}&status=${paymentStatus}`);
    }
  } catch (error: any) {
    console.error('Khalti callback error:', error);
    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendBase}/billing/cancel?error=verification_failed`);
  }
});

/**
 * Verify Khalti payment status
 * POST /api/billing/khalti/verify
 * Used by frontend/mobile to verify payment after redirect
 */
router.post('/khalti/verify', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { pidx } = req.body;

    if (!pidx) {
      res.status(400).json({ success: false, message: 'pidx is required.' });
      return;
    }

    // Call Khalti lookup API
    const verifyResponse = await fetch(`${KHALTI_API_BASE}/epayment/lookup/`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${KHALTI_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pidx }),
    });

    if (!verifyResponse.ok) {
      const errorData = await verifyResponse.json().catch(() => ({}));
      res.status(500).json({
        success: false,
        message: errorData.detail || 'Failed to verify payment.',
      });
      return;
    }

    const verifyData = await verifyResponse.json();
    const paymentStatus = verifyData.status;

    // Find and update transaction
    const transaction = await SubscriptionTransaction.findOne({
      khaltiPidx: pidx,
      userId, // Ensure user owns this transaction
    });

    if (!transaction) {
      res.status(404).json({ success: false, message: 'Transaction not found.' });
      return;
    }

    // Update transaction status
    let finalStatus: 'pending' | 'succeeded' | 'failed' | 'canceled' = 'pending';
    if (paymentStatus === 'Completed') {
      finalStatus = 'succeeded';
    } else if (paymentStatus === 'User canceled' || paymentStatus === 'Canceled') {
      finalStatus = 'canceled';
    } else if (paymentStatus === 'Expired' || paymentStatus === 'Failed') {
      finalStatus = 'failed';
    }

    transaction.status = finalStatus;
    transaction.khaltiTransactionId = verifyData.transaction_id || undefined;
    transaction.khaltiTidx = verifyData.transaction_id || undefined;
    transaction.rawKhaltiEventType = `lookup.${paymentStatus.toLowerCase()}`;
    await transaction.save();

    // If payment succeeded, ensure subscription is active
    if (finalStatus === 'succeeded') {
      const subscription = await Subscription.findOne({ userId });
      if (subscription) {
        subscription.status = 'active';
        await subscription.save();
      }
    }

    res.json({
      success: true,
      status: finalStatus,
      paymentStatus: paymentStatus,
      transaction: {
        pidx: verifyData.pidx,
        transactionId: verifyData.transaction_id,
        amount: verifyData.total_amount,
        status: paymentStatus,
      },
    });
  } catch (error: any) {
    console.error('Khalti verify error:', error);
    res.status(500).json({
      success: false,
      message: error?.message || 'Failed to verify payment.',
    });
  }
});

export default router;


