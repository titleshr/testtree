import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { scanDb } from '../src/core/scan-db';
import type { DbReader } from '../src/core/db-client';

const TMP_DIR = join(__dirname, '__tmp_scan_db__');
const OUT_PATH = join(TMP_DIR, 'db-summary.json');

// Creates a mock DbReader with controllable distinct() return values.
// Only exposes distinct + close — matching the read-only DbReader interface.
function makeMockReader(distinctData: Record<string, unknown[]>) {
  return async (_uri: string, _database: string, _collection: string): Promise<DbReader> => ({
    distinct: async (field: string) => distinctData[field] ?? [],
    close: async () => {},
  });
}

function readResult(): {
  fields: Record<string, { count: number; values: unknown[] }>;
  meta: { source: string; database: string; collection: string };
} {
  return JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
}

beforeEach(() => {
  mkdirSync(TMP_DIR, { recursive: true });
});

afterEach(() => {
  if (existsSync(TMP_DIR)) rmSync(TMP_DIR, { recursive: true, force: true });
});

describe('scanDb', () => {
  it('writes distinct values for a single field', async () => {
    await scanDb({
      uri: 'mongodb://localhost:27017',
      database: 'mydb',
      collection: 'orders',
      fields: ['status'],
      outPath: OUT_PATH,
      createReader: makeMockReader({ status: ['PENDING', 'COMPLETE', 'CANCEL'] }),
    });

    const result = readResult();
    expect(result.fields['status'].values).toEqual(['PENDING', 'COMPLETE', 'CANCEL']);
    expect(result.fields['status'].count).toBe(3);
  });

  it('writes distinct values for multiple fields', async () => {
    await scanDb({
      uri: 'mongodb://localhost:27017',
      database: 'mydb',
      collection: 'orders',
      fields: ['status', 'payment.type'],
      outPath: OUT_PATH,
      createReader: makeMockReader({
        status: ['PENDING', 'COMPLETE'],
        'payment.type': ['COD', 'BANK', 'QR'],
      }),
    });

    const result = readResult();
    expect(result.fields['status'].count).toBe(2);
    expect(result.fields['payment.type'].values).toContain('QR');
    expect(result.fields['payment.type'].count).toBe(3);
  });

  it('writes correct meta information', async () => {
    await scanDb({
      uri: 'mongodb://localhost:27017',
      database: 'testdb',
      collection: 'products',
      fields: ['status'],
      outPath: OUT_PATH,
      createReader: makeMockReader({ status: [] }),
    });

    const result = readResult();
    expect(result.meta.source).toBe('mongodb');
    expect(result.meta.database).toBe('testdb');
    expect(result.meta.collection).toBe('products');
  });

  it('returns empty values array when field has no data', async () => {
    await scanDb({
      uri: 'mongodb://localhost:27017',
      database: 'mydb',
      collection: 'orders',
      fields: ['unknown.field'],
      outPath: OUT_PATH,
      createReader: makeMockReader({}),
    });

    const result = readResult();
    expect(result.fields['unknown.field'].values).toEqual([]);
    expect(result.fields['unknown.field'].count).toBe(0);
  });

  it('handles dotted field paths (nested fields)', async () => {
    await scanDb({
      uri: 'mongodb://localhost:27017',
      database: 'mydb',
      collection: 'orders',
      fields: ['payment.type', 'basket.products.0.isFree'],
      outPath: OUT_PATH,
      createReader: makeMockReader({
        'payment.type': ['COD', 'BANK'],
        'basket.products.0.isFree': [true, false],
      }),
    });

    const result = readResult();
    expect(result.fields['payment.type'].values).toEqual(['COD', 'BANK']);
    expect(result.fields['basket.products.0.isFree'].values).toEqual([true, false]);
  });

  it('handles non-string distinct values (numbers, booleans)', async () => {
    await scanDb({
      uri: 'mongodb://localhost:27017',
      database: 'mydb',
      collection: 'orders',
      fields: ['amount', 'isActive'],
      outPath: OUT_PATH,
      createReader: makeMockReader({
        amount: [0, 100, 250],
        isActive: [true, false],
      }),
    });

    const result = readResult();
    expect(result.fields['amount'].values).toEqual([0, 100, 250]);
    expect(result.fields['isActive'].values).toEqual([true, false]);
  });

  it('closes the reader even when distinct throws an error', async () => {
    let closeCalled = false;

    const errorReader = async (): Promise<DbReader> => ({
      distinct: async () => {
        throw new Error('DB error');
      },
      close: async () => {
        closeCalled = true;
      },
    });

    await expect(
      scanDb({
        uri: 'mongodb://localhost:27017',
        database: 'mydb',
        collection: 'orders',
        fields: ['status'],
        outPath: OUT_PATH,
        createReader: errorReader,
      })
    ).rejects.toThrow('DB error');

    expect(closeCalled).toBe(true);
  });
});
