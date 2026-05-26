import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { scanOpenApi } from '../src/core/scan-openapi';
import { readJson } from '../src/core/read-json';

const TMP_DIR = join(__dirname, '__tmp_scan_openapi__');
const OUT_PATH = join(TMP_DIR, 'openapi-summary.json');

function writeYaml(name: string, content: string) {
  writeFileSync(join(TMP_DIR, name), content, 'utf-8');
  return join(TMP_DIR, name);
}
function writeJson(name: string, content: unknown) {
  writeFileSync(join(TMP_DIR, name), JSON.stringify(content, null, 2), 'utf-8');
  return join(TMP_DIR, name);
}

beforeEach(() => mkdirSync(TMP_DIR, { recursive: true }));
afterEach(() => { if (existsSync(TMP_DIR)) rmSync(TMP_DIR, { recursive: true, force: true }); });

describe('scanOpenApi — YAML input', () => {
  it('extracts enum values from a property', () => {
    const input = writeYaml('spec.yaml', `
openapi: "3.0.0"
components:
  schemas:
    Order:
      type: object
      properties:
        status:
          type: string
          enum: [PENDING, COMPLETE, CANCEL]
`);
    scanOpenApi({ inputPath: input, outPath: OUT_PATH });
    const result = readJson(OUT_PATH) as { fields: Record<string, { values: unknown[]; rules: string[] }> };
    expect(result.fields['status'].values).toEqual(['PENDING', 'COMPLETE', 'CANCEL']);
    expect(result.fields['status'].rules).toContain('enum');
  });

  it('marks field as required when listed in required array', () => {
    const input = writeYaml('spec.yaml', `
openapi: "3.0.0"
components:
  schemas:
    Order:
      type: object
      required: [status]
      properties:
        status:
          type: string
          enum: [PENDING, COMPLETE]
        channel:
          type: string
          enum: [LINE, FACEBOOK]
`);
    scanOpenApi({ inputPath: input, outPath: OUT_PATH });
    const result = readJson(OUT_PATH) as { fields: Record<string, { rules: string[] }> };
    expect(result.fields['status'].rules).toContain('required');
    expect(result.fields['channel'].rules).not.toContain('required');
  });

  it('produces nested field paths from nested properties', () => {
    const input = writeYaml('spec.yaml', `
openapi: "3.0.0"
components:
  schemas:
    Order:
      type: object
      properties:
        payment:
          type: object
          properties:
            type:
              type: string
              enum: [COD, BANK]
`);
    scanOpenApi({ inputPath: input, outPath: OUT_PATH });
    const result = readJson(OUT_PATH) as { fields: Record<string, { values: unknown[] }> };
    expect(result.fields['payment.type']).toBeDefined();
    expect(result.fields['payment.type'].values).toEqual(['COD', 'BANK']);
  });

  it('skips properties with no enum and no rules', () => {
    const input = writeYaml('spec.yaml', `
openapi: "3.0.0"
components:
  schemas:
    Order:
      type: object
      properties:
        name:
          type: string
`);
    scanOpenApi({ inputPath: input, outPath: OUT_PATH });
    const result = readJson(OUT_PATH) as { fields: Record<string, unknown> };
    expect(result.fields['name']).toBeUndefined();
  });

  it('sets meta.source to "openapi"', () => {
    const input = writeYaml('spec.yaml', `
openapi: "3.0.0"
components:
  schemas:
    Order:
      type: object
      properties:
        status:
          type: string
          enum: [PENDING]
`);
    scanOpenApi({ inputPath: input, outPath: OUT_PATH });
    const result = readJson(OUT_PATH) as { meta: { source: string } };
    expect(result.meta.source).toBe('openapi');
  });

  it('returns empty fields when spec has no components.schemas', () => {
    const input = writeYaml('spec.yaml', `openapi: "3.0.0"\ninfo:\n  title: Empty\n  version: "1.0"`);
    scanOpenApi({ inputPath: input, outPath: OUT_PATH });
    const result = readJson(OUT_PATH) as { fields: Record<string, unknown> };
    expect(Object.keys(result.fields)).toHaveLength(0);
  });
});

describe('scanOpenApi — JSON input', () => {
  it('parses JSON OpenAPI spec', () => {
    const input = writeJson('spec.json', {
      openapi: '3.0.0',
      components: {
        schemas: {
          Order: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['PENDING', 'COMPLETE'] },
            },
          },
        },
      },
    });
    scanOpenApi({ inputPath: input, outPath: OUT_PATH });
    const result = readJson(OUT_PATH) as { fields: Record<string, { values: unknown[] }> };
    expect(result.fields['status'].values).toEqual(['PENDING', 'COMPLETE']);
  });
});

describe('scanOpenApi — $ref resolution', () => {
  it('resolves $ref to another schema component', () => {
    const input = writeYaml('spec.yaml', `
openapi: "3.0.0"
components:
  schemas:
    PaymentType:
      type: string
      enum: [COD, BANK, QR]
    Order:
      type: object
      properties:
        paymentType:
          $ref: "#/components/schemas/PaymentType"
`);
    scanOpenApi({ inputPath: input, outPath: OUT_PATH });
    const result = readJson(OUT_PATH) as { fields: Record<string, { values: unknown[] }> };
    expect(result.fields['paymentType'].values).toEqual(['COD', 'BANK', 'QR']);
  });
});

describe('scanOpenApi — multiple schemas', () => {
  it('merges fields from multiple schemas', () => {
    const input = writeYaml('spec.yaml', `
openapi: "3.0.0"
components:
  schemas:
    Order:
      type: object
      properties:
        status:
          type: string
          enum: [PENDING, COMPLETE]
    Payment:
      type: object
      properties:
        type:
          type: string
          enum: [COD, BANK]
`);
    scanOpenApi({ inputPath: input, outPath: OUT_PATH });
    const result = readJson(OUT_PATH) as { fields: Record<string, { values: unknown[] }> };
    expect(result.fields['status']).toBeDefined();
    expect(result.fields['type']).toBeDefined();
  });
});
