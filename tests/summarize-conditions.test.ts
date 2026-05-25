import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { summarizeConditions } from '../src/core/summarize-conditions';
import { writeJson } from '../src/core/write-json';

const TMP_DIR = join(__dirname, '__tmp_summarize__');
const CONDITIONS_PATH = join(TMP_DIR, 'conditions.json');
const OUT_PATH = join(TMP_DIR, 'summary.json');

const sampleConditions = {
  conditions: [
    { fieldPath: 'payment.type', operator: '===', value: 'COD', file: 'a.ts', line: 1, sourceType: 'comparison' },
    { fieldPath: 'payment.type', operator: '===', value: 'BANK', file: 'a.ts', line: 2, sourceType: 'comparison' },
    { fieldPath: 'payment.type', operator: '===', value: 'COD', file: 'b.ts', line: 5, sourceType: 'comparison' },
    { fieldPath: 'status', operator: '===', value: 'PENDING', file: 'a.ts', line: 3, sourceType: 'comparison' },
    { fieldPath: 'status', operator: '===', value: 'COMPLETE', file: 'a.ts', line: 4, sourceType: 'binary-expression' },
    { fieldPath: 'status', operator: '===', value: 'CANCEL', file: 'b.ts', line: 1, sourceType: 'switch-case' },
  ],
  meta: { scanner: 'text', accuracy: 'best-effort' },
};

beforeEach(() => {
  mkdirSync(TMP_DIR, { recursive: true });
  writeJson(CONDITIONS_PATH, sampleConditions);
});

afterEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true });
});

describe('summarizeConditions', () => {
  it('groups conditions by fieldPath', () => {
    summarizeConditions({ conditionsPath: CONDITIONS_PATH, outPath: OUT_PATH });
    const summary = JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
    expect(summary.fields['payment.type']).toBeDefined();
    expect(summary.fields['status']).toBeDefined();
  });

  it('counts unique values per field', () => {
    summarizeConditions({ conditionsPath: CONDITIONS_PATH, outPath: OUT_PATH });
    const summary = JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
    expect(summary.fields['payment.type'].count).toBe(2);
    expect(summary.fields['status'].count).toBe(3);
  });

  it('deduplicates repeated values', () => {
    summarizeConditions({ conditionsPath: CONDITIONS_PATH, outPath: OUT_PATH });
    const summary = JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
    const paymentValues: string[] = summary.fields['payment.type'].values;
    const uniqueCount = new Set(paymentValues).size;
    expect(uniqueCount).toBe(paymentValues.length);
  });

  it('output format is compatible with fixture-summary format', () => {
    summarizeConditions({ conditionsPath: CONDITIONS_PATH, outPath: OUT_PATH });
    const summary = JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
    expect(summary).toHaveProperty('fields');
    const firstField = Object.values(summary.fields)[0] as { count: number; values: unknown[] };
    expect(firstField).toHaveProperty('count');
    expect(firstField).toHaveProperty('values');
    expect(Array.isArray(firstField.values)).toBe(true);
  });

  it('ignores invalid condition records', () => {
    const withInvalid = {
      conditions: [
        ...sampleConditions.conditions,
        { fieldPath: '', operator: '===', value: 'X', file: 'a.ts', line: 1, sourceType: 'comparison' },
        { operator: '===', value: 'Y', file: 'a.ts', line: 2, sourceType: 'comparison' },
        null,
        'bad-record',
      ],
      meta: sampleConditions.meta,
    };
    writeJson(CONDITIONS_PATH, withInvalid);
    expect(() =>
      summarizeConditions({ conditionsPath: CONDITIONS_PATH, outPath: OUT_PATH })
    ).not.toThrow();
    const summary = JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
    expect(summary.fields['']).toBeUndefined();
  });

  it('exports summary file correctly', () => {
    summarizeConditions({ conditionsPath: CONDITIONS_PATH, outPath: OUT_PATH });
    expect(() => JSON.parse(readFileSync(OUT_PATH, 'utf-8'))).not.toThrow();
  });

  it('works with ts-morph scanner output (binary-expression sourceType)', () => {
    const tsConditions = {
      conditions: [
        { fieldPath: 'order.status', operator: '===', value: 'COMPLETE', file: 'a.ts', line: 1, sourceType: 'binary-expression' },
        { fieldPath: 'order.status', operator: '===', value: 'PENDING', file: 'a.ts', line: 2, sourceType: 'switch-case' },
      ],
      meta: { scanner: 'ts-morph', accuracy: 'ast-based' },
    };
    writeJson(CONDITIONS_PATH, tsConditions);
    summarizeConditions({ conditionsPath: CONDITIONS_PATH, outPath: OUT_PATH });
    const summary = JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
    expect(summary.fields['order.status'].count).toBe(2);
    expect(summary.fields['order.status'].values).toContain('COMPLETE');
    expect(summary.fields['order.status'].values).toContain('PENDING');
  });
});
