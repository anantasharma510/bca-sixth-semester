import { Schema, model, Document } from 'mongoose';

export interface ISubscription extends Document {
  userId: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  status: 'active' | 'incomplete' | 'canceled' | 'past_due' | 'trialing' | 'unpaid';
  currentPeriodEnd?: Date;
  monthlyOutfitLimit: number | null; // null = unlimited
  planKey?: string; // matches IAiPlan.key
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    userId: { type: String, required: true, index: true },
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String, index: true },
    status: {
      type: String,
      enum: ['active', 'incomplete', 'canceled', 'past_due', 'trialing', 'unpaid'],
      default: 'incomplete',
    },
    currentPeriodEnd: { type: Date },
    monthlyOutfitLimit: { type: Number, default: 0 },
    planKey: { type: String },
  },
  {
    timestamps: true,
  }
);

subscriptionSchema.index({ userId: 1, status: 1 });

export const Subscription = model<ISubscription>('Subscription', subscriptionSchema);


