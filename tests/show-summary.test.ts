import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { formatSummary, showSummary } from '../src/core/show-summary';
import { writeJson } from '../src/core/write-json';

const TMP_DIR = join(__dirname, '__tmp_show_summary__');

beforeEach(() => {
  mkdirSync(TMP_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true });
});

describe('formatSummary', () => {
  it('displays all fields when no fields filter given', () => {
    const output = formatSummary({
      fields: {
        status: { count: 2, values: ['PENDING', 'COMPLETE'] },
        'payment.type': { count: 2, values: ['COD', 'BANK'] },
      },
    });
    expect(output).toContain('status:');
    expect(output).toContain('- PENDING');
    expect(output).toContain('- COMPLETE');
    expect(output).toContain('payment.type:');
    expect(output).toContain('- COD');
    expect(output).toContain('- BANK');
  });

  it('displays only specified fields', () => {
    const output = formatSummary(
      {
        fields: {
          status: { count: 2, values: ['PENDING', 'COMPLETE'] },
          'payment.type': { count: 2, values: ['COD', 'BANK'] },
        },
      },
      ['status']
    );
    expect(output).toContain('status:');
    expect(output).toContain('- PENDING');
    expect(output).not.toContain('payment.type:');
  });

  it('skips fields not present in summary', () => {
    const output = formatSummary(
      { fields: { status: { count: 1, values: ['PENDING'] } } },
      ['status', 'nonexistent']
    );
    expect(output).toContain('status:');
    expect(output).not.toContain('nonexistent:');
  });

  it('returns empty string for empty summary', () => {
    const output = formatSummary({ fields: {} });
    expect(output).toBe('');
  });

  it('formats each field with field name followed by values', () => {
    const output = formatSummary({
      fields: { status: { count: 3, values: ['PRE_PENDING', 'PENDING', 'COMPLETE'] } },
    });
    const lines = output.split('\n');
    expect(lines[0]).toBe('status:');
    expect(lines[1]).toBe('- PRE_PENDING');
    expect(lines[2]).toBe('- PENDING');
    expect(lines[3]).toBe('- COMPLETE');
  });
});

describe('showSummary', () => {
  it('prints to terminal when no --out given', () => {
    const summaryPath = join(TMP_DIR, 'ts-summary.json');
    writeJson(summaryPath, {
      fields: { status: { count: 2, values: ['PENDING', 'COMPLETE'] } },
    });
    const lines: string[] = [];
    const original = console.log;
    console.log = (s: string) => lines.push(s);
    try {
      showSummary({ summaryPath });
    } finally {
      console.log = original;
    }
    expect(lines.join('\n')).toContain('status:');
    expect(lines.join('\n')).toContain('- PENDING');
  });

  it('saves output to .txt file when --out given', () => {
    const summaryPath = join(TMP_DIR, 'ts-summary.json');
    const outPath = join(TMP_DIR, 'ts-summary.txt');
    writeJson(summaryPath, {
      fields: { status: { count: 2, values: ['PENDING', 'COMPLETE'] } },
    });
    showSummary({ summaryPath, outPath });
    expect(existsSync(outPath)).toBe(true);
    const content = readFileSync(outPath, 'utf-8');
    expect(content).toContain('status:');
    expect(content).toContain('- PENDING');
  });

  it('saves output to .md file when --out given', () => {
    const summaryPath = join(TMP_DIR, 'ts-summary.json');
    const outPath = join(TMP_DIR, 'ts-summary.md');
    writeJson(summaryPath, {
      fields: { 'payment.type': { count: 2, values: ['COD', 'BANK'] } },
    });
    showSummary({ summaryPath, outPath });
    expect(existsSync(outPath)).toBe(true);
    const content = readFileSync(outPath, 'utf-8');
    expect(content).toContain('payment.type:');
    expect(content).toContain('- COD');
  });

  it('does not print to terminal when --out given', () => {
    const summaryPath = join(TMP_DIR, 'ts-summary.json');
    const outPath = join(TMP_DIR, 'out.txt');
    writeJson(summaryPath, {
      fields: { status: { count: 1, values: ['COMPLETE'] } },
    });
    const printed: string[] = [];
    const original = console.log;
    console.log = (s: string) => printed.push(s);
    try {
      showSummary({ summaryPath, outPath });
    } finally {
      console.log = original;
    }
    expect(printed).toEqual([`Saved: ${outPath}`]);
  });
});
