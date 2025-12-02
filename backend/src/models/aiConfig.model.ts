import { Schema, model, Document } from 'mongoose';

export interface IAiPlan {
  key: string; // e.g. "basic-10", used by frontend
  name: string;
  monthlyOutfitLimit: number | null; // null = unlimited
  /**
   * Price in the smallest currency unit (e.g. cents for USD).
   * This is configured from the admin panel as a normal number (e.g. 10.00 -> 1000).
   */
  amountCents?: number | null;
  /**
   * ISO currency code, e.g. "usd". Defaults to "usd" when not provided.
   */
  currency?: string;
  /**
   * Backing Stripe price id for this plan. Automatically created by the backend
   * the first time a checkout session is requested. Admins do NOT need to type this.
   */
  stripePriceId?: string;
}

export interface IAiConfig extends Document {
  freeMonthlyOutfits: number;
  plans: IAiPlan[];
  createdAt: Date;
  updatedAt: Date;
}

const aiPlanSchema = new Schema<IAiPlan>(
  {
    key: { type: String, required: true },
    name: { type: String, required: true },
    monthlyOutfitLimit: { type: Number, default: 0 },
    amountCents: { type: Number, default: null },
    currency: { type: String, default: 'usd' },
    stripePriceId: { type: String },
  },
  { _id: false }
);

const aiConfigSchema = new Schema<IAiConfig>(
  {
    freeMonthlyOutfits: { type: Number, default: 3 },
    plans: { type: [aiPlanSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

export const AiConfig = model<IAiConfig>('AiConfig', aiConfigSchema);


