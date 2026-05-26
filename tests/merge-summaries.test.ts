import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { mergeSummaries } from '../src/core/merge-summaries';
import { writeJson } from '../src/core/write-json';

const TMP_DIR = join(__dirname, '__tmp_merge__');
const CODE_SUMMARY_PATH = join(TMP_DIR, 'code-summary.json');
const FIXTURE_SUMMARY_PATH = join(TMP_DIR, 'fixture-summary.json');
const OUT_PATH = join(TMP_DIR, 'coverage-summary.json');

beforeEach(() => {
  mkdirSync(TMP_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true });
});

describe('mergeSummaries', () => {
  it('merges code summary and fixture summary', () => {
    writeJson(CODE_SUMMARY_PATH, {
      fields: { 'payment.type': { count: 2, values: ['COD', 'BANK'] } },
    });
    writeJson(FIXTURE_SUMMARY_PATH, {
      fields: { 'payment.type': { count: 1, values: ['COD'] } },
    });
    mergeSummaries({ codeSummaryPath: CODE_SUMMARY_PATH, fixtureSummaryPath: FIXTURE_SUMMARY_PATH, outPath: OUT_PATH });
    const result = JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
    expect(result.fields['payment.type']).toBeDefined();
  });

  it('detects missing values in fixtures', () => {
    writeJson(CODE_SUMMARY_PATH, {
      fields: { 'payment.type': { count: 3, values: ['COD', 'BANK', 'QR'] } },
    });
    writeJson(FIXTURE_SUMMARY_PATH, {
      fields: { 'payment.type': { count: 2, values: ['COD', 'BANK'] } },
    });
    mergeSummaries({ codeSummaryPath: CODE_SUMMARY_PATH, fixtureSummaryPath: FIXTURE_SUMMARY_PATH, outPath: OUT_PATH });
    const result = JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
    expect(result.fields['payment.type'].missingInFixtures).toEqual(['QR']);
  });

  it('detects extra values in fixtures', () => {
    writeJson(CODE_SUMMARY_PATH, {
      fields: { 'payment.type': { count: 1, values: ['COD'] } },
    });
    writeJson(FIXTURE_SUMMARY_PATH, {
      fields: { 'payment.type': { count: 2, values: ['COD', 'BANK'] } },
    });
    mergeSummaries({ codeSummaryPath: CODE_SUMMARY_PATH, fixtureSummaryPath: FIXTURE_SUMMARY_PATH, outPath: OUT_PATH });
    const result = JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
    expect(result.fields['payment.type'].extraInFixtures).toEqual(['BANK']);
  });

  it('calculates coverage percentage correctly', () => {
    writeJson(CODE_SUMMARY_PATH, {
      fields: { status: { count: 3, values: ['COMPLETE', 'PENDING', 'CANCEL'] } },
    });
    writeJson(FIXTURE_SUMMARY_PATH, {
      fields: { status: { count: 2, values: ['COMPLETE', 'PENDING'] } },
    });
    mergeSummaries({ codeSummaryPath: CODE_SUMMARY_PATH, fixtureSummaryPath: FIXTURE_SUMMARY_PATH, outPath: OUT_PATH });
    const result = JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
    expect(result.fields.status.coverage.covered).toBe(2);
    expect(result.fields.status.coverage.total).toBe(3);
    expect(result.fields.status.coverage.percent).toBeCloseTo(66.67, 1);
  });

  it('handles field existing only in code summary', () => {
    writeJson(CODE_SUMMARY_PATH, {
      fields: { 'order.type': { count: 1, values: ['INTERNAL'] } },
    });
    writeJson(FIXTURE_SUMMARY_PATH, { fields: {} });
    mergeSummaries({ codeSummaryPath: CODE_SUMMARY_PATH, fixtureSummaryPath: FIXTURE_SUMMARY_PATH, outPath: OUT_PATH });
    const result = JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
    const field = result.fields['order.type'];
    expect(field.codeValues).toEqual(['INTERNAL']);
    expect(field.fixtureValues).toEqual([]);
    expect(field.missingInFixtures).toEqual(['INTERNAL']);
    expect(field.extraInFixtures).toEqual([]);
    expect(field.coverage.covered).toBe(0);
    expect(field.coverage.total).toBe(1);
    expect(field.coverage.percent).toBe(0);
  });

  it('handles field existing only in fixture summary', () => {
    writeJson(CODE_SUMMARY_PATH, { fields: {} });
    writeJson(FIXTURE_SUMMARY_PATH, {
      fields: { 'extra.field': { count: 1, values: ['X'] } },
    });
    mergeSummaries({ codeSummaryPath: CODE_SUMMARY_PATH, fixtureSummaryPath: FIXTURE_SUMMARY_PATH, outPath: OUT_PATH });
    const result = JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
    const field = result.fields['extra.field'];
    expect(field.codeValues).toEqual([]);
    expect(field.fixtureValues).toEqual(['X']);
    expect(field.missingInFixtures).toEqual([]);
    expect(field.extraInFixtures).toEqual(['X']);
    expect(field.coverage.covered).toBe(0);
    expect(field.coverage.total).toBe(0);
    expect(field.coverage.percent).toBe(0);
  });

  it('exports coverage-summary.json correctly', () => {
    writeJson(CODE_SUMMARY_PATH, {
      fields: { status: { count: 1, values: ['COMPLETE'] } },
    });
    writeJson(FIXTURE_SUMMARY_PATH, {
      fields: { status: { count: 1, values: ['COMPLETE'] } },
    });
    mergeSummaries({ codeSummaryPath: CODE_SUMMARY_PATH, fixtureSummaryPath: FIXTURE_SUMMARY_PATH, outPath: OUT_PATH });
    expect(() => JSON.parse(readFileSync(OUT_PATH, 'utf-8'))).not.toThrow();
    const result = JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
    expect(result).toHaveProperty('fields');
  });

  it('handles empty summaries safely', () => {
    writeJson(CODE_SUMMARY_PATH, { fields: {} });
    writeJson(FIXTURE_SUMMARY_PATH, { fields: {} });
    expect(() =>
      mergeSummaries({ codeSummaryPath: CODE_SUMMARY_PATH, fixtureSummaryPath: FIXTURE_SUMMARY_PATH, outPath: OUT_PATH })
    ).not.toThrow();
    const result = JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
    expect(result.fields).toEqual({});
  });

  it('merges db values into code values when dbSummaryPath is provided', () => {
    const dbSummaryPath = join(TMP_DIR, 'db-summary.json');
    writeJson(CODE_SUMMARY_PATH, {
      fields: { status: { count: 1, values: ['PENDING'] } },
    });
    writeJson(FIXTURE_SUMMARY_PATH, {
      fields: { status: { count: 1, values: ['PENDING'] } },
    });
    writeJson(dbSummaryPath, {
      fields: { status: { count: 2, values: ['COMPLETE', 'CANCEL'] } },
    });

    mergeSummaries({
      codeSummaryPath: CODE_SUMMARY_PATH,
      fixtureSummaryPath: FIXTURE_SUMMARY_PATH,
      dbSummaryPath,
      outPath: OUT_PATH,
    });

    const result = JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
    const field = result.fields.status;
    // Code + db values: PENDING, COMPLETE, CANCEL
    expect(field.codeValues).toContain('PENDING');
    expect(field.codeValues).toContain('COMPLETE');
    expect(field.codeValues).toContain('CANCEL');
    // Fixture only has PENDING — so COMPLETE and CANCEL are missing
    expect(field.missingInFixtures).toContain('COMPLETE');
    expect(field.missingInFixtures).toContain('CANCEL');
  });

  it('deduplicates values that appear in both code and db', () => {
    const dbSummaryPath = join(TMP_DIR, 'db-summary.json');
    writeJson(CODE_SUMMARY_PATH, {
      fields: { status: { count: 2, values: ['PENDING', 'COMPLETE'] } },
    });
    writeJson(FIXTURE_SUMMARY_PATH, { fields: {} });
    writeJson(dbSummaryPath, {
      fields: { status: { count: 2, values: ['COMPLETE', 'CANCEL'] } },
    });

    mergeSummaries({
      codeSummaryPath: CODE_SUMMARY_PATH,
      fixtureSummaryPath: FIXTURE_SUMMARY_PATH,
      dbSummaryPath,
      outPath: OUT_PATH,
    });

    const result = JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
    const allValues = result.fields.status.codeValues;
    expect(allValues.filter((v: string) => v === 'COMPLETE')).toHaveLength(1);
    expect(allValues).toHaveLength(3); // PENDING, COMPLETE, CANCEL
  });

  it('skips dbSummaryPath gracefully when file does not exist', () => {
    writeJson(CODE_SUMMARY_PATH, {
      fields: { status: { count: 1, values: ['PENDING'] } },
    });
    writeJson(FIXTURE_SUMMARY_PATH, { fields: {} });

    expect(() =>
      mergeSummaries({
        codeSummaryPath: CODE_SUMMARY_PATH,
        fixtureSummaryPath: FIXTURE_SUMMARY_PATH,
        dbSummaryPath: join(TMP_DIR, 'nonexistent.json'),
        outPath: OUT_PATH,
      })
    ).not.toThrow();

    const result = JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
    expect(result.fields.status.codeValues).toEqual(['PENDING']);
  });
});
