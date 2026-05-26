import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { scanDb } from '../src/core/scan-db';

const TMP_DIR = join(__dirname, '__tmp_scan_db__');
const OUT_PATH = join(TMP_DIR, 'db-summary.json');

// Creates a mock MongoDB client with controllable distinct() return values
function makeMockClient(distinctData: Record<string, unknown[]>) {
  return (_uri: string) =>
    ({
      connect: async () => {},
      db: (_dbName: string) => ({
        collection: (_colName: string) => ({
          distinct: async (field: string) => distinctData[field] ?? [],
        }),
      }),
      close: async () => {},
    }) as never;
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
      createClient: makeMockClient({ status: ['PENDING', 'COMPLETE', 'CANCEL'] }),
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
      createClient: makeMockClient({
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
      createClient: makeMockClient({ status: [] }),
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
      createClient: makeMockClient({}),
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
      createClient: makeMockClient({
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
      createClient: makeMockClient({
        amount: [0, 100, 250],
        isActive: [true, false],
      }),
    });

    const result = readResult();
    expect(result.fields['amount'].values).toEqual([0, 100, 250]);
    expect(result.fields['isActive'].values).toEqual([true, false]);
  });

  it('closes the client even when distinct throws an error', async () => {
    let closeCalled = false;

    const errorClient = (_uri: string) =>
      ({
        connect: async () => {},
        db: () => ({
          collection: () => ({
            distinct: async () => {
              throw new Error('DB error');
            },
          }),
        }),
        close: async () => {
          closeCalled = true;
        },
      }) as never;

    await expect(
      scanDb({
        uri: 'mongodb://localhost:27017',
        database: 'mydb',
        collection: 'orders',
        fields: ['status'],
        outPath: OUT_PATH,
        createClient: errorClient,
      })
    ).rejects.toThrow('DB error');

    expect(closeCalled).toBe(true);
  });
});
