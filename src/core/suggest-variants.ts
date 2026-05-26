import { readJson } from './read-json';
import { writeJson } from './write-json';
import type { CoverageSummary } from '../types/coverage-summary';

interface SuggestedVariant {
  name: string;
  purpose: string;
  patch: Record<string, unknown>;
}

interface SuggestVariantsOptions {
  coveragePath: string;
  outPath?: string;
  fields?: string[];
}

function toSnakeCase(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function buildVariantName(fieldPath: string, value: unknown): string {
  const fieldPart = toSnakeCase(fieldPath);
  const valuePart = toSnakeCase(String(value));
  return `${fieldPart}_${valuePart}_case`;
}

export function suggestVariants({ coveragePath, outPath, fields }: SuggestVariantsOptions): void {
  const coverage = readJson(coveragePath) as CoverageSummary;
  const suggested: SuggestedVariant[] = [];
  const fieldFilter = fields && fields.length > 0 ? new Set(fields) : null;

  for (const [fieldPath, field] of Object.entries(coverage.fields)) {
    if (fieldFilter && !fieldFilter.has(fieldPath)) continue;
    for (const value of field.missingInFixtures) {
      suggested.push({
        name: buildVariantName(fieldPath, value),
        purpose: `Cover missing value ${fieldPath}=${String(value)}`,
        patch: { [fieldPath]: value },
      });
    }
  }

  if (outPath) {
    writeJson(outPath, suggested);
    console.log(`Suggested ${suggested.length} variant(s): ${outPath}`);
  } else if (suggested.length === 0) {
    console.log('No missing variants suggested.');
  } else {
    console.log(`\nSuggested ${suggested.length} variant(s):`);
    for (const v of suggested) {
      console.log(`  • ${v.name} — ${v.purpose}`);
    }
  }
}
