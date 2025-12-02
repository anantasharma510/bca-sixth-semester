import { Schema, model } from 'mongoose';
const outfitItemSchema = new Schema({
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    key: { type: String },
    query: { type: String },
    minPrice: { type: Number },
    maxPrice: { type: Number },
}, { _id: false });
const outfitSchema = new Schema({
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
}, {
    timestamps: true,
});
outfitSchema.index({ userId: 1, createdAt: -1 });
export const Outfit = model('Outfit', outfitSchema);
