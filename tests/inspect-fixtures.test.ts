import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { flattenObject } from '../src/core/flatten-object';
import { inspectFixtures } from '../src/core/inspect-fixtures';
import { writeJson } from '../src/core/write-json';

const TMP_DIR = join(__dirname, '__tmp_inspect__');
const FIXTURES_DIR = join(TMP_DIR, 'fixtures');
const OUT_PATH = join(TMP_DIR, 'fixture-summary.json');

beforeEach(() => {
  mkdirSync(FIXTURES_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true });
});

describe('flattenObject', () => {
  it('flattens a nested object into dot-path keys', () => {
    const obj = { payment: { type: 'COD', balance: 250 } };
    const result = flattenObject(obj);
    expect(result['payment.type']).toBe('COD');
    expect(result['payment.balance']).toBe(250);
  });

  it('flattens array index paths', () => {
    const obj = { basket: { products: [{ isFree: false }] } };
    const result = flattenObject(obj);
    expect(result['basket.products.0.isFree']).toBe(false);
  });

  it('keeps null values as null', () => {
    const obj = { payment: null };
    const result = flattenObject(obj);
    expect(result['payment']).toBeNull();
  });

  it('represents nested objects as "[object]"', () => {
    const obj = { meta: { nested: { deep: true } } };
    const result = flattenObject(obj);
    expect(result['meta.nested.deep']).toBe(true);
  });

  it('represents array values as "[array]" when an array is a leaf value', () => {
    const obj = { tags: ['A', 'B'] };
    const result = flattenObject(obj);
    expect(result['tags.0']).toBe('A');
    expect(result['tags.1']).toBe('B');
  });
});

describe('inspectFixtures', () => {
  it('inspects fixtures folder and produces correct unique value counts', () => {
    writeJson(join(FIXTURES_DIR, 'a.json'), { status: 'COMPLETE', payment: { type: 'COD' } });
    writeJson(join(FIXTURES_DIR, 'b.json'), { status: 'PENDING', payment: { type: 'BANK' } });
    writeJson(join(FIXTURES_DIR, 'c.json'), { status: 'COMPLETE', payment: { type: 'COD' } });

    inspectFixtures({ fixturesDir: FIXTURES_DIR, outPath: OUT_PATH });

    const summary = JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
    expect(summary.fields['status'].count).toBe(2);
    expect(summary.fields['status'].values).toContain('COMPLETE');
    expect(summary.fields['status'].values).toContain('PENDING');
    expect(summary.fields['payment.type'].count).toBe(2);
  });

  it('handles null field values', () => {
    writeJson(join(FIXTURES_DIR, 'a.json'), { payment: null });
    writeJson(join(FIXTURES_DIR, 'b.json'), { payment: null });

    inspectFixtures({ fixturesDir: FIXTURES_DIR, outPath: OUT_PATH });

    const summary = JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
    expect(summary.fields['payment'].values).toContain(null);
    expect(summary.fields['payment'].count).toBe(1);
  });

  it('handles array index paths across fixtures', () => {
    writeJson(join(FIXTURES_DIR, 'a.json'), { basket: { products: [{ isFree: false }] } });
    writeJson(join(FIXTURES_DIR, 'b.json'), { basket: { products: [{ isFree: true }] } });

    inspectFixtures({ fixturesDir: FIXTURES_DIR, outPath: OUT_PATH });

    const summary = JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
    expect(summary.fields['basket.products.0.isFree'].count).toBe(2);
    expect(summary.fields['basket.products.0.isFree'].values).toContain(true);
    expect(summary.fields['basket.products.0.isFree'].values).toContain(false);
  });

  it('exports the summary JSON file', () => {
    writeJson(join(FIXTURES_DIR, 'a.json'), { status: 'COMPLETE' });

    inspectFixtures({ fixturesDir: FIXTURES_DIR, outPath: OUT_PATH });

    const summary = JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
    expect(summary).toHaveProperty('fields');
  });

  it('ignores non-json files in the fixtures folder', () => {
    writeJson(join(FIXTURES_DIR, 'a.json'), { status: 'COMPLETE' });
    require('fs').writeFileSync(join(FIXTURES_DIR, 'notes.txt'), 'ignore me', 'utf-8');

    inspectFixtures({ fixturesDir: FIXTURES_DIR, outPath: OUT_PATH });

    const summary = JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
    expect(summary.fields['status']).toBeDefined();
  });
});
