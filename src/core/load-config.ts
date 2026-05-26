import { existsSync } from 'fs';
import { join } from 'path';
import { readJson } from './read-json';
import type { TestTreeConfig, ResolvedConfig } from '../types/testtree-config';

export const CONFIG_DEFAULTS: ResolvedConfig = {
  project: './src',
  outputDir: './testtree',
  domain: 'unknown',
  base: './testtree/base-template.json',
  variants: './testtree/variants.json',
  fixtures: './testtree/fixtures',
};

function interpolateEnvVars(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(/\$\{([^}]+)\}/g, (_, varName: string) => {
      const envValue = process.env[varName];
      if (envValue === undefined) {
        throw new Error(`Environment variable "${varName}" is not set`);
      }
      return envValue;
    });
  }
  if (Array.isArray(value)) return value.map(interpolateEnvVars);
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = interpolateEnvVars(val);
    }
    return result;
  }
  return value;
}

export function loadConfig(
  configPath: string,
  cliOverrides: Partial<TestTreeConfig> = {},
  cwd: string = process.cwd()
): ResolvedConfig {
  let fileConfig: Partial<TestTreeConfig> = {};
  if (existsSync(configPath)) {
    fileConfig = interpolateEnvVars(readJson(configPath)) as Partial<TestTreeConfig>;
  }

  const merged: ResolvedConfig = { ...CONFIG_DEFAULTS, ...fileConfig, ...cliOverrides };

  if (merged.project === './src' && !existsSync(join(cwd, 'src'))) {
    merged.project = '.';
  }

  return merged;
}
