import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { loadConfig } from '../src/core/load-config';

const TMP_DIR = join(__dirname, '__tmp_load_config__');

beforeEach(() => {
  mkdirSync(TMP_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true });
});

describe('loadConfig', () => {
  it('loads config values from file', () => {
    const configPath = join(TMP_DIR, 'testtree.config.json');
    writeFileSync(configPath, JSON.stringify({ domain: 'order', outputDir: './my-output' }));
    const config = loadConfig(configPath, {}, TMP_DIR);
    expect(config.domain).toBe('order');
    expect(config.outputDir).toBe('./my-output');
  });

  it('uses defaults when config file is missing', () => {
    const configPath = join(TMP_DIR, 'missing.config.json');
    mkdirSync(join(TMP_DIR, 'src'), { recursive: true });
    const config = loadConfig(configPath, {}, TMP_DIR);
    expect(config.domain).toBe('unknown');
    expect(config.outputDir).toBe('./testtree');
    expect(config.project).toBe('./src');
  });

  it('CLI options override config values', () => {
    const configPath = join(TMP_DIR, 'testtree.config.json');
    writeFileSync(configPath, JSON.stringify({ domain: 'order' }));
    const config = loadConfig(configPath, { domain: 'user' }, TMP_DIR);
    expect(config.domain).toBe('user');
  });

  it('config values override defaults', () => {
    const configPath = join(TMP_DIR, 'testtree.config.json');
    writeFileSync(configPath, JSON.stringify({ base: './custom/base.json' }));
    const config = loadConfig(configPath, {}, TMP_DIR);
    expect(config.base).toBe('./custom/base.json');
  });

  it('fallback project to "." when ./src is missing', () => {
    const configPath = join(TMP_DIR, 'missing.config.json');
    const config = loadConfig(configPath, {}, TMP_DIR);
    expect(config.project).toBe('.');
  });
});
