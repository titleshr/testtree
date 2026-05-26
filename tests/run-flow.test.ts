import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';

vi.mock('../src/core/scan-typescript', () => ({ scanTypescript: vi.fn() }));
vi.mock('../src/core/summarize-conditions', () => ({ summarizeConditions: vi.fn() }));
vi.mock('../src/core/generate-condition-catalog', () => ({ generateConditionCatalog: vi.fn() }));
vi.mock('../src/core/generate-fixtures', () => ({ generateFixtures: vi.fn() }));
vi.mock('../src/core/inspect-fixtures', () => ({ inspectFixtures: vi.fn() }));
vi.mock('../src/core/merge-summaries', () => ({ mergeSummaries: vi.fn() }));
vi.mock('../src/core/scan-db', () => ({ scanDb: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../src/core/suggest-variants', () => ({ suggestVariants: vi.fn() }));

import { runFlow } from '../src/core/run-flow';
import { scanTypescript } from '../src/core/scan-typescript';
import { summarizeConditions } from '../src/core/summarize-conditions';
import { generateConditionCatalog } from '../src/core/generate-condition-catalog';
import { generateFixtures } from '../src/core/generate-fixtures';
import { inspectFixtures } from '../src/core/inspect-fixtures';
import { mergeSummaries } from '../src/core/merge-summaries';
import { scanDb } from '../src/core/scan-db';
import { suggestVariants } from '../src/core/suggest-variants';

const TMP_DIR = join(__dirname, '__tmp_run_flow__');

function makeConfig(extra: object = {}) {
  const base = join(TMP_DIR, 'base-template.json');
  const variants = join(TMP_DIR, 'variants.json');
  writeFileSync(base, JSON.stringify({ status: 'PENDING' }));
  writeFileSync(variants, JSON.stringify([]));
  return {
    project: TMP_DIR,
    outputDir: TMP_DIR,
    domain: 'test',
    base,
    variants,
    fixtures: join(TMP_DIR, 'fixtures'),
    ...extra,
  };
}

beforeEach(() => {
  mkdirSync(TMP_DIR, { recursive: true });
  vi.clearAllMocks();
});

afterEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true });
});

describe('runFlow — without db config', () => {
  it('runs 7 steps: scan-ts, summarize, catalog, generate, inspect, merge-summary, suggest-variants', async () => {
    await runFlow(makeConfig());

    expect(vi.mocked(scanTypescript)).toHaveBeenCalledOnce();
    expect(vi.mocked(summarizeConditions)).toHaveBeenCalledOnce();
    expect(vi.mocked(generateConditionCatalog)).toHaveBeenCalledOnce();
    expect(vi.mocked(generateFixtures)).toHaveBeenCalledOnce();
    expect(vi.mocked(inspectFixtures)).toHaveBeenCalledOnce();
    expect(vi.mocked(mergeSummaries)).toHaveBeenCalledOnce();
    expect(vi.mocked(suggestVariants)).toHaveBeenCalledOnce();
  });

  it('skips scan-db entirely', async () => {
    await runFlow(makeConfig());
    expect(vi.mocked(scanDb)).not.toHaveBeenCalled();
  });

  it('calls mergeSummaries without dbSummaryPath', async () => {
    await runFlow(makeConfig());
    expect(vi.mocked(mergeSummaries)).toHaveBeenCalledWith({
      codeSummaryPath: join(TMP_DIR, 'ts-summary.json'),
      fixtureSummaryPath: join(TMP_DIR, 'fixture-summary.json'),
      outPath: join(TMP_DIR, 'coverage-summary.json'),
    });
  });

  it('calls suggestVariants in print-only mode (no outPath)', async () => {
    await runFlow(makeConfig());
    expect(vi.mocked(suggestVariants)).toHaveBeenCalledWith({
      coveragePath: join(TMP_DIR, 'coverage-summary.json'),
    });
  });
});

describe('runFlow — with db config', () => {
  const DB_CONFIG = {
    db: {
      uri: 'mongodb://localhost:27017',
      database: 'mydb',
      collection: 'orders',
      fields: ['status', 'payment.type'],
    },
  };

  it('runs 8 steps including scan-db', async () => {
    await runFlow(makeConfig(DB_CONFIG));

    expect(vi.mocked(scanTypescript)).toHaveBeenCalledOnce();
    expect(vi.mocked(summarizeConditions)).toHaveBeenCalledOnce();
    expect(vi.mocked(generateConditionCatalog)).toHaveBeenCalledOnce();
    expect(vi.mocked(scanDb)).toHaveBeenCalledOnce();
    expect(vi.mocked(generateFixtures)).toHaveBeenCalledOnce();
    expect(vi.mocked(inspectFixtures)).toHaveBeenCalledOnce();
    expect(vi.mocked(mergeSummaries)).toHaveBeenCalledOnce();
    expect(vi.mocked(suggestVariants)).toHaveBeenCalledOnce();
  });

  it('calls scanDb with correct connection args and output path', async () => {
    await runFlow(makeConfig(DB_CONFIG));
    expect(vi.mocked(scanDb)).toHaveBeenCalledWith({
      uri: 'mongodb://localhost:27017',
      database: 'mydb',
      collection: 'orders',
      fields: ['status', 'payment.type'],
      outPath: join(TMP_DIR, 'db-summary.json'),
    });
  });

  it('passes dbSummaryPath and fields to mergeSummaries so coverage is scoped to db.fields', async () => {
    await runFlow(makeConfig(DB_CONFIG));
    expect(vi.mocked(mergeSummaries)).toHaveBeenCalledWith({
      codeSummaryPath: join(TMP_DIR, 'ts-summary.json'),
      fixtureSummaryPath: join(TMP_DIR, 'fixture-summary.json'),
      dbSummaryPath: join(TMP_DIR, 'db-summary.json'),
      fields: ['status', 'payment.type'],
      outPath: join(TMP_DIR, 'coverage-summary.json'),
    });
  });

  it('calls suggestVariants with db.fields and dbSummaryPath for source annotation', async () => {
    await runFlow(makeConfig(DB_CONFIG));
    expect(vi.mocked(suggestVariants)).toHaveBeenCalledWith({
      coveragePath: join(TMP_DIR, 'coverage-summary.json'),
      fields: ['status', 'payment.type'],
      dbSummaryPath: join(TMP_DIR, 'db-summary.json'),
    });
  });
});

describe('runFlow — error cases', () => {
  it('throws when base-template.json is missing', async () => {
    await expect(
      runFlow({
        project: TMP_DIR,
        outputDir: TMP_DIR,
        domain: 'test',
        base: join(TMP_DIR, 'base-template.json'),
        variants: join(TMP_DIR, 'variants.json'),
        fixtures: join(TMP_DIR, 'fixtures'),
      })
    ).rejects.toThrow('base-template.json');
  });

  it('throws when variants.json is missing', async () => {
    const base = join(TMP_DIR, 'base-template.json');
    writeFileSync(base, JSON.stringify({}));
    await expect(
      runFlow({
        project: TMP_DIR,
        outputDir: TMP_DIR,
        domain: 'test',
        base,
        variants: join(TMP_DIR, 'variants.json'),
        fixtures: join(TMP_DIR, 'fixtures'),
      })
    ).rejects.toThrow('variants.json');
  });
});
