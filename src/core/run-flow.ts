import { existsSync } from 'fs';
import { join } from 'path';
import { scanTypescript } from './scan-typescript';
import { summarizeConditions } from './summarize-conditions';
import { generateConditionCatalog } from './generate-condition-catalog';
import { generateFixtures } from './generate-fixtures';
import { inspectFixtures } from './inspect-fixtures';
import { mergeSummaries } from './merge-summaries';
import { scanDb } from './scan-db';
import { suggestVariants } from './suggest-variants';
import type { ResolvedConfig } from '../types/testtree-config';

export async function runFlow(config: ResolvedConfig): Promise<void> {
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
  const dbSummaryPath = config.db ? join(outputDir, 'db-summary.json') : undefined;

  const totalSteps = config.db ? 8 : 7;
  let step = 0;
  const next = (label: string) => `[${++step}/${totalSteps}] ${label}...`;

  console.log(next('scan-ts'));
  scanTypescript({ projectDir: project, outPath: conditionsPath });

  console.log(next('summarize-conditions'));
  summarizeConditions({ conditionsPath, outPath: summaryPath });

  console.log(next('catalog'));
  generateConditionCatalog({ summaryPath, outPath: catalogPath, domain });

  if (config.db) {
    console.log(next('scan-db'));
    await scanDb({
      uri: config.db.uri,
      database: config.db.database,
      collection: config.db.collection,
      fields: config.db.fields,
      outPath: dbSummaryPath!,
    });
  }

  console.log(next('generate'));
  generateFixtures({ basePath: base, variantsPath: variants, outDir: fixtures });

  console.log(next('inspect'));
  inspectFixtures({ fixturesDir: fixtures, outPath: fixtureSummaryPath });

  console.log(next('merge-summary'));
  mergeSummaries({
    codeSummaryPath: summaryPath,
    fixtureSummaryPath,
    outPath: coveragePath,
    ...(dbSummaryPath && { dbSummaryPath }),
  });

  console.log(next('suggest-variants'));
  suggestVariants({ coveragePath, fields: config.db?.fields });

  console.log('\nFlow complete.');
  console.log(`Output: ${outputDir}`);
}
