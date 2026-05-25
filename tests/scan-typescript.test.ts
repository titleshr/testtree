import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { scanTypescript } from '../src/core/scan-typescript';

const TMP_DIR = join(__dirname, '__tmp_scan_ts__');
const SRC_DIR = join(TMP_DIR, 'src');
const OUT_PATH = join(TMP_DIR, 'ts-conditions.json');

beforeEach(() => {
  mkdirSync(SRC_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true });
});

describe('scanTypescript', () => {
  it('detects binary expression ===', () => {
    writeFileSync(
      join(SRC_DIR, 'service.ts'),
      `if (order.status === "COMPLETE") {}`,
      'utf-8'
    );
    scanTypescript({ projectDir: SRC_DIR, outPath: OUT_PATH });
    const result = JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
    const match = result.conditions.find(
      (c: { fieldPath: string; value: string }) => c.fieldPath === 'order.status' && c.value === 'COMPLETE'
    );
    expect(match).toBeDefined();
    expect(match.operator).toBe('===');
    expect(match.sourceType).toBe('binary-expression');
  });

  it('detects switch case', () => {
    writeFileSync(
      join(SRC_DIR, 'service.ts'),
      `switch (order.status) {\n  case "PENDING":\n    break;\n}`,
      'utf-8'
    );
    scanTypescript({ projectDir: SRC_DIR, outPath: OUT_PATH });
    const result = JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
    const match = result.conditions.find(
      (c: { sourceType: string; value: string }) => c.sourceType === 'switch-case' && c.value === 'PENDING'
    );
    expect(match).toBeDefined();
    expect(match.fieldPath).toBe('order.status');
  });

  it('detects enum declaration string values', () => {
    writeFileSync(
      join(SRC_DIR, 'enums.ts'),
      `enum OrderStatus { COMPLETE = "COMPLETE", PENDING = "PENDING" }`,
      'utf-8'
    );
    scanTypescript({ projectDir: SRC_DIR, outPath: OUT_PATH });
    const result = JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
    const values = result.conditions
      .filter((c: { fieldPath: string }) => c.fieldPath === 'OrderStatus')
      .map((c: { value: string }) => c.value);
    expect(values).toContain('COMPLETE');
    expect(values).toContain('PENDING');
  });

  it('detects const object string values', () => {
    writeFileSync(
      join(SRC_DIR, 'constants.ts'),
      `const PaymentType = { COD: "COD", BANK: "BANK" } as const;`,
      'utf-8'
    );
    scanTypescript({ projectDir: SRC_DIR, outPath: OUT_PATH });
    const result = JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
    const values = result.conditions
      .filter((c: { fieldPath: string }) => c.fieldPath === 'PaymentType')
      .map((c: { value: string }) => c.value);
    expect(values).toContain('COD');
    expect(values).toContain('BANK');
  });

  it('includes file and line number', () => {
    writeFileSync(
      join(SRC_DIR, 'service.ts'),
      `if (payment.type === "COD") {}`,
      'utf-8'
    );
    scanTypescript({ projectDir: SRC_DIR, outPath: OUT_PATH });
    const result = JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
    const match = result.conditions[0];
    expect(match.file).toContain('service.ts');
    expect(match.line).toBeGreaterThan(0);
  });

  it('exports meta with scanner = "ts-morph"', () => {
    writeFileSync(join(SRC_DIR, 'empty.ts'), '', 'utf-8');
    scanTypescript({ projectDir: SRC_DIR, outPath: OUT_PATH });
    const result = JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
    expect(result.meta.scanner).toBe('ts-morph');
    expect(result.meta.accuracy).toBe('ast-based');
  });
});
