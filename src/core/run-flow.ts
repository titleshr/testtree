import { existsSync } from 'fs';
import { join } from 'path';
import { scanTypescript } from './scan-typescript';
import { summarizeConditions } from './summarize-conditions';
import { generateConditionCatalog } from './generate-condition-catalog';
import { generateFixtures } from './generate-fixtures';
import { inspectFixtures } from './inspect-fixtures';
import { mergeSummaries } from './merge-summaries';
import type { ResolvedConfig } from '../types/testtree-config';

export function runFlow(config: ResolvedConfig): void {
  const { project, outputDir, domain, base, variants, fixtures } = config;

  if (!existsSync(base)) {
    throw new Error(`base-template.json not found at "${base}". Run: testtree init-config`);
  }
  if (!existsSync(variants)) {
    throw new Error(`variants.json not found at "${variants}". Run: testtree init-config`);
  }

  const conditionsPath = join(outputDir, 'ts-conditions.json');
  const summaryPath = join(outputDir, 'ts-summary.json');
  const catalogPath = join(outputDir, 'condition-catalog.json');
  const fixtureSummaryPath = join(outputDir, 'fixture-summary.json');
  const coveragePath = join(outputDir, 'coverage-summary.json');

  console.log('[1/6] scan-ts...');
  scanTypescript({ projectDir: project, outPath: conditionsPath });

  console.log('[2/6] summarize-conditions...');
  summarizeConditions({ conditionsPath, outPath: summaryPath });

  console.log('[3/6] catalog...');
  generateConditionCatalog({ summaryPath, outPath: catalogPath, domain });

  console.log('[4/6] generate...');
  generateFixtures({ basePath: base, variantsPath: variants, outDir: fixtures });

  console.log('[5/6] inspect...');
  inspectFixtures({ fixturesDir: fixtures, outPath: fixtureSummaryPath });

  console.log('[6/6] merge-summary...');
  mergeSummaries({ codeSummaryPath: summaryPath, fixtureSummaryPath, outPath: coveragePath });

  console.log('Flow complete.');
  console.log(`Output: ${outputDir}`);
}
