import { Schema, model } from 'mongoose';
const styleGenerationSchema = new Schema({
    userId: { type: String, required: true, index: true },
    formInput: {
        preparingFor: { type: String, required: true, maxlength: 200 },
        preferredBrand: { type: String, required: true, maxlength: 200 },
        budget: { type: String, required: true, maxlength: 50 },
        description: { type: String, required: true, maxlength: 1000 },
    },
    aiResponse: { type: Schema.Types.Mixed },
    status: {
        type: String,
        enum: ['pending', 'failed', 'completed'],
        default: 'pending',
        index: true,
    },
    failureReason: { type: String },
    outfitId: { type: Schema.Types.ObjectId, ref: 'Outfit' },
    scrapedProductIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    costSummary: {
        openAiTokens: { type: Number },
        openAiCostUsd: { type: Number },
        scrapingMs: { type: Number },
    },
}, {
    timestamps: true,
});
styleGenerationSchema.index({ userId: 1, createdAt: -1 });
export const StyleGeneration = model('StyleGeneration', styleGenerationSchema);
