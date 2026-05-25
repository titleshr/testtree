import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { initConfig } from '../src/core/init-config';

const TMP_DIR = join(__dirname, '__tmp_init_config__');

beforeEach(() => {
  mkdirSync(TMP_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true });
});

describe('initConfig', () => {
  it('creates testtree.config.json', () => {
    initConfig({ cwd: TMP_DIR });
    expect(existsSync(join(TMP_DIR, 'testtree.config.json'))).toBe(true);
  });

  it('creates outputDir', () => {
    initConfig({ cwd: TMP_DIR });
    expect(existsSync(join(TMP_DIR, 'testtree'))).toBe(true);
  });

  it('creates base-template.json', () => {
    initConfig({ cwd: TMP_DIR });
    expect(existsSync(join(TMP_DIR, 'testtree', 'base-template.json'))).toBe(true);
  });

  it('creates variants.json', () => {
    initConfig({ cwd: TMP_DIR });
    expect(existsSync(join(TMP_DIR, 'testtree', 'variants.json'))).toBe(true);
  });

  it('creates fixtures folder', () => {
    initConfig({ cwd: TMP_DIR });
    expect(existsSync(join(TMP_DIR, 'testtree', 'fixtures'))).toBe(true);
  });

  it('does not overwrite existing files without --force', () => {
    const configPath = join(TMP_DIR, 'testtree.config.json');
    writeFileSync(configPath, JSON.stringify({ domain: 'original' }));
    initConfig({ cwd: TMP_DIR, force: false });
    const content = JSON.parse(readFileSync(configPath, 'utf-8'));
    expect(content.domain).toBe('original');
  });

  it('overwrites existing files with --force', () => {
    const configPath = join(TMP_DIR, 'testtree.config.json');
    writeFileSync(configPath, JSON.stringify({ domain: 'original' }));
    initConfig({ cwd: TMP_DIR, force: true });
    const content = JSON.parse(readFileSync(configPath, 'utf-8'));
    expect(content.domain).not.toBe('original');
  });
});
