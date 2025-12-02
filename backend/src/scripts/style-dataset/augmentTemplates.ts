#!/usr/bin/env ts-node
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import {
  StyleDatasetSample,
  createDefaultForm,
  createDefaultProfile,
  writeSamplesToJsonl,
  ensureSampleValidity,
  OutfitItemTemplate,
} from './utils';
import { buildStylePlanFromItems } from './utils';

type ScenarioTemplate = {
  preparing_for: string;
  description: string;
  gender: 'male' | 'female';
  baseItems: OutfitItemTemplate[];
  brandSets: string[][];
  budgetRange: [number, number];
};

const SCENARIOS: ScenarioTemplate[] = [
  {
    preparing_for: 'sunset beach wedding',
    description: 'Flowing silhouettes, breathable fabrics, and soft pastel tones for seaside vows.',
    gender: 'female',
    baseItems: [
      { query: 'pastel silk halter maxi dress', type: 'dress', brand: 'zara', price: 140 },
      { query: 'pearl strap low heel sandals', type: 'shoes', brand: 'hm', price: 85 },
      { query: 'raffia mini clutch with gold chain', type: 'bag', brand: 'mango', price: 65 },
      { query: 'delicate layered necklace set', type: 'accessory', brand: 'asos', price: 45 },
    ],
    brandSets: [
      ['zara', 'hm', 'mango'],
      ['reformation', 'aldo', 'anthropologie'],
    ],
    budgetRange: [280, 420],
  },
  {
    preparing_for: 'tech conference keynote',
    description: 'Sharp tailoring with a minimalist palette for a confident stage presence.',
    gender: 'male',
    baseItems: [
      { query: 'slim charcoal stretch blazer', type: 'outerwear', brand: 'banana republic', price: 210 },
      { query: 'cooling performance dress shirt', type: 'top', brand: 'uniqlo', price: 45 },
      { query: 'tapered navy chino pants', type: 'bottom', brand: 'hm', price: 70 },
      { query: 'minimalist leather sneakers white', type: 'shoes', brand: 'koio', price: 175 },
    ],
    brandSets: [
      ['banana republic', 'uniqlo', 'hm', 'koio'],
      ['jcrew', 'everlane', 'nike'],
    ],
    budgetRange: [350, 520],
  },
  {
    preparing_for: 'gallery opening night',
    description: 'Art-forward look mixing luxurious textures with a statement silhouette.',
    gender: 'female',
    baseItems: [
      { query: 'asymmetric satin midi skirt', type: 'bottom', brand: 'cos', price: 160 },
      { query: 'structured corset top black', type: 'top', brand: 'zara', price: 65 },
      { query: 'square toe ankle boots patent', type: 'shoes', brand: 'steve madden', price: 150 },
      { query: 'metallic box clutch', type: 'bag', brand: 'aldo', price: 75 },
    ],
    brandSets: [
      ['cos', 'zara', 'steve madden', 'aldo'],
      ['reiss', 'hm', 'vince'],
    ],
    budgetRange: [320, 480],
  },
  {
    preparing_for: 'weekend farmers market date',
    description: 'Relaxed, layered essentials that feel effortless and photo-ready.',
    gender: 'female',
    baseItems: [
      { query: 'linen blend wrap dress sage', type: 'dress', brand: 'madewell', price: 110 },
      { query: 'platform espadrille sandals', type: 'shoes', brand: 'soludos', price: 95 },
      { query: 'woven bucket bag natural', type: 'bag', brand: 'free people', price: 80 },
      { query: 'cropped denim chore jacket', type: 'outerwear', brand: 'levi\'s', price: 120 },
    ],
    brandSets: [
      ['madewell', 'soludos', 'free people', 'levis'],
      ['everlane', 'anthropologie', 'aritzia'],
    ],
    budgetRange: [260, 360],
  },
  {
    preparing_for: 'snowy cabin getaway',
    description: 'Layered knits and weatherproof boots built for board games by the fire and a winter hike.',
    gender: 'male',
    baseItems: [
      { query: 'thermal merino mock neck sweater', type: 'top', brand: 'patagonia', price: 160 },
      { query: 'water resistant lined parka', type: 'outerwear', brand: 'north face', price: 280 },
      { query: 'relaxed fit brushed flannel', type: 'top', brand: 'll bean', price: 80 },
      { query: 'lug sole hiking boots brown', type: 'shoes', brand: 'sorel', price: 190 },
    ],
    brandSets: [
      ['patagonia', 'north face', 'll bean', 'sorel'],
      ['arca teryx', 'uniqlo', 'merrell'],
    ],
    budgetRange: [450, 650],
  },
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function choose<T>(array: T[]): T {
  return array[randomInt(0, array.length - 1)];
}

function applyVariations(items: OutfitItemTemplate[]): OutfitItemTemplate[] {
  return items.map((item) => {
    const variations = ['midnight', 'blush', 'charcoal', 'ivory', 'olive', 'ruby'];
    const colorPrefix = choose(variations);
    const words = item.query.split(' ');
    words[0] = colorPrefix;
    return {
      ...item,
      query: words.join(' '),
      price: Math.round(item.price * (0.9 + Math.random() * 0.2)),
    };
  });
}

function buildSample(template: ScenarioTemplate, iteration: number): StyleDatasetSample {
  const brands = choose(template.brandSets);
  const budget = randomInt(template.budgetRange[0], template.budgetRange[1]);
  const items = applyVariations(template.baseItems);
  const looks = `${template.preparing_for} look ${iteration + 1}`;
  const plan = buildStylePlanFromItems(looks, template.description, items, 1);
  const form = createDefaultForm({
    preparing_for: template.preparing_for,
    preferred_brand: brands.join(','),
    budget: budget.toString(),
    description: template.description,
  });
  const profile = createDefaultProfile({
    gender: template.gender,
    age: randomInt(24, 38),
    heightCm: template.gender === 'male' ? randomInt(170, 188) : randomInt(160, 174),
    weightKg: template.gender === 'male' ? randomInt(68, 84) : randomInt(52, 68),
  });
  const id = crypto
    .createHash('md5')
    .update(`${template.preparing_for}-${iteration}-${brands.join('-')}`)
    .digest('hex')
    .slice(0, 12);
  return ensureSampleValidity({
    id,
    source: 'template',
    input: { form, profile },
    output: plan,
  });
}

async function main() {
  const targetCount = Number(process.env.STYLE_TEMPLATE_COUNT || '150');
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const outputPath =
    process.env.STYLE_TEMPLATE_OUTPUT ||
    path.resolve(__dirname, '../../../data/style-dataset/intermediate/templates.jsonl');

  const samples: StyleDatasetSample[] = [];
  let iteration = 0;
  while (samples.length < targetCount) {
    const scenario = choose(SCENARIOS);
    const sample = buildSample(scenario, iteration);
    samples.push(sample);
    iteration += 1;
  }

  await writeSamplesToJsonl(samples, outputPath);
  console.log(`✅ Generated ${samples.length} template-based samples -> ${outputPath}`);
}

main().catch((error) => {
  console.error('Template augmentation failed:', error);
  process.exit(1);
});


