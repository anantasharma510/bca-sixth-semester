import { Schema, model, Document } from 'mongoose';

export type ProductSource = 'zara' | 'hm' | 'other';

export interface IProductColor {
  name: string;
  code?: string;
  imageUrl?: string;
}

export interface IProductDetail {
  locale: string;
  currency?: string;
  price?: number;
  productUrl?: string;
  availability?: string;
}

export interface IProduct extends Document {
  brand: string;
  source: ProductSource;
  externalId: string;
  name: string;
  description?: string;
  mainImageUrl?: string;
  fallbackImageUrl?: string;
  productUrl?: string;
  colors: IProductColor[];
  sizes?: string[];
  details: IProductDetail[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const colorSchema = new Schema<IProductColor>(
  {
    name: { type: String, required: true },
    code: { type: String },
    imageUrl: { type: String },
  },
  { _id: false }
);

const detailSchema = new Schema<IProductDetail>(
  {
    locale: { type: String, required: true },
    currency: { type: String },
    price: { type: Number },
    productUrl: { type: String },
    availability: { type: String },
  },
  { _id: false }
);

const productSchema = new Schema<IProduct>(
  {
    brand: { type: String, required: true, index: true },
    source: { type: String, enum: ['zara', 'hm', 'other'], default: 'other', index: true },
    externalId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String },
    mainImageUrl: { type: String },
    fallbackImageUrl: { type: String },
    productUrl: { type: String },
    colors: { type: [colorSchema], default: [] },
    sizes: { type: [String], default: [] },
    details: { type: [detailSchema], default: [] },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

productSchema.index({ brand: 1, name: 1 });
productSchema.index({ 'details.locale': 1 });

export const Product = model<IProduct>('Product', productSchema);

