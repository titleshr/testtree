import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { suggestVariants } from '../src/core/suggest-variants';
import { readJson } from '../src/core/read-json';

const TMP_DIR = join(__dirname, '__tmp_suggest_variants__');
const COVERAGE_PATH = join(TMP_DIR, 'coverage-summary.json');
const OUT_PATH = join(TMP_DIR, 'suggested-variants.json');

function writeCoverage(data: unknown) {
  writeFileSync(COVERAGE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

beforeEach(() => {
  mkdirSync(TMP_DIR, { recursive: true });
});

afterEach(() => {
  if (existsSync(TMP_DIR)) rmSync(TMP_DIR, { recursive: true, force: true });
});

describe('suggestVariants', () => {
  it('generates one suggested variant per missing value', () => {
    writeCoverage({
      fields: {
        'payment.type': {
          codeValues: ['COD', 'BANK', 'QR'],
          fixtureValues: ['COD', 'BANK'],
          missingInFixtures: ['QR'],
          extraInFixtures: [],
          coverage: { covered: 2, total: 3, percent: 66.67 },
        },
      },
    });

    suggestVariants({ coveragePath: COVERAGE_PATH, outPath: OUT_PATH });

    const result = readJson(OUT_PATH) as unknown[];
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: 'payment_type_qr_case',
      purpose: 'Cover missing value payment.type=QR',
      patch: { 'payment.type': 'QR' },
    });
  });

  it('generates multiple variants for multiple missing values', () => {
    writeCoverage({
      fields: {
        status: {
          codeValues: ['PENDING', 'COMPLETE', 'CANCEL'],
          fixtureValues: ['PENDING'],
          missingInFixtures: ['COMPLETE', 'CANCEL'],
          extraInFixtures: [],
          coverage: { covered: 1, total: 3, percent: 33.33 },
        },
      },
    });

    suggestVariants({ coveragePath: COVERAGE_PATH, outPath: OUT_PATH });

    const result = readJson(OUT_PATH) as unknown[];
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ name: 'status_complete_case', patch: { status: 'COMPLETE' } });
    expect(result[1]).toMatchObject({ name: 'status_cancel_case', patch: { status: 'CANCEL' } });
  });

  it('generates variants across multiple fields', () => {
    writeCoverage({
      fields: {
        status: {
          codeValues: ['PENDING', 'CANCEL'],
          fixtureValues: ['PENDING'],
          missingInFixtures: ['CANCEL'],
          extraInFixtures: [],
          coverage: { covered: 1, total: 2, percent: 50 },
        },
        'payment.type': {
          codeValues: ['COD', 'QR'],
          fixtureValues: ['COD'],
          missingInFixtures: ['QR'],
          extraInFixtures: [],
          coverage: { covered: 1, total: 2, percent: 50 },
        },
      },
    });

    suggestVariants({ coveragePath: COVERAGE_PATH, outPath: OUT_PATH });

    const result = readJson(OUT_PATH) as unknown[];
    expect(result).toHaveLength(2);
    const names = (result as { name: string }[]).map((v) => v.name);
    expect(names).toContain('status_cancel_case');
    expect(names).toContain('payment_type_qr_case');
  });

  it('skips fields with no missing values', () => {
    writeCoverage({
      fields: {
        status: {
          codeValues: ['PENDING'],
          fixtureValues: ['PENDING'],
          missingInFixtures: [],
          extraInFixtures: [],
          coverage: { covered: 1, total: 1, percent: 100 },
        },
      },
    });

    suggestVariants({ coveragePath: COVERAGE_PATH, outPath: OUT_PATH });

    const result = readJson(OUT_PATH) as unknown[];
    expect(result).toHaveLength(0);
  });

  it('returns empty array when coverage has no fields', () => {
    writeCoverage({ fields: {} });
    suggestVariants({ coveragePath: COVERAGE_PATH, outPath: OUT_PATH });
    const result = readJson(OUT_PATH) as unknown[];
    expect(result).toHaveLength(0);
  });

  it('handles non-string values (number, boolean) in missingInFixtures', () => {
    writeCoverage({
      fields: {
        'payment.amount': {
          codeValues: [0, 100],
          fixtureValues: [100],
          missingInFixtures: [0],
          extraInFixtures: [],
          coverage: { covered: 1, total: 2, percent: 50 },
        },
        'payment.isCompleted': {
          codeValues: [true, false],
          fixtureValues: [true],
          missingInFixtures: [false],
          extraInFixtures: [],
          coverage: { covered: 1, total: 2, percent: 50 },
        },
      },
    });

    suggestVariants({ coveragePath: COVERAGE_PATH, outPath: OUT_PATH });

    const result = readJson(OUT_PATH) as { name: string; patch: Record<string, unknown> }[];
    expect(result).toHaveLength(2);

    const amountVariant = result.find((v) => v.name === 'payment_amount_0_case');
    expect(amountVariant?.patch['payment.amount']).toBe(0);

    const boolVariant = result.find((v) => v.name === 'payment_iscompleted_false_case');
    expect(boolVariant?.patch['payment.isCompleted']).toBe(false);
  });

  it('uses correct snake_case naming for dotted field paths', () => {
    writeCoverage({
      fields: {
        'basket.products.0.isFree': {
          codeValues: [true],
          fixtureValues: [],
          missingInFixtures: [true],
          extraInFixtures: [],
          coverage: { covered: 0, total: 1, percent: 0 },
        },
      },
    });

    suggestVariants({ coveragePath: COVERAGE_PATH, outPath: OUT_PATH });

    const result = readJson(OUT_PATH) as { name: string }[];
    expect(result[0].name).toBe('basket_products_0_isfree_true_case');
  });

  it('includes purpose string in correct format', () => {
    writeCoverage({
      fields: {
        status: {
          codeValues: ['CANCEL'],
          fixtureValues: [],
          missingInFixtures: ['CANCEL'],
          extraInFixtures: [],
          coverage: { covered: 0, total: 1, percent: 0 },
        },
      },
    });

    suggestVariants({ coveragePath: COVERAGE_PATH, outPath: OUT_PATH });

    const result = readJson(OUT_PATH) as { purpose: string }[];
    expect(result[0].purpose).toBe('Cover missing value status=CANCEL');
  });
});
