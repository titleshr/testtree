import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { generateConditionCatalog } from '../src/core/generate-condition-catalog';
import { writeJson } from '../src/core/write-json';

const TMP_DIR = join(__dirname, '__tmp_catalog__');
const SUMMARY_PATH = join(TMP_DIR, 'fixture-summary.json');
const OUT_PATH = join(TMP_DIR, 'condition-catalog.json');

const sampleSummary = {
  fields: {
    status: { count: 3, values: ['COMPLETE', 'PENDING', 'PRE_PENDING'] },
    'payment.type': { count: 2, values: ['COD', 'BANK'] },
    'payment.isCompleted': { count: 1, values: [true] },
  },
};

beforeEach(() => {
  mkdirSync(TMP_DIR, { recursive: true });
  writeJson(SUMMARY_PATH, sampleSummary);
});

afterEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true });
});

describe('generateConditionCatalog', () => {
  it('generates a condition catalog from fixture summary', () => {
    generateConditionCatalog({ summaryPath: SUMMARY_PATH, outPath: OUT_PATH, domain: 'order' });
    const catalog = JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
    expect(catalog.domain).toBe('order');
    expect(catalog.fields).toHaveLength(3);
  });

  it('marks fields as condition fields when count > 1', () => {
    generateConditionCatalog({ summaryPath: SUMMARY_PATH, outPath: OUT_PATH, domain: 'order' });
    const catalog = JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
    const statusField = catalog.fields.find((f: { fieldPath: string }) => f.fieldPath === 'status');
    const paymentCompleted = catalog.fields.find((f: { fieldPath: string }) => f.fieldPath === 'payment.isCompleted');
    expect(statusField.isConditionField).toBe(true);
    expect(paymentCompleted.isConditionField).toBe(false);
  });

  it('sets sampleValue to the first value in the list', () => {
    generateConditionCatalog({ summaryPath: SUMMARY_PATH, outPath: OUT_PATH, domain: 'order' });
    const catalog = JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
    const statusField = catalog.fields.find((f: { fieldPath: string }) => f.fieldPath === 'status');
    expect(statusField.sampleValue).toBe('COMPLETE');
  });

  it('sets possibleValues to all values from the summary', () => {
    generateConditionCatalog({ summaryPath: SUMMARY_PATH, outPath: OUT_PATH, domain: 'order' });
    const catalog = JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
    const paymentType = catalog.fields.find((f: { fieldPath: string }) => f.fieldPath === 'payment.type');
    expect(paymentType.possibleValues).toEqual(['COD', 'BANK']);
  });

  it('sets sources to ["fixtures"]', () => {
    generateConditionCatalog({ summaryPath: SUMMARY_PATH, outPath: OUT_PATH, domain: 'order' });
    const catalog = JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
    expect(catalog.fields[0].sources).toEqual(['fixtures']);
  });

  it('exports a valid JSON file', () => {
    generateConditionCatalog({ summaryPath: SUMMARY_PATH, outPath: OUT_PATH, domain: 'order' });
    expect(() => JSON.parse(readFileSync(OUT_PATH, 'utf-8'))).not.toThrow();
  });
});
