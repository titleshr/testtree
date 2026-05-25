import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { initWorkspace } from '../src/core/init-workspace';

const TMP_DIR = join(__dirname, '__tmp_init__');

const EXPECTED_FILES = [
  'sample.json',
  'condition-catalog.json',
  'scenario-plan.json',
  'base-template.json',
  'variants.json',
];

beforeEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true });
});

afterEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true });
});

describe('initWorkspace', () => {
  it('creates all workflow files in the output directory', () => {
    initWorkspace({ outDir: TMP_DIR });
    for (const file of EXPECTED_FILES) {
      expect(existsSync(join(TMP_DIR, file))).toBe(true);
    }
  });

  it('creates the output directory if it does not exist', () => {
    expect(existsSync(TMP_DIR)).toBe(false);
    initWorkspace({ outDir: TMP_DIR });
    expect(existsSync(TMP_DIR)).toBe(true);
  });

  it('does not overwrite existing files without --force', () => {
    mkdirSync(TMP_DIR, { recursive: true });
    const existingContent = '{"existing": true}\n';
    writeFileSync(join(TMP_DIR, 'sample.json'), existingContent, 'utf-8');

    initWorkspace({ outDir: TMP_DIR });

    const content = readFileSync(join(TMP_DIR, 'sample.json'), 'utf-8');
    expect(content).toBe(existingContent);
  });

  it('overwrites existing files when force is true', () => {
    mkdirSync(TMP_DIR, { recursive: true });
    writeFileSync(join(TMP_DIR, 'sample.json'), '{"existing": true}\n', 'utf-8');

    initWorkspace({ outDir: TMP_DIR, force: true });

    const content = JSON.parse(readFileSync(join(TMP_DIR, 'sample.json'), 'utf-8'));
    expect(content).toEqual({});
  });
});
