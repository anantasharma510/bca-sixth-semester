#!/usr/bin/env ts-node
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
import { fileURLToPath } from 'url';
import { datasetSampleSchema } from './utils';
function readJsonl(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        const raw = yield fs.readFile(filePath, 'utf-8');
        return raw
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => JSON.parse(line));
    });
}
function gatherFiles(targets) {
    return __awaiter(this, void 0, void 0, function* () {
        const resolved = new Set();
        for (const target of targets) {
            const fullPath = path.resolve(target);
            const stat = yield fs.stat(fullPath);
            if (stat.isDirectory()) {
                const entries = yield fs.readdir(fullPath);
                entries
                    .filter((entry) => entry.endsWith('.jsonl'))
                    .forEach((entry) => resolved.add(path.join(fullPath, entry)));
            }
            else if (fullPath.endsWith('.jsonl')) {
                resolved.add(fullPath);
            }
        }
        return [...resolved];
    });
}
function validateFile(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        const samples = yield readJsonl(filePath);
        let success = 0;
        let failure = 0;
        for (const sample of samples) {
            try {
                datasetSampleSchema.parse(sample);
                success += 1;
            }
            catch (error) {
                failure += 1;
                console.error(`❌ Validation failed for ${filePath}`, error);
            }
        }
        return { success, failure };
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const defaultDir = path.resolve(__dirname, '../../../data/style-dataset');
        const targets = process.argv.slice(2);
        const files = yield gatherFiles(targets.length ? targets : [defaultDir]);
        if (!files.length) {
            console.error('No dataset files found to validate.');
            process.exit(1);
        }
        let totalSuccess = 0;
        let totalFailure = 0;
        for (const file of files) {
            const { success, failure } = yield validateFile(file);
            totalSuccess += success;
            totalFailure += failure;
            console.log(`✅ ${file}: ${success} valid, ${failure} invalid`);
        }
        console.log(`Summary -> Valid: ${totalSuccess}, Invalid: ${totalFailure}`);
        if (totalFailure > 0) {
            process.exit(1);
        }
    });
}
main().catch((error) => {
    console.error('Dataset validation failed:', error);
    process.exit(1);
});
