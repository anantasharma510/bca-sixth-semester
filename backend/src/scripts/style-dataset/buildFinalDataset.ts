#!/usr/bin/env ts-node
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { datasetSampleSchema, StyleDatasetSample } from './utils';

async function readJsonl(filePath: string): Promise<StyleDatasetSample[]> {
  const raw = await fs.readFile(filePath, 'utf-8');
  const lines = raw.split('\n').map((line) => line.trim()).filter(Boolean);
  const samples: StyleDatasetSample[] = [];
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      samples.push(datasetSampleSchema.parse(parsed));
    } catch (error) {
      console.warn(`Skipping invalid line in ${filePath}`, error);
    }
  }
  return samples;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function writeJsonl(samples: StyleDatasetSample[], filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const payload = samples.map((sample) => JSON.stringify(sample)).join('\n') + '\n';
  await fs.writeFile(filePath, payload, 'utf-8');
}

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const intermediateDir =
    process.env.STYLE_INTERMEDIATE_DIR ||
    path.resolve(__dirname, '../../../data/style-dataset/intermediate');

  const finalDir =
    process.env.STYLE_FINAL_DIR || path.resolve(__dirname, '../../../data/style-dataset/final');

  const files = (await fs.readdir(intermediateDir))
    .filter((file) => file.endsWith('.jsonl'))
    .map((file) => path.join(intermediateDir, file));

  if (!files.length) {
    console.error('No intermediate dataset files found.');
    process.exit(1);
  }

  const dataset: StyleDatasetSample[] = [];
  for (const file of files) {
    const samples = await readJsonl(file);
    dataset.push(...samples);
  }

  if (!dataset.length) {
    console.error('No valid samples collected.');
    process.exit(1);
  }

  const shuffled = shuffle(dataset);
  const trainCut = Math.round(shuffled.length * 0.9);
  const train = shuffled.slice(0, trainCut);
  const valid = shuffled.slice(trainCut);

  await writeJsonl(train, path.join(finalDir, 'train.jsonl'));
  await writeJsonl(valid, path.join(finalDir, 'valid.jsonl'));

  console.log(
    `✅ Final dataset ready. Train: ${train.length} samples, Valid: ${valid.length} samples -> ${finalDir}`
  );
}

main().catch((error) => {
  console.error('Failed to build final dataset:', error);
  process.exit(1);
});


