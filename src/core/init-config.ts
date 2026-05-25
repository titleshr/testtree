import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { writeJson } from './write-json';
import { CONFIG_DEFAULTS } from './load-config';
import { baseTemplateTemplate } from '../templates/base-template-template';
import { variantsTemplate } from '../templates/variants-template';

interface InitConfigOptions {
  force?: boolean;
  cwd?: string;
}

export function initConfig({ force = false, cwd = process.cwd() }: InitConfigOptions = {}): void {
  const created: string[] = [];
  const skipped: string[] = [];

  const configPath = join(cwd, 'testtree.config.json');
  const outputDir = join(cwd, CONFIG_DEFAULTS.outputDir);
  const basePath = join(cwd, CONFIG_DEFAULTS.base);
  const variantsPath = join(cwd, CONFIG_DEFAULTS.variants);
  const fixturesDir = join(cwd, CONFIG_DEFAULTS.fixtures);

  function writeFile(filePath: string, content: unknown) {
    if (!force && existsSync(filePath)) {
      skipped.push(filePath);
      return;
    }
    mkdirSync(dirname(filePath), { recursive: true });
    writeJson(filePath, content);
    created.push(filePath);
  }

  writeFile(configPath, CONFIG_DEFAULTS);
  mkdirSync(outputDir, { recursive: true });
  writeFile(basePath, baseTemplateTemplate);
  writeFile(variantsPath, variantsTemplate);
  mkdirSync(fixturesDir, { recursive: true });

  const rel = (p: string) => p.replace(cwd + '/', '');
  if (created.length > 0) console.log(`Created: ${created.map(rel).join(', ')}`);
  if (skipped.length > 0) console.log(`Skipped (already exists): ${skipped.map(rel).join(', ')} — use --force to overwrite`);
}
