import { Schema, model, Document } from 'mongoose';

export interface IAiUsage extends Document {
  userId: string;
  periodStart: Date; // first day of month
  outfitGenerationsUsed: number;
  createdAt: Date;
  updatedAt: Date;
}

const aiUsageSchema = new Schema<IAiUsage>(
  {
    userId: { type: String, required: true, index: true },
    periodStart: { type: Date, required: true, index: true },
    outfitGenerationsUsed: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

aiUsageSchema.index({ userId: 1, periodStart: 1 }, { unique: true });

export const AiUsage = model<IAiUsage>('AiUsage', aiUsageSchema);


