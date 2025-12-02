import path from 'path';
import fs from 'fs/promises';
import { z } from 'zod';
import {
  stylePlanSchema,
  StylePlan,
  GenerateFormInput,
  StyleProfileInput,
} from '../../types/style';

export const generateFormSchema = z.object({
  preparing_for: z.string().min(1),
  preferred_brand: z.string().min(1),
  budget: z.string().min(1),
  description: z.string().min(1),
});

export const styleProfileSchema = z.object({
  gender: z.string(),
  age: z.number().min(10).max(100),
  heightCm: z.number().min(50).max(250),
  weightKg: z.number().min(20).max(250),
  locale: z.string(),
  preferredUnits: z.union([z.literal('metric'), z.literal('imperial')]).default('metric'),
  profileImageUrl: z.string().optional(),
});

export type CompleteGenerateForm = z.infer<typeof generateFormSchema>;
export type CompleteStyleProfile = z.infer<typeof styleProfileSchema>;

export const datasetSampleSchema = z.object({
  id: z.string(),
  source: z.string(),
  input: z.object({
    form: generateFormSchema,
    profile: styleProfileSchema,
  }),
  output: stylePlanSchema,
});

export type StyleDatasetSample = z.infer<typeof datasetSampleSchema>;

export function normalizeBrands(brands: string | string[]): string {
  const list = Array.isArray(brands) ? brands : brands.split(',');
  const cleaned = list
    .map((brand) => brand.trim())
    .filter(Boolean)
    .map((brand) => brand.replace(/\s+/g, ' '));
  return cleaned.join(', ');
}

export function clampBudget(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

export async function writeSamplesToJsonl(
  samples: StyleDatasetSample[],
  outputPath: string,
): Promise<void> {
  if (!samples.length) return;
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const payload = samples.map((sample) => JSON.stringify(sample)).join('\n') + '\n';
  await fs.writeFile(outputPath, payload, 'utf-8');
}

export async function readJsonFile<T = unknown>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

export function createDefaultProfile(
  overrides: Partial<StyleProfileInput> = {},
): CompleteStyleProfile {
  return {
    gender: 'female',
    age: 28,
    heightCm: 168,
    weightKg: 62,
    locale: 'en-US',
    preferredUnits: 'metric',
    profileImageUrl: undefined,
    ...overrides,
  };
}

export function createDefaultForm(
  overrides: Partial<GenerateFormInput> = {},
): CompleteGenerateForm {
  return {
    preparing_for: 'an evening cocktail party',
    preferred_brand: 'zara,h&m',
    budget: '300',
    description: 'Elevated look with comfortable silhouettes.',
    ...overrides,
  };
}

export type OutfitItemTemplate = {
  query: string;
  type: string;
  brand?: string;
  price: number;
};

export function buildStylePlanFromItems(
  looks: string,
  description: string,
  items: OutfitItemTemplate[],
  budgetMultiplier = 1,
): StylePlan {
  const formattedItems = items.slice(0, 6).map((item, index) => {
    const min = Math.max(Math.round(item.price * 0.7 * budgetMultiplier), 10);
    const max = Math.round(item.price * 1.3 * budgetMultiplier);
    return {
      query: item.query,
      key: `${looks.toLowerCase().replace(/\s+/g, '_')}_${index}`,
      type: item.type,
      min: min.toString(),
      max: max.toString(),
      brand: item.brand || item.query.split(' ')[0],
    };
  });

  return {
    outfits: [
      {
        looks,
        description,
        items: formattedItems,
      },
    ],
  };
}

export function ensureSampleValidity(sample: StyleDatasetSample): StyleDatasetSample {
  return datasetSampleSchema.parse(sample);
}

