#!/usr/bin/env ts-node
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { z } from 'zod';
import {
  StyleDatasetSample,
  createDefaultForm,
  createDefaultProfile,
  writeSamplesToJsonl,
  ensureSampleValidity,
  normalizeBrands,
} from './utils';
import { buildStylePlanFromItems } from './utils';

type RawPolyvoreItem = {
  title?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  color?: string;
  price?: number;
};

type RawPolyvoreSet = {
  id?: string;
  set_id?: string;
  title?: string;
  set_name?: string;
  description?: string;
  tags?: string[];
  occasion?: string;
  user?: string;
  likes?: number;
  season?: string;
  items?: RawPolyvoreItem[];
};

const ITEM_SCHEMA = z.object({
  title: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  brand: z.string().optional(),
  color: z.string().optional(),
  price: z.number().nonnegative().optional(),
});

const SET_SCHEMA = z.object({
  id: z.string().optional(),
  set_id: z.string().optional(),
  title: z.string().optional(),
  set_name: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  occasion: z.string().optional(),
  user: z.string().optional(),
  likes: z.number().optional(),
  season: z.string().optional(),
  items: z.array(ITEM_SCHEMA).optional(),
});

async function loadPolyvoreData(inputPath: string): Promise<RawPolyvoreSet[]> {
  const raw = await fs.readFile(inputPath, 'utf-8');
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) {
    return parsed.map((entry) => SET_SCHEMA.parse(entry));
  }
  if (Array.isArray(parsed?.sets)) {
    return parsed.sets.map((entry: unknown) => SET_SCHEMA.parse(entry));
  }
  throw new Error(`Unsupported file structure in ${inputPath}`);
}

function inferScenario(set: RawPolyvoreSet): string {
  const candidates = [set.occasion, set.title, set.set_name, ...(set.tags || [])];
  const phrase =
    candidates
      .filter(Boolean)
      .map((value) => value!.toLowerCase())
      .find((value) =>
        [
          'wedding',
          'cocktail',
          'vacation',
          'work',
          'school',
          'festival',
          'date',
          'summer',
          'winter',
        ].some((keyword) => value.includes(keyword)),
      ) || 'stylish day out';
  return `outfit for ${phrase}`;
}

function inferBrands(items: RawPolyvoreItem[]): string {
  const brands = items
    .map((item) => item.brand)
    .filter(Boolean)
    .map((brand) => brand!.toLowerCase());
  if (!brands.length) {
    return 'zara,h&m';
  }
  const unique = [...new Set(brands)];
  return normalizeBrands(unique.slice(0, 5));
}

function inferBudget(items: RawPolyvoreItem[]): string {
  const prices = items.map((item) => item.price || 60);
  const total = prices.reduce((sum, price) => sum + price, 0);
  const rounded = Math.max(Math.round(total / 10) * 10, 80);
  return rounded.toString();
}

function inferDescription(set: RawPolyvoreSet): string {
  if (set.description && set.description.trim().length > 12) {
    return set.description.trim();
  }
  const tags = (set.tags || []).slice(0, 4).join(', ');
  return `Inspired by ${set.set_name || set.title || 'a curated look'} featuring ${tags}.`;
}

function inferItems(items: RawPolyvoreItem[]): RawPolyvoreItem[] {
  if (!items.length) {
    return [
      {
        title: 'sleek satin midi dress',
        category: 'dress',
        brand: 'zara',
        price: 80,
      },
      {
        title: 'ankle strap heels',
        category: 'heels',
        brand: 'zara',
        price: 70,
      },
      {
        title: 'structured mini bag',
        category: 'bag',
        brand: 'hm',
        price: 60,
      },
    ];
  }
  return items;
}

function mapSetToSample(set: RawPolyvoreSet): StyleDatasetSample | null {
  const items = inferItems(set.items || []);
  const looks = set.set_name || set.title || 'Curated look';
  const description = inferDescription(set);
  const planItems = items.map((item) => ({
    query: item.title || [item.color, item.brand, item.category].filter(Boolean).join(' '),
    type: item.category?.toLowerCase() || 'fashion',
    brand: item.brand || 'zara',
    price: item.price || 65,
  }));

  const plan = buildStylePlanFromItems(looks, description, planItems);
  const form = createDefaultForm({
    preparing_for: inferScenario(set),
    preferred_brand: inferBrands(items),
    budget: inferBudget(items),
    description,
  });

  const profile = createDefaultProfile({
    gender: (set.tags || []).some((tag) => tag.toLowerCase().includes('men')) ? 'male' : 'female',
  });

  const id =
    set.set_id ||
    set.id ||
    crypto.createHash('md5').update(`${looks}-${description}`).digest('hex').slice(0, 12);

  try {
    return ensureSampleValidity({
      id,
      source: 'polyvore',
      input: { form, profile },
      output: plan,
    });
  } catch (error) {
    console.warn(`Skipping set ${id} due to validation error`, error);
    return null;
  }
}

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const inputPath =
    process.env.POLYVORE_DATA_PATH ||
    path.resolve(__dirname, '../../../data/raw/polyvore/polyvore_dataset.json');
  const outputPath =
    process.env.POLYVORE_OUTPUT_PATH ||
    path.resolve(__dirname, '../../../data/style-dataset/intermediate/polyvore.jsonl');

  console.log(`Reading Polyvore data from ${inputPath}`);
  const sets = await loadPolyvoreData(inputPath);
  console.log(`Found ${sets.length} sets, normalizing...`);

  const samples: StyleDatasetSample[] = [];
  for (const set of sets) {
    const sample = mapSetToSample(set);
    if (sample) {
      samples.push(sample);
    }
  }

  if (!samples.length) {
    console.warn('No samples generated. Check the source dataset.');
    return;
  }

  await writeSamplesToJsonl(samples, outputPath);
  console.log(`✅ Wrote ${samples.length} samples to ${outputPath}`);
}

main().catch((error) => {
  console.error('Polyvore collection failed:', error);
  process.exit(1);
});


