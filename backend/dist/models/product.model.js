import { Schema, model } from 'mongoose';
const colorSchema = new Schema({
    name: { type: String, required: true },
    code: { type: String },
    imageUrl: { type: String },
}, { _id: false });
const detailSchema = new Schema({
    locale: { type: String, required: true },
    currency: { type: String },
    price: { type: Number },
    productUrl: { type: String },
    availability: { type: String },
}, { _id: false });
const productSchema = new Schema({
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
}, {
    timestamps: true,
});
productSchema.index({ brand: 1, name: 1 });
productSchema.index({ 'details.locale': 1 });
export const Product = model('Product', productSchema);
