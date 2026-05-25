import { join } from 'path';
import { mkdirSync } from 'fs';
import { readJson } from './read-json';
import { writeJson } from './write-json';
import { applyPatch } from './apply-patch';
import { variantsSchema } from '../validation/variant-schema';
import type { GeneratorOptions } from '../types/generator-options';

export function generateFixtures(options: GeneratorOptions): void {
  const { basePath, variantsPath, outDir } = options;

  const base = readJson(basePath);
  const rawVariants = readJson(variantsPath);

  const result = variantsSchema.safeParse(rawVariants);
  if (!result.success) {
    throw new Error(`Invalid variants.json: ${result.error.message}`);
  }

  const variants = result.data;

  mkdirSync(outDir, { recursive: true });

  for (const variant of variants) {
    const fixture = applyPatch(base, variant.patch);
    const outPath = join(outDir, `${variant.name}.json`);
    writeJson(outPath, fixture);
  }

  console.log(`Generated ${variants.length} fixture(s) in ${outDir}`);
}
