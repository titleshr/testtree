import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { scanSchema } from '../src/core/scan-schema';

const TMP_DIR = join(__dirname, '__tmp_scan_schema__');
const SRC_DIR = join(TMP_DIR, 'src');
const OUT_PATH = join(TMP_DIR, 'schema-summary.json');

function writeSrc(filename: string, content: string) {
  writeFileSync(join(SRC_DIR, filename), content, 'utf-8');
}

function readResult(): { fields: Record<string, { values: unknown[]; rules: string[] }> } {
  return JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
}

beforeEach(() => {
  mkdirSync(SRC_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true });
});

describe('scanSchema', () => {
  it('detects TypeScript enum string values', () => {
    writeSrc('enums.ts', `enum OrderStatus { PENDING = "PENDING", COMPLETE = "COMPLETE" }`);
    scanSchema({ projectDir: SRC_DIR, outPath: OUT_PATH });
    const result = readResult();
    expect(result.fields['OrderStatus'].values).toContain('PENDING');
    expect(result.fields['OrderStatus'].values).toContain('COMPLETE');
    expect(result.fields['OrderStatus'].rules).toContain('enum');
  });

  it('detects Zod z.enum() with values and enum rule', () => {
    writeSrc(
      'schema.ts',
      `const S = z.object({ status: z.enum(["PENDING", "COMPLETE"]) });`
    );
    scanSchema({ projectDir: SRC_DIR, outPath: OUT_PATH });
    const result = readResult();
    expect(result.fields['status'].values).toContain('PENDING');
    expect(result.fields['status'].values).toContain('COMPLETE');
    expect(result.fields['status'].rules).toContain('enum');
  });

  it('detects Zod z.nativeEnum() with nativeEnum rule', () => {
    writeSrc(
      'schema.ts',
      `const S = z.object({ status: z.nativeEnum(OrderStatus) });`
    );
    scanSchema({ projectDir: SRC_DIR, outPath: OUT_PATH });
    const result = readResult();
    expect(result.fields['status'].rules).toContain('nativeEnum');
  });

  it('detects Zod z.number().min() constraint', () => {
    writeSrc(
      'schema.ts',
      `const S = z.object({ amount: z.number().min(1) });`
    );
    scanSchema({ projectDir: SRC_DIR, outPath: OUT_PATH });
    const result = readResult();
    expect(result.fields['amount'].rules).toContain('min:1');
  });

  it('detects Zod z.string().maxLength() constraint', () => {
    writeSrc(
      'schema.ts',
      `const S = z.object({ name: z.string().maxLength(100) });`
    );
    scanSchema({ projectDir: SRC_DIR, outPath: OUT_PATH });
    const result = readResult();
    expect(result.fields['name'].rules).toContain('maxLength:100');
  });

  it('detects nested z.object() with dotted field path', () => {
    writeSrc(
      'schema.ts',
      `const S = z.object({ payment: z.object({ type: z.enum(["COD", "BANK"]) }) });`
    );
    scanSchema({ projectDir: SRC_DIR, outPath: OUT_PATH });
    const result = readResult();
    expect(result.fields['payment.type'].values).toContain('COD');
    expect(result.fields['payment.type'].values).toContain('BANK');
    expect(result.fields['payment.type'].rules).toContain('enum');
  });

  it('detects class-validator @IsEnum rule', () => {
    writeSrc(
      'dto.ts',
      `class CreateOrderDto {
        @IsEnum(PaymentType)
        type: string;
      }`
    );
    scanSchema({ projectDir: SRC_DIR, outPath: OUT_PATH });
    const result = readResult();
    expect(result.fields['type'].rules).toContain('enum');
  });

  it('detects class-validator @IsNotEmpty as required rule', () => {
    writeSrc(
      'dto.ts',
      `class CreateOrderDto {
        @IsNotEmpty()
        status: string;
      }`
    );
    scanSchema({ projectDir: SRC_DIR, outPath: OUT_PATH });
    const result = readResult();
    expect(result.fields['status'].rules).toContain('required');
  });

  it('detects class-validator @Min constraint', () => {
    writeSrc(
      'dto.ts',
      `class CreateOrderDto {
        @Min(1)
        amount: number;
      }`
    );
    scanSchema({ projectDir: SRC_DIR, outPath: OUT_PATH });
    const result = readResult();
    expect(result.fields['amount'].rules).toContain('min:1');
  });

  it('detects class-validator @Max constraint', () => {
    writeSrc(
      'dto.ts',
      `class CreateOrderDto {
        @Max(1000)
        price: number;
      }`
    );
    scanSchema({ projectDir: SRC_DIR, outPath: OUT_PATH });
    const result = readResult();
    expect(result.fields['price'].rules).toContain('max:1000');
  });

  it('collects multiple decorators on one property', () => {
    writeSrc(
      'dto.ts',
      `class CreateOrderDto {
        @IsNotEmpty()
        @IsEnum(OrderStatus)
        status: string;
      }`
    );
    scanSchema({ projectDir: SRC_DIR, outPath: OUT_PATH });
    const result = readResult();
    expect(result.fields['status'].rules).toContain('required');
    expect(result.fields['status'].rules).toContain('enum');
  });

  it('returns empty fields for empty project', () => {
    writeSrc('empty.ts', '');
    scanSchema({ projectDir: SRC_DIR, outPath: OUT_PATH });
    const result = readResult();
    expect(Object.keys(result.fields)).toHaveLength(0);
  });

  it('scans multiple files', () => {
    writeSrc('enums.ts', `enum PaymentType { COD = "COD", BANK = "BANK" }`);
    writeSrc('schema.ts', `const S = z.object({ status: z.enum(["PENDING"]) });`);
    scanSchema({ projectDir: SRC_DIR, outPath: OUT_PATH });
    const result = readResult();
    expect(result.fields['PaymentType']).toBeDefined();
    expect(result.fields['status']).toBeDefined();
  });
});
