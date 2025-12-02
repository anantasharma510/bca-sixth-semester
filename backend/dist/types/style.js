import { z } from 'zod';
export const outfitItemSchema = z.object({
    query: z.string(),
    key: z.string(),
    type: z.string(),
    min: z.string(),
    max: z.string(),
    brand: z.string(),
});
export const outfitSchema = z.object({
    looks: z.string(),
    description: z.string(),
    items: z.array(outfitItemSchema),
});
export const stylePlanSchema = z.object({
    outfits: z.array(outfitSchema).min(1),
});
