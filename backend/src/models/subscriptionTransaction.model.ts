import { Schema, model, Document } from 'mongoose';

export type SubscriptionTransactionStatus =
  | 'pending'
  | 'succeeded'
  | 'failed'
  | 'canceled';

export interface ISubscriptionTransaction extends Document {
  userId: string;
  // Stripe fields
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  // Khalti fields
  khaltiPidx?: string;
  khaltiTransactionId?: string;
  khaltiTidx?: string;
  // Payment details
  planKey?: string;
  amountCents?: number | null; // Amount in cents (USD) or paisa (NPR)
  currency?: string; // 'usd' or 'npr'
  amountUsdCents?: number | null; // Original USD amount in cents (for Khalti transactions)
  amountNprPaisa?: number | null; // NPR amount in paisa (for Khalti transactions)
  status: SubscriptionTransactionStatus;
  rawStripeEventType?: string;
  rawKhaltiEventType?: string;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionTransactionSchema = new Schema<ISubscriptionTransaction>(
  {
    userId: { type: String, required: true, index: true },
    // Stripe fields
    stripeCustomerId: { type: String, index: true, sparse: true },
    stripeSubscriptionId: { type: String, index: true, sparse: true },
    stripeSessionId: { type: String, index: true, unique: true, sparse: true },
    stripePaymentIntentId: { type: String, index: true, sparse: true },
    // Khalti fields
    khaltiPidx: { type: String, index: true, unique: true, sparse: true },
    khaltiTransactionId: { type: String, index: true, sparse: true },
    khaltiTidx: { type: String, index: true, sparse: true },
    // Payment details
    planKey: { type: String },
    amountCents: { type: Number, default: null }, // Amount in cents (USD) or paisa (NPR)
    currency: { type: String, default: 'usd' },
    amountUsdCents: { type: Number, default: null }, // Original USD amount in cents
    amountNprPaisa: { type: Number, default: null }, // NPR amount in paisa
    status: {
      type: String,
      enum: ['pending', 'succeeded', 'failed', 'canceled'],
      default: 'pending',
      index: true,
    },
    rawStripeEventType: { type: String },
    rawKhaltiEventType: { type: String },
  },
  {
    timestamps: true,
  }
);

subscriptionTransactionSchema.index({ userId: 1, createdAt: -1 });

export const SubscriptionTransaction = model<ISubscriptionTransaction>(
  'SubscriptionTransaction',
  subscriptionTransactionSchema
);



