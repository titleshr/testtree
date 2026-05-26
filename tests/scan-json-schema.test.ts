import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { scanJsonSchema } from '../src/core/scan-json-schema';
import { readJson } from '../src/core/read-json';

const TMP_DIR = join(__dirname, '__tmp_scan_json_schema__');
const OUT_PATH = join(TMP_DIR, 'json-schema-summary.json');

function writeSchema(name: string, content: unknown) {
  const path = join(TMP_DIR, name);
  writeFileSync(path, JSON.stringify(content, null, 2), 'utf-8');
  return path;
}

type Summary = { fields: Record<string, { count: number; values: unknown[]; rules: string[] }>; meta: { source: string } };

beforeEach(() => mkdirSync(TMP_DIR, { recursive: true }));
afterEach(() => { if (existsSync(TMP_DIR)) rmSync(TMP_DIR, { recursive: true, force: true }); });

describe('scanJsonSchema — enum and required', () => {
  it('extracts enum values from a property', () => {
    const input = writeSchema('schema.json', {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['PENDING', 'COMPLETE', 'CANCEL'] },
      },
    });
    scanJsonSchema({ inputPath: input, outPath: OUT_PATH });
    const result = readJson(OUT_PATH) as Summary;
    expect(result.fields['status'].values).toEqual(['PENDING', 'COMPLETE', 'CANCEL']);
    expect(result.fields['status'].rules).toContain('enum');
  });

  it('marks field as required when in required array', () => {
    const input = writeSchema('schema.json', {
      type: 'object',
      required: ['status'],
      properties: {
        status: { type: 'string', enum: ['PENDING', 'COMPLETE'] },
        channel: { type: 'string', enum: ['LINE', 'FACEBOOK'] },
      },
    });
    scanJsonSchema({ inputPath: input, outPath: OUT_PATH });
    const result = readJson(OUT_PATH) as Summary;
    expect(result.fields['status'].rules).toContain('required');
    expect(result.fields['channel'].rules).not.toContain('required');
  });

  it('sets meta.source to "json-schema"', () => {
    const input = writeSchema('schema.json', {
      type: 'object',
      properties: { status: { type: 'string', enum: ['PENDING'] } },
    });
    scanJsonSchema({ inputPath: input, outPath: OUT_PATH });
    const result = readJson(OUT_PATH) as Summary;
    expect(result.meta.source).toBe('json-schema');
  });

  it('returns empty fields when schema has no properties', () => {
    const input = writeSchema('schema.json', { type: 'object' });
    scanJsonSchema({ inputPath: input, outPath: OUT_PATH });
    const result = readJson(OUT_PATH) as Summary;
    expect(Object.keys(result.fields)).toHaveLength(0);
  });
});

describe('scanJsonSchema — validation rules', () => {
  it('extracts minLength and maxLength', () => {
    const input = writeSchema('schema.json', {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 100 },
      },
    });
    scanJsonSchema({ inputPath: input, outPath: OUT_PATH });
    const result = readJson(OUT_PATH) as Summary;
    expect(result.fields['name'].rules).toContain('minLength:1');
    expect(result.fields['name'].rules).toContain('maxLength:100');
  });

  it('extracts minimum and maximum', () => {
    const input = writeSchema('schema.json', {
      type: 'object',
      properties: {
        amount: { type: 'number', minimum: 0, maximum: 9999 },
      },
    });
    scanJsonSchema({ inputPath: input, outPath: OUT_PATH });
    const result = readJson(OUT_PATH) as Summary;
    expect(result.fields['amount'].rules).toContain('minimum:0');
    expect(result.fields['amount'].rules).toContain('maximum:9999');
  });

  it('extracts pattern rule', () => {
    const input = writeSchema('schema.json', {
      type: 'object',
      properties: {
        zipCode: { type: 'string', pattern: '^[0-9]{5}$' },
      },
    });
    scanJsonSchema({ inputPath: input, outPath: OUT_PATH });
    const result = readJson(OUT_PATH) as Summary;
    expect(result.fields['zipCode'].rules).toContain('pattern:^[0-9]{5}$');
  });

  it('skips fields with no rules and no enum', () => {
    const input = writeSchema('schema.json', {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    });
    scanJsonSchema({ inputPath: input, outPath: OUT_PATH });
    const result = readJson(OUT_PATH) as Summary;
    expect(result.fields['name']).toBeUndefined();
  });
});

describe('scanJsonSchema — nested properties', () => {
  it('produces nested dot-notation paths', () => {
    const input = writeSchema('schema.json', {
      type: 'object',
      properties: {
        payment: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['COD', 'BANK'] },
          },
        },
      },
    });
    scanJsonSchema({ inputPath: input, outPath: OUT_PATH });
    const result = readJson(OUT_PATH) as Summary;
    expect(result.fields['payment.type']).toBeDefined();
    expect(result.fields['payment.type'].values).toEqual(['COD', 'BANK']);
  });
});

describe('scanJsonSchema — $ref resolution', () => {
  it('resolves $ref using $defs', () => {
    const input = writeSchema('schema.json', {
      type: 'object',
      $defs: {
        StatusEnum: { type: 'string', enum: ['PENDING', 'COMPLETE'] },
      },
      properties: {
        status: { $ref: '#/$defs/StatusEnum' },
      },
    });
    scanJsonSchema({ inputPath: input, outPath: OUT_PATH });
    const result = readJson(OUT_PATH) as Summary;
    expect(result.fields['status'].values).toEqual(['PENDING', 'COMPLETE']);
  });

  it('resolves $ref using definitions', () => {
    const input = writeSchema('schema.json', {
      type: 'object',
      definitions: {
        PaymentType: { type: 'string', enum: ['COD', 'BANK', 'QR'] },
      },
      properties: {
        paymentType: { $ref: '#/definitions/PaymentType' },
      },
    });
    scanJsonSchema({ inputPath: input, outPath: OUT_PATH });
    const result = readJson(OUT_PATH) as Summary;
    expect(result.fields['paymentType'].values).toEqual(['COD', 'BANK', 'QR']);
  });
});

describe('scanJsonSchema — allOf / oneOf / anyOf', () => {
  it('extracts fields from allOf subschemas', () => {
    const input = writeSchema('schema.json', {
      allOf: [
        {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['PENDING', 'COMPLETE'] },
          },
        },
      ],
    });
    scanJsonSchema({ inputPath: input, outPath: OUT_PATH });
    const result = readJson(OUT_PATH) as Summary;
    expect(result.fields['status'].values).toEqual(['PENDING', 'COMPLETE']);
  });
});
