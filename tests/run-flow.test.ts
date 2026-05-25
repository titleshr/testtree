import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';

vi.mock('../src/core/scan-typescript', () => ({ scanTypescript: vi.fn() }));
vi.mock('../src/core/summarize-conditions', () => ({ summarizeConditions: vi.fn() }));
vi.mock('../src/core/generate-condition-catalog', () => ({ generateConditionCatalog: vi.fn() }));
vi.mock('../src/core/generate-fixtures', () => ({ generateFixtures: vi.fn() }));
vi.mock('../src/core/inspect-fixtures', () => ({ inspectFixtures: vi.fn() }));
vi.mock('../src/core/merge-summaries', () => ({ mergeSummaries: vi.fn() }));

import { runFlow } from '../src/core/run-flow';
import { scanTypescript } from '../src/core/scan-typescript';
import { summarizeConditions } from '../src/core/summarize-conditions';
import { generateConditionCatalog } from '../src/core/generate-condition-catalog';
import { generateFixtures } from '../src/core/generate-fixtures';
import { inspectFixtures } from '../src/core/inspect-fixtures';
import { mergeSummaries } from '../src/core/merge-summaries';

const TMP_DIR = join(__dirname, '__tmp_run_flow__');

beforeEach(() => {
  mkdirSync(TMP_DIR, { recursive: true });
  vi.clearAllMocks();
});

afterEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true });
});

describe('runFlow', () => {
  it('runs all 6 steps with correct output paths', () => {
    const base = join(TMP_DIR, 'base-template.json');
    const variants = join(TMP_DIR, 'variants.json');
    const fixtures = join(TMP_DIR, 'fixtures');
    writeFileSync(base, JSON.stringify({ status: 'PENDING' }));
    writeFileSync(variants, JSON.stringify([]));

    const config = {
      project: TMP_DIR,
      outputDir: TMP_DIR,
      domain: 'test',
      base,
      variants,
      fixtures,
    };

    runFlow(config);

    expect(vi.mocked(scanTypescript)).toHaveBeenCalledWith({
      projectDir: TMP_DIR,
      outPath: join(TMP_DIR, 'ts-conditions.json'),
    });
    expect(vi.mocked(summarizeConditions)).toHaveBeenCalledWith({
      conditionsPath: join(TMP_DIR, 'ts-conditions.json'),
      outPath: join(TMP_DIR, 'ts-summary.json'),
    });
    expect(vi.mocked(generateConditionCatalog)).toHaveBeenCalledWith({
      summaryPath: join(TMP_DIR, 'ts-summary.json'),
      outPath: join(TMP_DIR, 'condition-catalog.json'),
      domain: 'test',
    });
    expect(vi.mocked(generateFixtures)).toHaveBeenCalledWith({
      basePath: base,
      variantsPath: variants,
      outDir: fixtures,
    });
    expect(vi.mocked(inspectFixtures)).toHaveBeenCalledWith({
      fixturesDir: fixtures,
      outPath: join(TMP_DIR, 'fixture-summary.json'),
    });
    expect(vi.mocked(mergeSummaries)).toHaveBeenCalledWith({
      codeSummaryPath: join(TMP_DIR, 'ts-summary.json'),
      fixtureSummaryPath: join(TMP_DIR, 'fixture-summary.json'),
      outPath: join(TMP_DIR, 'coverage-summary.json'),
    });
  });

  it('throws when base-template.json is missing', () => {
    const config = {
      project: TMP_DIR,
      outputDir: TMP_DIR,
      domain: 'test',
      base: join(TMP_DIR, 'base-template.json'),
      variants: join(TMP_DIR, 'variants.json'),
      fixtures: join(TMP_DIR, 'fixtures'),
    };
    expect(() => runFlow(config)).toThrow('base-template.json');
  });

  it('throws when variants.json is missing', () => {
    const base = join(TMP_DIR, 'base-template.json');
    writeFileSync(base, JSON.stringify({}));
    const config = {
      project: TMP_DIR,
      outputDir: TMP_DIR,
      domain: 'test',
      base,
      variants: join(TMP_DIR, 'variants.json'),
      fixtures: join(TMP_DIR, 'fixtures'),
    };
    expect(() => runFlow(config)).toThrow('variants.json');
  });
});
