#!/usr/bin/env ts-node
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import {
  StyleDatasetSample,
  ensureSampleValidity,
  createDefaultForm,
  createDefaultProfile,
  buildStylePlanFromItems,
} from './utils';

type PolyvoreSet = {
  set_id: string;
  items: { item_id: string }[];
};

type PolyvoreItemMeta = {
  url_name?: string;
  description?: string;
  title?: string;
  related?: string[] | string;
  category_id?: string;
  semantic_category?: string;
  categories?: string[] | string;
};

type TitleEntry = {
  url_name?: string;
  title?: string;
};

const CATEGORY_BASE_PRICE: Record<string, number> = {
  tops: 70,
  bottoms: 90,
  dress: 120,
  outerwear: 150,
  shoes: 110,
  accessories: 45,
  jewellery: 65,
  bags: 85,
};

function deriveBrand(meta: PolyvoreItemMeta): string {
  if (Array.isArray(meta.categories) && meta.categories.length) {
    const brandCategory = meta.categories.find((entry) => entry.toLowerCase().includes('pants') || entry.toLowerCase().includes('tops'));
    if (brandCategory) {
      const parts = brandCategory.split(' ');
      return parts[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    }
  }
  if (typeof meta.categories === 'string' && meta.categories.length > 0) {
    const words = meta.categories.split(' ');
    return words[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  }
  if (meta.url_name) {
    return meta.url_name.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  }
  return 'zara';
}

function deriveQuery(meta: PolyvoreItemMeta): string {
  if (meta.title) return meta.title.toLowerCase();
  if (meta.description) return meta.description.split('.')[0].toLowerCase();
  return (meta.url_name || 'stylish piece').replace(/[-_]/g, ' ');
}

function deriveType(meta: PolyvoreItemMeta): string {
  if (meta.semantic_category) return meta.semantic_category.toLowerCase();
  if (Array.isArray(meta.categories) && meta.categories.length) {
    return meta.categories[meta.categories.length - 1].toLowerCase();
  }
  return 'fashion';
}

function derivePrice(meta: PolyvoreItemMeta): number {
  const base = CATEGORY_BASE_PRICE[meta.semantic_category || ''] || 80;
  const variance = 0.75 + Math.random() * 0.5;
  return Math.round(base * variance);
}

function deriveDescription(title?: TitleEntry): string {
  if (!title) return 'Polyvore curated look with matching pieces.';
  if (title.title && title.title.length > 0) {
    return title.title;
  }
  if (title.url_name) {
    return title.url_name.replace(/[-_]/g, ' ');
  }
  return 'Polyvore curated look.';
}

function deriveScenario(title?: TitleEntry): string {
  if (!title) return 'polyvore inspired outfit';
  return (title.url_name || title.title || 'polyvore look').replace(/[-_]/g, ' ');
}

async function loadJson<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const archiveDir =
    process.env.POLYVORE_ARCHIVE_DIR ||
    path.resolve(__dirname, '../../../data/style-dataset/archive/polyvore_outfits');
  const outputPath =
    process.env.POLYVORE_ARCHIVE_OUTPUT ||
    path.resolve(__dirname, '../../../data/style-dataset/intermediate/polyvore_archive.jsonl');

  const splitFiles = [
    { label: 'nondisjoint_train', file: path.join('nondisjoint', 'train.json') },
    { label: 'nondisjoint_valid', file: path.join('nondisjoint', 'valid.json') },
    { label: 'disjoint_train', file: path.join('disjoint', 'train.json') },
    { label: 'disjoint_valid', file: path.join('disjoint', 'valid.json') },
  ];
  const titlesPath = path.join(archiveDir, 'polyvore_outfit_titles.json');
  const metadataPath = path.join(archiveDir, 'polyvore_item_metadata.json');

  console.log('Loading Polyvore archive data...');
  const [titlesMap, metadata] = await Promise.all([
    loadJson<Record<string, TitleEntry>>(titlesPath),
    loadJson<Record<string, PolyvoreItemMeta>>(metadataPath),
  ]);

  const samples: StyleDatasetSample[] = [];
  const totalLimit = Number.isFinite(Number(process.env.POLYVORE_ARCHIVE_LIMIT))
    ? Number(process.env.POLYVORE_ARCHIVE_LIMIT)
    : Infinity;

  for (const split of splitFiles) {
    const splitPath = path.join(archiveDir, split.file);
    try {
      await fs.access(splitPath);
    } catch {
      console.warn(`Skipping missing split file: ${splitPath}`);
      continue;
    }

    console.log(`Processing ${split.label}...`);
    const splitSets = await loadJson<PolyvoreSet[]>(splitPath);

    for (const set of splitSets) {
      if (samples.length >= totalLimit) break;

      const items = set.items
        .map((item) => metadata[item.item_id])
        .filter((meta): meta is PolyvoreItemMeta => Boolean(meta));

      if (items.length < 3) continue;

      const planItems = items.slice(0, 6).map((meta) => ({
        query: deriveQuery(meta),
        type: deriveType(meta),
        brand: deriveBrand(meta),
        price: derivePrice(meta),
      }));

      const plan = buildStylePlanFromItems(
        `${split.label} ${set.set_id}`,
        deriveDescription(titlesMap[set.set_id]),
        planItems,
        1
      );

      const budget = planItems.reduce((sum, item) => sum + item.price, 0);
      const brands = [...new Set(planItems.map((item) => item.brand))].slice(0, 4).join(',');

      const form = createDefaultForm({
        preparing_for: deriveScenario(titlesMap[set.set_id]),
        preferred_brand: brands || 'zara,h&m',
        budget: budget.toString(),
        description: deriveDescription(titlesMap[set.set_id]),
      });

      const profile = createDefaultProfile({
        gender: Math.random() > 0.5 ? 'female' : 'male',
      });

      try {
        const sample = ensureSampleValidity({
          id: crypto.createHash('md5').update(`${split.label}-${set.set_id}`).digest('hex').slice(0, 12),
          source: `polyvore_archive:${split.label}`,
          input: { form, profile },
          output: plan,
        });
        samples.push(sample);
      } catch (error) {
        console.warn(`Skipping set ${set.set_id} (${split.label}) due to validation error`, error);
      }
    }

    if (samples.length >= totalLimit) break;
  }

  if (!samples.length) {
    console.error('No samples generated from Polyvore archive.');
    process.exit(1);
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const payload = samples.map((sample) => JSON.stringify(sample)).join('\n') + '\n';
  await fs.writeFile(outputPath, payload, 'utf-8');

  console.log(`✅ Polyvore archive samples written: ${samples.length} -> ${outputPath}`);
}

main().catch((error) => {
  console.error('Polyvore archive collection failed:', error);
  process.exit(1);
});

