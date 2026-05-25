import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { findSourceFiles } from '../src/core/find-source-files';
import { scanCode } from '../src/core/scan-code';

const TMP_DIR = join(__dirname, '__tmp_scan_code__');
const SRC_DIR = join(TMP_DIR, 'src');
const OUT_PATH = join(TMP_DIR, 'code-conditions.json');

beforeEach(() => {
  mkdirSync(SRC_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true });
});

describe('findSourceFiles', () => {
  it('finds .ts and .js files recursively', () => {
    writeFileSync(join(SRC_DIR, 'a.ts'), '', 'utf-8');
    writeFileSync(join(SRC_DIR, 'b.js'), '', 'utf-8');
    writeFileSync(join(SRC_DIR, 'c.md'), '', 'utf-8');
    const files = findSourceFiles(SRC_DIR);
    expect(files.some((f) => f.endsWith('a.ts'))).toBe(true);
    expect(files.some((f) => f.endsWith('b.js'))).toBe(true);
    expect(files.some((f) => f.endsWith('c.md'))).toBe(false);
  });

  it('ignores node_modules', () => {
    const nmDir = join(SRC_DIR, 'node_modules');
    mkdirSync(nmDir, { recursive: true });
    writeFileSync(join(nmDir, 'pkg.ts'), '', 'utf-8');
    const files = findSourceFiles(SRC_DIR);
    expect(files.some((f) => f.includes('node_modules'))).toBe(false);
  });
});

describe('scanCode', () => {
  it('detects === comparison', () => {
    writeFileSync(join(SRC_DIR, 'service.ts'), `if (payment.type === "COD") {}`, 'utf-8');
    scanCode({ projectDir: SRC_DIR, outPath: OUT_PATH });
    const result = JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
    const match = result.conditions.find((c: { fieldPath: string }) => c.fieldPath === 'payment.type');
    expect(match).toBeDefined();
    expect(match.operator).toBe('===');
    expect(match.value).toBe('COD');
  });

  it('detects !== comparison', () => {
    writeFileSync(join(SRC_DIR, 'service.ts'), `if (order.status !== "CANCELLED") {}`, 'utf-8');
    scanCode({ projectDir: SRC_DIR, outPath: OUT_PATH });
    const result = JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
    const match = result.conditions.find((c: { operator: string }) => c.operator === '!==');
    expect(match).toBeDefined();
    expect(match.value).toBe('CANCELLED');
  });

  it('detects switch case', () => {
    writeFileSync(
      join(SRC_DIR, 'service.ts'),
      `switch (order.status) {\n  case "COMPLETE":\n    break;\n}`,
      'utf-8'
    );
    scanCode({ projectDir: SRC_DIR, outPath: OUT_PATH });
    const result = JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
    const match = result.conditions.find(
      (c: { sourceType: string; value: string }) => c.sourceType === 'switch-case' && c.value === 'COMPLETE'
    );
    expect(match).toBeDefined();
    expect(match.fieldPath).toBe('order.status');
  });

  it('includes file and line number', () => {
    writeFileSync(join(SRC_DIR, 'service.ts'), `if (payment.type === "BANK") {}`, 'utf-8');
    scanCode({ projectDir: SRC_DIR, outPath: OUT_PATH });
    const result = JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
    expect(result.conditions[0].file).toContain('service.ts');
    expect(result.conditions[0].line).toBe(1);
  });

  it('exports meta with scanner = "text"', () => {
    writeFileSync(join(SRC_DIR, 'service.ts'), '', 'utf-8');
    scanCode({ projectDir: SRC_DIR, outPath: OUT_PATH });
    const result = JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
    expect(result.meta.scanner).toBe('text');
    expect(result.meta.accuracy).toBe('best-effort');
  });

  it('ignores node_modules directory', () => {
    const nmDir = join(SRC_DIR, 'node_modules');
    mkdirSync(nmDir, { recursive: true });
    writeFileSync(join(nmDir, 'pkg.ts'), `if (x === "Y") {}`, 'utf-8');
    writeFileSync(join(SRC_DIR, 'a.ts'), '', 'utf-8');
    scanCode({ projectDir: SRC_DIR, outPath: OUT_PATH });
    const result = JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
    expect(result.conditions.every((c: { file: string }) => !c.file.includes('node_modules'))).toBe(true);
  });
});
