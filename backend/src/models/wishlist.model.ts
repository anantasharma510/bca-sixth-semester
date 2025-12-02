import { Schema, model, Document, Types } from 'mongoose';

export interface IWishlist extends Document {
  userId: string;
  outfitId?: Types.ObjectId;
  productId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const wishlistSchema = new Schema<IWishlist>(
  {
    userId: { type: String, required: true, index: true },
    outfitId: { type: Schema.Types.ObjectId, ref: 'Outfit', index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', index: true },
  },
  {
    timestamps: true,
  }
);

wishlistSchema.index({ userId: 1, outfitId: 1 }, { unique: true, sparse: true });
wishlistSchema.index({ userId: 1, productId: 1 }, { unique: true, sparse: true });

export const Wishlist = model<IWishlist>('Wishlist', wishlistSchema);


