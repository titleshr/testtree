import { readJson } from './read-json';
import { writeJson } from './write-json';
import type { CoverageSummary } from '../types/coverage-summary';
import type { FixtureSummary } from '../types/fixture-summary';

interface SuggestedVariant {
  name: string;
  purpose: string;
  patch: Record<string, unknown>;
}

interface SuggestVariantsOptions {
  coveragePath: string;
  outPath?: string;
  fields?: string[];
  dbSummaryPath?: string;
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

function loadDbValues(dbSummaryPath: string | undefined): Map<string, Set<string>> {
  if (!dbSummaryPath) return new Map();
  try {
    const db = readJson(dbSummaryPath) as FixtureSummary;
    const map = new Map<string, Set<string>>();
    for (const [field, data] of Object.entries(db?.fields ?? {})) {
      map.set(field, new Set(data.values.map((v) => JSON.stringify(v))));
    }
    return map;
  } catch {
    return new Map();
  }
}

function resolveSource(value: unknown, fieldPath: string, dbValues: Map<string, Set<string>>): string {
  const key = JSON.stringify(value);
  const inDb = dbValues.get(fieldPath)?.has(key) ?? false;
  return inDb ? 'db' : 'code';
}

export function suggestVariants({ coveragePath, outPath, fields, dbSummaryPath }: SuggestVariantsOptions): void {
  const coverage = readJson(coveragePath) as CoverageSummary;
  const dbValues = loadDbValues(dbSummaryPath);
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

  if (suggested.length === 0) {
    console.log('No missing variants suggested.');
  } else {
    console.log(`\nSuggested ${suggested.length} variant(s):`);
    for (const v of suggested) {
      const source = resolveSource(v.patch[Object.keys(v.patch)[0]], Object.keys(v.patch)[0], dbValues);
      console.log(`  • ${v.name} — ${v.purpose}  [${source}]`);
    }
  }

  if (outPath) {
    writeJson(outPath, suggested);
    console.log(`\nWritten to ${outPath}`);
  }
}
