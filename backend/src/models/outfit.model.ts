import { Schema, model, Document, Types } from 'mongoose';

export interface IOutfitProductItem {
  productId: Types.ObjectId;
  key?: string;
  query?: string;
  minPrice?: number;
  maxPrice?: number;
}

export interface IOutfit extends Document {
  userId: string;
  generationId?: Types.ObjectId;
  name: string;
  description?: string;
  bannerImageUrl?: string;
  isPublic: boolean;
  sharedAt?: Date;
  items: IOutfitProductItem[];
  stats: {
    saves: number;
    shares: number;
    clicks: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const outfitItemSchema = new Schema<IOutfitProductItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    key: { type: String },
    query: { type: String },
    minPrice: { type: Number },
    maxPrice: { type: Number },
  },
  { _id: false }
);

const outfitSchema = new Schema<IOutfit>(
  {
    userId: { type: String, required: true, index: true },
    generationId: { type: Schema.Types.ObjectId, ref: 'StyleGeneration' },
    name: { type: String, required: true },
    description: { type: String },
    bannerImageUrl: { type: String },
    isPublic: { type: Boolean, default: false, index: true },
    sharedAt: { type: Date },
    items: { type: [outfitItemSchema], default: [] },
    stats: {
      saves: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

outfitSchema.index({ userId: 1, createdAt: -1 });

export const Outfit = model<IOutfit>('Outfit', outfitSchema);

