#!/usr/bin/env node
import { Command } from 'commander';
import { generateFixtures } from '../core/generate-fixtures';
import { initWorkspace } from '../core/init-workspace';
import { inspectFixtures } from '../core/inspect-fixtures';
import { generateConditionCatalog } from '../core/generate-condition-catalog';
import { scanCode } from '../core/scan-code';
import { scanTypescript } from '../core/scan-typescript';
import { summarizeConditions } from '../core/summarize-conditions';
import { mergeSummaries } from '../core/merge-summaries';
import { showSummary } from '../core/show-summary';
import { loadConfig } from '../core/load-config';
import { initConfig } from '../core/init-config';
import { runFlow } from '../core/run-flow';
import { generateTemplate } from '../core/generate-template';
import { suggestVariants } from '../core/suggest-variants';
import { scanSchema } from '../core/scan-schema';
import { scanDb } from '../core/scan-db';
import { mergeConditions } from '../core/merge-conditions';

const program = new Command();

program
  .name('testtree')
  .description('Grow scenario-based fixtures from base data')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate fixture files from base template and variants')
  .requiredOption('--base <path>', 'Path to base-template.json')
  .requiredOption('--variants <path>', 'Path to variants.json')
  .requiredOption('--out <dir>', 'Output directory for generated fixtures')
  .action((options) => {
    try {
      generateFixtures({
        basePath: options.base,
        variantsPath: options.variants,
        outDir: options.out,
      });
    } catch (err) {
      console.error('Error:', (err as Error).message);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize a workspace with workflow template files')
  .requiredOption('--out <dir>', 'Output directory for workspace files')
  .option('--force', 'Overwrite existing files', false)
  .action((options) => {
    try {
      initWorkspace({
        outDir: options.out,
        force: options.force,
      });
    } catch (err) {
      console.error('Error:', (err as Error).message);
      process.exit(1);
    }
  });

program
  .command('inspect')
  .description('Inspect generated fixtures and summarize field values')
  .requiredOption('--fixtures <dir>', 'Path to fixtures directory')
  .requiredOption('--out <path>', 'Output path for fixture-summary.json')
  .action((options) => {
    try {
      inspectFixtures({
        fixturesDir: options.fixtures,
        outPath: options.out,
      });
    } catch (err) {
      console.error('Error:', (err as Error).message);
      process.exit(1);
    }
  });

program
  .command('catalog')
  .description('Generate condition-catalog.json from fixture-summary.json')
  .requiredOption('--summary <path>', 'Path to fixture-summary.json')
  .requiredOption('--out <path>', 'Output path for condition-catalog.json')
  .requiredOption('--domain <name>', 'Domain name (e.g. order, user)')
  .action((options) => {
    try {
      generateConditionCatalog({
        summaryPath: options.summary,
        outPath: options.out,
        domain: options.domain,
      });
    } catch (err) {
      console.error('Error:', (err as Error).message);
      process.exit(1);
    }
  });

program
  .command('scan-code')
  .description('Scan source files for conditions using text pattern matching')
  .requiredOption('--project <dir>', 'Project source directory to scan')
  .requiredOption('--out <path>', 'Output path for code-conditions.json')
  .option('--include <patterns>', 'Comma-separated glob patterns to include (e.g. "src/**/*.ts")')
  .option('--ignore <patterns>', 'Comma-separated directory names to ignore')
  .action((options) => {
    try {
      const include = options.include ? options.include.split(',').map((s: string) => s.trim()) : undefined;
      const ignore = options.ignore ? options.ignore.split(',').map((s: string) => s.trim()) : undefined;
      scanCode({ projectDir: options.project, outPath: options.out, include, ignore });
    } catch (err) {
      console.error('Error:', (err as Error).message);
      process.exit(1);
    }
  });

program
  .command('scan-ts')
  .description('Scan TypeScript source files for conditions using AST analysis (ts-morph)')
  .requiredOption('--project <dir>', 'Project source directory to scan')
  .requiredOption('--out <path>', 'Output path for ts-conditions.json')
  .option('--tsconfig <path>', 'Path to tsconfig.json')
  .action((options) => {
    try {
      scanTypescript({
        projectDir: options.project,
        outPath: options.out,
        tsConfigPath: options.tsconfig,
      });
    } catch (err) {
      console.error('Error:', (err as Error).message);
      process.exit(1);
    }
  });

program
  .command('summarize-conditions')
  .description('Summarize code-conditions.json or ts-conditions.json into fixture-summary format')
  .requiredOption('--conditions <path>', 'Path to code-conditions.json or ts-conditions.json')
  .requiredOption('--out <path>', 'Output path for summary JSON')
  .action((options) => {
    try {
      summarizeConditions({
        conditionsPath: options.conditions,
        outPath: options.out,
      });
    } catch (err) {
      console.error('Error:', (err as Error).message);
      process.exit(1);
    }
  });

program
  .command('show-summary')
  .description('Display a summary JSON file in human-readable plain text')
  .requiredOption('--summary <path>', 'Path to summary JSON file (ts-summary.json, code-summary.json, fixture-summary.json)')
  .option('--fields <fields>', 'Comma-separated list of fields to display')
  .option('--out <path>', 'Save output to a file (.txt or .md) instead of printing')
  .action((options) => {
    try {
      const fields = options.fields ? options.fields.split(',').map((s: string) => s.trim()) : undefined;
      showSummary({ summaryPath: options.summary, fields, outPath: options.out });
    } catch (err) {
      console.error('Error:', (err as Error).message);
      process.exit(1);
    }
  });

program
  .command('init-config')
  .description('Initialize testtree.config.json and workspace files in the current directory')
  .option('--force', 'Overwrite existing files', false)
  .action((options) => {
    try {
      initConfig({ force: options.force });
    } catch (err) {
      console.error('Error:', (err as Error).message);
      process.exit(1);
    }
  });

program
  .command('flow')
  .description('Run the full TestTree workflow using testtree.config.json or defaults')
  .option('--config <path>', 'Path to testtree.config.json', 'testtree.config.json')
  .action((options) => {
    try {
      const config = loadConfig(options.config);
      runFlow(config);
    } catch (err) {
      console.error('Error:', (err as Error).message);
      process.exit(1);
    }
  });

program
  .command('merge-summary')
  .description('Compare code conditions vs fixture coverage and generate coverage-summary.json')
  .requiredOption('--code-summary <path>', 'Path to ts-summary.json or code-summary.json')
  .requiredOption('--fixture-summary <path>', 'Path to fixture-summary.json')
  .requiredOption('--out <path>', 'Output path for coverage-summary.json')
  .action((options) => {
    try {
      mergeSummaries({
        codeSummaryPath: options.codeSummary,
        fixtureSummaryPath: options.fixtureSummary,
        outPath: options.out,
      });
    } catch (err) {
      console.error('Error:', (err as Error).message);
      process.exit(1);
    }
  });

program
  .command('merge-conditions')
  .description('Merge conditions from multiple sources into a unified condition catalog')
  .option('--code-summary <path>', 'Path to ts-summary.json or code-summary.json')
  .option('--fixture-summary <path>', 'Path to fixture-summary.json')
  .option('--db-summary <path>', 'Path to db-summary.json')
  .option('--schema-summary <path>', 'Path to schema-summary.json')
  .requiredOption('--out <path>', 'Output path for unified-condition-catalog.json')
  .option('--domain <name>', 'Domain name (e.g. order, user)', 'unknown')
  .action((options) => {
    try {
      mergeConditions({
        codeSummaryPath: options.codeSummary,
        fixtureSummaryPath: options.fixtureSummary,
        dbSummaryPath: options.dbSummary,
        schemaSummaryPath: options.schemaSummary,
        outPath: options.out,
        domain: options.domain,
      });
    } catch (err) {
      console.error('Error:', (err as Error).message);
      process.exit(1);
    }
  });

program
  .command('scan-db')
  .description('Scan a MongoDB collection for distinct field values (read-only)')
  .requiredOption('--uri <uri>', 'MongoDB connection URI')
  .requiredOption('--database <name>', 'Database name')
  .requiredOption('--collection <name>', 'Collection name')
  .requiredOption('--fields <fields>', 'Comma-separated field names to scan (e.g. "status,payment.type")')
  .requiredOption('--out <path>', 'Output path for db-summary.json')
  .action((options) => {
    const fields = options.fields.split(',').map((s: string) => s.trim());
    scanDb({ uri: options.uri, database: options.database, collection: options.collection, fields, outPath: options.out })
      .catch((err) => {
        console.error('Error:', (err as Error).message);
        process.exit(1);
      });
  });

program
  .command('scan-schema')
  .description('Scan TypeScript source for enums, Zod schemas, and class-validator decorators')
  .requiredOption('--project <dir>', 'Project source directory to scan')
  .requiredOption('--out <path>', 'Output path for schema-summary.json')
  .option('--tsconfig <path>', 'Path to tsconfig.json')
  .action((options) => {
    try {
      scanSchema({ projectDir: options.project, outPath: options.out, tsConfigPath: options.tsconfig });
    } catch (err) {
      console.error('Error:', (err as Error).message);
      process.exit(1);
    }
  });

program
  .command('suggest-variants')
  .description('Generate suggested variant patches from missing values in coverage-summary.json')
  .requiredOption('--coverage <path>', 'Path to coverage-summary.json')
  .requiredOption('--out <path>', 'Output path for suggested-variants.json')
  .action((options) => {
    try {
      suggestVariants({ coveragePath: options.coverage, outPath: options.out });
    } catch (err) {
      console.error('Error:', (err as Error).message);
      process.exit(1);
    }
  });

program
  .command('generate-template')
  .description('Generate base-template.json from a sample JSON file')
  .requiredOption('--sample <path>', 'Path to sample.json')
  .requiredOption('--out <path>', 'Output path for base-template.json')
  .option('--ignore <fields>', 'Comma-separated extra fields to remove (e.g. "_id,createdAt")')
  .action((options) => {
    try {
      const ignore = options.ignore ? options.ignore.split(',').map((s: string) => s.trim()) : undefined;
      generateTemplate({ samplePath: options.sample, outPath: options.out, ignore });
    } catch (err) {
      console.error('Error:', (err as Error).message);
      process.exit(1);
    }
  });

program.parse();
