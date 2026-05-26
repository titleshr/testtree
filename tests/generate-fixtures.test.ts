import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { generateFixtures } from '../src/core/generate-fixtures';
import { writeJson } from '../src/core/write-json';

const TMP_DIR = join(__dirname, '__tmp_generate__');
const BASE_PATH = join(TMP_DIR, 'base-template.json');
const VARIANTS_PATH = join(TMP_DIR, 'variants.json');
const OUT_DIR = join(TMP_DIR, 'fixtures');

const sampleBase = {
  status: 'PENDING',
  payment: { type: 'COD', balance: 250 },
};

const sampleVariants = [
  {
    name: 'variant_complete',
    purpose: 'Complete order',
    patch: { status: 'COMPLETE' },
  },
  {
    name: 'variant_bank',
    purpose: 'Bank payment',
    patch: { 'payment.type': 'BANK', 'payment.balance': 100 },
  },
];

beforeEach(() => {
  mkdirSync(TMP_DIR, { recursive: true });
  writeJson(BASE_PATH, sampleBase);
  writeJson(VARIANTS_PATH, sampleVariants);
});

afterEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true });
});

describe('generateFixtures', () => {
  it('generates the correct number of fixture files', () => {
    generateFixtures({ basePath: BASE_PATH, variantsPath: VARIANTS_PATH, outDir: OUT_DIR });
    const files = readdirSync(OUT_DIR);
    expect(files.length).toBe(2);
  });

  it('generates files with correct names', () => {
    generateFixtures({ basePath: BASE_PATH, variantsPath: VARIANTS_PATH, outDir: OUT_DIR });
    const files = readdirSync(OUT_DIR);
    expect(files).toContain('variant_complete.json');
    expect(files).toContain('variant_bank.json');
  });

  it('applies patch correctly to fixture content', () => {
    generateFixtures({ basePath: BASE_PATH, variantsPath: VARIANTS_PATH, outDir: OUT_DIR });
    const fixture = JSON.parse(readFileSync(join(OUT_DIR, 'variant_complete.json'), 'utf-8'));
    expect(fixture.status).toBe('COMPLETE');
    expect(fixture.payment.type).toBe('COD');
  });

  it('throws when a variant has no name', () => {
    const invalidVariants = [{ patch: { status: 'COMPLETE' } }];
    writeJson(VARIANTS_PATH, invalidVariants);
    expect(() =>
      generateFixtures({ basePath: BASE_PATH, variantsPath: VARIANTS_PATH, outDir: OUT_DIR })
    ).toThrow();
  });

  it('throws when patch is not an object', () => {
    const invalidVariants = [{ name: 'bad', patch: 'not-an-object' }];
    writeJson(VARIANTS_PATH, invalidVariants);
    expect(() =>
      generateFixtures({ basePath: BASE_PATH, variantsPath: VARIANTS_PATH, outDir: OUT_DIR })
    ).toThrow();
  });

  it('throws when two variants share the same name', () => {
    const duplicateVariants = [
      { name: 'channel_facebook_case', purpose: 'uppercase', patch: { channel: 'FACEBOOK' } },
      { name: 'channel_facebook_case', purpose: 'lowercase', patch: { channel: 'facebook' } },
    ];
    writeJson(VARIANTS_PATH, duplicateVariants);
    expect(() =>
      generateFixtures({ basePath: BASE_PATH, variantsPath: VARIANTS_PATH, outDir: OUT_DIR })
    ).toThrow('Duplicate variant name "channel_facebook_case"');
  });

  it('creates the output directory if it does not exist', () => {
    expect(existsSync(OUT_DIR)).toBe(false);
    generateFixtures({ basePath: BASE_PATH, variantsPath: VARIANTS_PATH, outDir: OUT_DIR });
    expect(existsSync(OUT_DIR)).toBe(true);
  });
});
