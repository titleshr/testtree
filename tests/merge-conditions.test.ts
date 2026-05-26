import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { mergeConditions } from '../src/core/merge-conditions';
import { readJson } from '../src/core/read-json';

const TMP_DIR = join(__dirname, '__tmp_merge_conditions__');
const OUT_PATH = join(TMP_DIR, 'unified-condition-catalog.json');

function write(filename: string, data: unknown) {
  writeFileSync(join(TMP_DIR, filename), JSON.stringify(data, null, 2), 'utf-8');
}

function path(filename: string) {
  return join(TMP_DIR, filename);
}

interface CatalogField {
  fieldPath: string;
  values: { value: unknown; sources: string[] }[];
  sourceCoverage: Record<string, boolean>;
}

interface Catalog {
  domain: string;
  fields: CatalogField[];
}

function readResult(): Catalog {
  return readJson(OUT_PATH) as Catalog;
}

beforeEach(() => {
  mkdirSync(TMP_DIR, { recursive: true });
});

afterEach(() => {
  if (existsSync(TMP_DIR)) rmSync(TMP_DIR, { recursive: true, force: true });
});

describe('mergeConditions', () => {
  it('merges values from two sources and tracks source per value', () => {
    write('code.json', { fields: { 'payment.type': { count: 3, values: ['COD', 'BANK', 'QR'] } } });
    write('fixtures.json', { fields: { 'payment.type': { count: 2, values: ['COD', 'BANK'] } } });

    mergeConditions({
      codeSummaryPath: path('code.json'),
      fixtureSummaryPath: path('fixtures.json'),
      outPath: OUT_PATH,
      domain: 'order',
    });

    const result = readResult();
    const field = result.fields.find((f) => f.fieldPath === 'payment.type')!;

    const cod = field.values.find((v) => v.value === 'COD')!;
    expect(cod.sources).toContain('code');
    expect(cod.sources).toContain('fixtures');

    const qr = field.values.find((v) => v.value === 'QR')!;
    expect(qr.sources).toEqual(['code']);
    expect(qr.sources).not.toContain('fixtures');
  });

  it('sets sourceCoverage true only for sources that have values for that field', () => {
    write('code.json', { fields: { status: { values: ['PENDING'] } } });
    write('fixtures.json', { fields: { status: { values: ['COMPLETE'] } } });
    write('db.json', { fields: { status: { values: ['CANCEL'] } } });

    mergeConditions({
      codeSummaryPath: path('code.json'),
      fixtureSummaryPath: path('fixtures.json'),
      dbSummaryPath: path('db.json'),
      outPath: OUT_PATH,
      domain: 'order',
    });

    const result = readResult();
    const field = result.fields.find((f) => f.fieldPath === 'status')!;
    expect(field.sourceCoverage.code).toBe(true);
    expect(field.sourceCoverage.fixtures).toBe(true);
    expect(field.sourceCoverage.db).toBe(true);
    expect(field.sourceCoverage.schema).toBe(false);
  });

  it('collects field paths from all sources', () => {
    write('code.json', { fields: { status: { values: ['PENDING'] } } });
    write('fixtures.json', { fields: { 'payment.type': { values: ['COD'] } } });

    mergeConditions({
      codeSummaryPath: path('code.json'),
      fixtureSummaryPath: path('fixtures.json'),
      outPath: OUT_PATH,
    });

    const result = readResult();
    const paths = result.fields.map((f) => f.fieldPath);
    expect(paths).toContain('status');
    expect(paths).toContain('payment.type');
  });

  it('works with only one source provided', () => {
    write('code.json', { fields: { status: { values: ['PENDING', 'COMPLETE'] } } });

    mergeConditions({
      codeSummaryPath: path('code.json'),
      outPath: OUT_PATH,
      domain: 'order',
    });

    const result = readResult();
    expect(result.fields).toHaveLength(1);
    const field = result.fields[0];
    expect(field.sourceCoverage.code).toBe(true);
    expect(field.sourceCoverage.fixtures).toBe(false);
    expect(field.sourceCoverage.db).toBe(false);
    expect(field.sourceCoverage.schema).toBe(false);
  });

  it('skips unavailable source paths gracefully', () => {
    write('code.json', { fields: { status: { values: ['PENDING'] } } });

    mergeConditions({
      codeSummaryPath: path('code.json'),
      dbSummaryPath: path('nonexistent.json'),
      outPath: OUT_PATH,
    });

    const result = readResult();
    expect(result.fields).toHaveLength(1);
    expect(result.fields[0].sourceCoverage.db).toBe(false);
  });

  it('deduplicates values that appear in multiple sources', () => {
    write('code.json', { fields: { status: { values: ['PENDING', 'COMPLETE'] } } });
    write('fixtures.json', { fields: { status: { values: ['PENDING', 'CANCEL'] } } });

    mergeConditions({
      codeSummaryPath: path('code.json'),
      fixtureSummaryPath: path('fixtures.json'),
      outPath: OUT_PATH,
    });

    const result = readResult();
    const field = result.fields.find((f) => f.fieldPath === 'status')!;
    const allValues = field.values.map((v) => v.value);
    // PENDING appears in both but should only be listed once
    expect(allValues.filter((v) => v === 'PENDING')).toHaveLength(1);
    expect(allValues).toHaveLength(3); // PENDING, COMPLETE, CANCEL
  });

  it('sets correct domain in output', () => {
    write('code.json', { fields: { status: { values: ['PENDING'] } } });
    mergeConditions({ codeSummaryPath: path('code.json'), outPath: OUT_PATH, domain: 'payment' });
    expect(readResult().domain).toBe('payment');
  });

  it('defaults domain to "unknown" when not provided', () => {
    write('code.json', { fields: { status: { values: ['PENDING'] } } });
    mergeConditions({ codeSummaryPath: path('code.json'), outPath: OUT_PATH });
    expect(readResult().domain).toBe('unknown');
  });

  it('handles schema-summary format (values + rules)', () => {
    write('schema.json', {
      fields: {
        status: { values: ['PENDING', 'COMPLETE'], rules: ['enum'] },
        amount: { values: [], rules: ['min:1'] },
      },
    });

    mergeConditions({ schemaSummaryPath: path('schema.json'), outPath: OUT_PATH });

    const result = readResult();
    const status = result.fields.find((f) => f.fieldPath === 'status')!;
    expect(status.sourceCoverage.schema).toBe(true);

    // amount has no values — sourceCoverage.schema should be false
    const amount = result.fields.find((f) => f.fieldPath === 'amount');
    expect(amount).toBeUndefined(); // field with no values from any source is skipped
  });

  it('handles all four sources together', () => {
    write('code.json', { fields: { 'payment.type': { values: ['COD', 'BANK', 'QR'] } } });
    write('fixtures.json', { fields: { 'payment.type': { values: ['COD', 'BANK'] } } });
    write('db.json', { fields: { 'payment.type': { values: ['COD', 'BANK', 'WALLET'] } } });
    write('schema.json', { fields: { 'payment.type': { values: ['COD', 'BANK'], rules: ['enum'] } } });

    mergeConditions({
      codeSummaryPath: path('code.json'),
      fixtureSummaryPath: path('fixtures.json'),
      dbSummaryPath: path('db.json'),
      schemaSummaryPath: path('schema.json'),
      outPath: OUT_PATH,
      domain: 'order',
    });

    const result = readResult();
    const field = result.fields.find((f) => f.fieldPath === 'payment.type')!;

    expect(field.sourceCoverage).toEqual({ code: true, fixtures: true, db: true, schema: true });

    const wallet = field.values.find((v) => v.value === 'WALLET')!;
    expect(wallet.sources).toEqual(['db']);

    const qr = field.values.find((v) => v.value === 'QR')!;
    expect(qr.sources).toEqual(['code']);

    const cod = field.values.find((v) => v.value === 'COD')!;
    expect(cod.sources).toContain('code');
    expect(cod.sources).toContain('fixtures');
    expect(cod.sources).toContain('db');
    expect(cod.sources).toContain('schema');
  });

  it('returns empty fields when no sources are provided', () => {
    mergeConditions({ outPath: OUT_PATH });
    const result = readResult();
    expect(result.fields).toHaveLength(0);
  });
});
