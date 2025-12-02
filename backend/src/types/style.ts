import { z } from 'zod';
import { IProductColor, IProductDetail, ProductSource } from '../models/product.model';

export interface StyleProfileInput {
  gender?: string;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  locale?: string;
  preferredUnits?: 'metric' | 'imperial';
  profileImageUrl?: string;
}

export interface GenerateFormInput {
  preparing_for: string;
  preferred_brand: string;
  budget: string;
  description: string;
}

export const outfitItemSchema = z.object({
  query: z.string(),
  key: z.string(),
  type: z.string(),
  min: z.union([z.string(), z.number()]).transform(val => String(val)),
  max: z.union([z.string(), z.number()]).transform(val => String(val)),
  brand: z.string(),
});

export const outfitSchema = z.object({
  looks: z.string(),
  description: z.string(),
  items: z.array(outfitItemSchema),
});

export const stylePlanSchema = z.object({
  // We allow any number of outfits in the raw AI response, but we will
  // clamp what we actually use in the workflow to a maximum of 5.
  outfits: z.array(outfitSchema).min(1),
});

export type StylePlan = z.infer<typeof stylePlanSchema>;

export interface NormalizedProduct {
  brand: string;
  source: ProductSource;
  externalId: string;
  name: string;
  description?: string;
  mainImageUrl?: string;
  productUrl?: string;
  colors: IProductColor[];
  detail: IProductDetail;
  raw?: unknown;
  queryMeta?: {
    key?: string;
    query?: string;
    min?: string;
    max?: string;
    type?: string;
    brand?: string;
  };
}

