var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import path from 'path';
import fs from 'fs/promises';
import { z } from 'zod';
import { stylePlanSchema, } from '../../types/style';
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
export const datasetSampleSchema = z.object({
    id: z.string(),
    source: z.string(),
    input: z.object({
        form: generateFormSchema,
        profile: styleProfileSchema,
    }),
    output: stylePlanSchema,
});
export function normalizeBrands(brands) {
    const list = Array.isArray(brands) ? brands : brands.split(',');
    const cleaned = list
        .map((brand) => brand.trim())
        .filter(Boolean)
        .map((brand) => brand.replace(/\s+/g, ' '));
    return cleaned.join(', ');
}
export function clampBudget(value, min, max) {
    if (Number.isNaN(value))
        return min;
    return Math.min(Math.max(value, min), max);
}
export function writeSamplesToJsonl(samples, outputPath) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!samples.length)
            return;
        yield fs.mkdir(path.dirname(outputPath), { recursive: true });
        const payload = samples.map((sample) => JSON.stringify(sample)).join('\n') + '\n';
        yield fs.writeFile(outputPath, payload, 'utf-8');
    });
}
export function readJsonFile(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        const raw = yield fs.readFile(filePath, 'utf-8');
        return JSON.parse(raw);
    });
}
export function createDefaultProfile(overrides = {}) {
    return Object.assign({ gender: 'female', age: 28, heightCm: 168, weightKg: 62, locale: 'en-US', preferredUnits: 'metric', profileImageUrl: undefined }, overrides);
}
export function createDefaultForm(overrides = {}) {
    return Object.assign({ preparing_for: 'an evening cocktail party', preferred_brand: 'zara,h&m', budget: '300', description: 'Elevated look with comfortable silhouettes.' }, overrides);
}
export function buildStylePlanFromItems(looks, description, items, budgetMultiplier = 1) {
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
export function ensureSampleValidity(sample) {
    return datasetSampleSchema.parse(sample);
}
