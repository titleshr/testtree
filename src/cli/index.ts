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
import { loadConfig } from '../core/load-config';
import { initConfig } from '../core/init-config';
import { runFlow } from '../core/run-flow';

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

program.parse();
