import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { generateTemplate } from '../src/core/generate-template';
import { readJson } from '../src/core/read-json';

const TMP_DIR = join(__dirname, '__tmp_generate_template__');
const SAMPLE_PATH = join(TMP_DIR, 'sample.json');
const OUT_PATH = join(TMP_DIR, 'base-template.json');

function writeTestSample(data: unknown) {
  writeFileSync(SAMPLE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

beforeEach(() => {
  mkdirSync(TMP_DIR, { recursive: true });
});

afterEach(() => {
  if (existsSync(TMP_DIR)) rmSync(TMP_DIR, { recursive: true, force: true });
});

describe('generateTemplate', () => {
  it('removes default unstable fields (_id, id, createdAt, updatedAt, deletedAt)', () => {
    writeTestSample({
      _id: 'abc123',
      id: 42,
      status: 'COMPLETE',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      deletedAt: null,
    });

    generateTemplate({ samplePath: SAMPLE_PATH, outPath: OUT_PATH });

    const result = readJson(OUT_PATH) as Record<string, unknown>;
    expect(result).not.toHaveProperty('_id');
    expect(result).not.toHaveProperty('id');
    expect(result).not.toHaveProperty('createdAt');
    expect(result).not.toHaveProperty('updatedAt');
    expect(result).not.toHaveProperty('deletedAt');
    expect(result.status).toBe('COMPLETE');
  });

  it('keeps all non-ignored fields and their values', () => {
    writeTestSample({
      status: 'PENDING',
      payment: { type: 'COD', amount: 250 },
    });

    generateTemplate({ samplePath: SAMPLE_PATH, outPath: OUT_PATH });

    const result = readJson(OUT_PATH) as Record<string, unknown>;
    expect(result).toEqual({ status: 'PENDING', payment: { type: 'COD', amount: 250 } });
  });

  it('removes default fields recursively inside nested objects', () => {
    writeTestSample({
      status: 'COMPLETE',
      payment: {
        _id: 'pay123',
        type: 'BANK',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    });

    generateTemplate({ samplePath: SAMPLE_PATH, outPath: OUT_PATH });

    const result = readJson(OUT_PATH) as Record<string, unknown>;
    const payment = result.payment as Record<string, unknown>;
    expect(payment).not.toHaveProperty('_id');
    expect(payment).not.toHaveProperty('createdAt');
    expect(payment.type).toBe('BANK');
  });

  it('removes default fields inside array items', () => {
    writeTestSample({
      items: [
        { _id: 'i1', name: 'Product A', qty: 2 },
        { _id: 'i2', name: 'Product B', qty: 1 },
      ],
    });

    generateTemplate({ samplePath: SAMPLE_PATH, outPath: OUT_PATH });

    const result = readJson(OUT_PATH) as Record<string, unknown>;
    const items = result.items as Record<string, unknown>[];
    expect(items[0]).not.toHaveProperty('_id');
    expect(items[0].name).toBe('Product A');
    expect(items[1]).not.toHaveProperty('_id');
  });

  it('respects custom --ignore list in addition to defaults', () => {
    writeTestSample({
      status: 'COMPLETE',
      internalRef: 'ref-001',
      secretToken: 'tok-xyz',
    });

    generateTemplate({
      samplePath: SAMPLE_PATH,
      outPath: OUT_PATH,
      ignore: ['internalRef', 'secretToken'],
    });

    const result = readJson(OUT_PATH) as Record<string, unknown>;
    expect(result).not.toHaveProperty('internalRef');
    expect(result).not.toHaveProperty('secretToken');
    expect(result.status).toBe('COMPLETE');
  });

  it('handles empty object input', () => {
    writeTestSample({});
    generateTemplate({ samplePath: SAMPLE_PATH, outPath: OUT_PATH });
    const result = readJson(OUT_PATH);
    expect(result).toEqual({});
  });

  it('handles object where all fields are ignored', () => {
    writeTestSample({ _id: 'abc', createdAt: '2026-01-01T00:00:00.000Z' });
    generateTemplate({ samplePath: SAMPLE_PATH, outPath: OUT_PATH });
    const result = readJson(OUT_PATH);
    expect(result).toEqual({});
  });

  it('preserves primitive types (string, number, boolean, null)', () => {
    writeTestSample({
      status: 'PENDING',
      amount: 100,
      isActive: true,
      note: null,
    });

    generateTemplate({ samplePath: SAMPLE_PATH, outPath: OUT_PATH });

    const result = readJson(OUT_PATH) as Record<string, unknown>;
    expect(result.status).toBe('PENDING');
    expect(result.amount).toBe(100);
    expect(result.isActive).toBe(true);
    expect(result.note).toBeNull();
  });

  it('does not mutate the original sample file', () => {
    const original = { _id: 'abc', status: 'COMPLETE' };
    writeTestSample(original);

    generateTemplate({ samplePath: SAMPLE_PATH, outPath: OUT_PATH });

    const sample = readJson(SAMPLE_PATH) as Record<string, unknown>;
    expect(sample._id).toBe('abc');
  });
});
