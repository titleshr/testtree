import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

describe('loadConfig — env interpolation', () => {
  beforeEach(() => {
    vi.stubEnv('MONGO_URI', 'mongodb://localhost:27017');
    vi.stubEnv('MY_DB', 'order_service_db');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('replaces ${VAR} with the environment variable value', () => {
    const configPath = join(TMP_DIR, 'testtree.config.json');
    writeFileSync(configPath, JSON.stringify({
      db: { uri: '${MONGO_URI}', database: 'mydb', collection: 'orders', fields: [] },
    }));
    const config = loadConfig(configPath, {}, TMP_DIR);
    expect(config.db?.uri).toBe('mongodb://localhost:27017');
  });

  it('interpolates multiple different variables in the same config', () => {
    const configPath = join(TMP_DIR, 'testtree.config.json');
    writeFileSync(configPath, JSON.stringify({
      db: { uri: '${MONGO_URI}', database: '${MY_DB}', collection: 'orders', fields: [] },
    }));
    const config = loadConfig(configPath, {}, TMP_DIR);
    expect(config.db?.uri).toBe('mongodb://localhost:27017');
    expect(config.db?.database).toBe('order_service_db');
  });

  it('interpolates variables inside nested objects (db config)', () => {
    const configPath = join(TMP_DIR, 'testtree.config.json');
    writeFileSync(configPath, JSON.stringify({
      db: {
        uri: '${MONGO_URI}',
        database: 'mydb',
        collection: 'orders',
        fields: ['status'],
      },
    }));
    const config = loadConfig(configPath, {}, TMP_DIR);
    expect(config.db?.uri).toBe('mongodb://localhost:27017');
    expect(config.db?.fields).toEqual(['status']);
  });

  it('leaves plain strings without ${} unchanged', () => {
    const configPath = join(TMP_DIR, 'testtree.config.json');
    writeFileSync(configPath, JSON.stringify({ domain: 'order' }));
    const config = loadConfig(configPath, {}, TMP_DIR);
    expect(config.domain).toBe('order');
  });

  it('throws a clear error when the referenced env variable is not set', () => {
    const configPath = join(TMP_DIR, 'testtree.config.json');
    writeFileSync(configPath, JSON.stringify({
      db: { uri: '${UNSET_VAR}', database: 'mydb', collection: 'orders', fields: [] },
    }));
    expect(() => loadConfig(configPath, {}, TMP_DIR)).toThrow(
      'Environment variable "UNSET_VAR" is not set'
    );
  });
});
