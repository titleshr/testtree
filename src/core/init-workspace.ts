import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { baseTemplateTemplate } from '../templates/base-template-template';
import { variantsTemplate } from '../templates/variants-template';
import { conditionCatalogTemplate } from '../templates/condition-catalog-template';
import { scenarioPlanTemplate } from '../templates/scenario-plan-template';

interface InitOptions {
  outDir: string;
  force?: boolean;
}

interface WorkspaceFile {
  name: string;
  content: unknown;
}

function getWorkspaceFiles(): WorkspaceFile[] {
  return [
    { name: 'sample.json', content: {} },
    { name: 'condition-catalog.json', content: conditionCatalogTemplate },
    { name: 'scenario-plan.json', content: scenarioPlanTemplate },
    { name: 'base-template.json', content: baseTemplateTemplate },
    { name: 'variants.json', content: variantsTemplate },
  ];
}

export function initWorkspace(options: InitOptions): void {
  const { outDir, force = false } = options;

  mkdirSync(outDir, { recursive: true });

  const files = getWorkspaceFiles();
  const created: string[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    const filePath = join(outDir, file.name);
    if (existsSync(filePath) && !force) {
      skipped.push(file.name);
      continue;
    }
    writeFileSync(filePath, JSON.stringify(file.content, null, 2) + '\n', 'utf-8');
    created.push(file.name);
  }

  if (created.length > 0) {
    console.log(`Created: ${created.join(', ')}`);
  }
  if (skipped.length > 0) {
    console.log(`Skipped (already exists): ${skipped.join(', ')} — use --force to overwrite`);
  }
}
