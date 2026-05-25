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

export function loadConfig(
  configPath: string,
  cliOverrides: Partial<TestTreeConfig> = {},
  cwd: string = process.cwd()
): ResolvedConfig {
  let fileConfig: Partial<TestTreeConfig> = {};
  if (existsSync(configPath)) {
    fileConfig = readJson(configPath) as Partial<TestTreeConfig>;
  }

  const merged: ResolvedConfig = { ...CONFIG_DEFAULTS, ...fileConfig, ...cliOverrides };

  if (merged.project === './src' && !existsSync(join(cwd, 'src'))) {
    merged.project = '.';
  }

  return merged;
}
