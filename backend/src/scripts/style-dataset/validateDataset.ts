#!/usr/bin/env ts-node
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { datasetSampleSchema } from './utils';

async function readJsonl(filePath: string) {
  const raw = await fs.readFile(filePath, 'utf-8');
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function gatherFiles(targets: string[]): Promise<string[]> {
  const resolved = new Set<string>();
  for (const target of targets) {
    const fullPath = path.resolve(target);
    const stat = await fs.stat(fullPath);
    if (stat.isDirectory()) {
      const entries = await fs.readdir(fullPath);
      entries
        .filter((entry) => entry.endsWith('.jsonl'))
        .forEach((entry) => resolved.add(path.join(fullPath, entry)));
    } else if (fullPath.endsWith('.jsonl')) {
      resolved.add(fullPath);
    }
  }
  return [...resolved];
}

async function validateFile(filePath: string) {
  const samples = await readJsonl(filePath);
  let success = 0;
  let failure = 0;
  for (const sample of samples) {
    try {
      datasetSampleSchema.parse(sample);
      success += 1;
    } catch (error) {
      failure += 1;
      console.error(`❌ Validation failed for ${filePath}`, error);
    }
  }
  return { success, failure };
}

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const defaultDir = path.resolve(__dirname, '../../../data/style-dataset');
  const targets = process.argv.slice(2);
  const files = await gatherFiles(targets.length ? targets : [defaultDir]);

  if (!files.length) {
    console.error('No dataset files found to validate.');
    process.exit(1);
  }

  let totalSuccess = 0;
  let totalFailure = 0;

  for (const file of files) {
    const { success, failure } = await validateFile(file);
    totalSuccess += success;
    totalFailure += failure;
    console.log(`✅ ${file}: ${success} valid, ${failure} invalid`);
  }

  console.log(`Summary -> Valid: ${totalSuccess}, Invalid: ${totalFailure}`);
  if (totalFailure > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Dataset validation failed:', error);
  process.exit(1);
});


