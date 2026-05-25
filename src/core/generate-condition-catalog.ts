import { readJson } from './read-json';
import { writeJson } from './write-json';
import type { FixtureSummary } from '../types/fixture-summary';
import type { ConditionCatalog, ConditionField } from '../types/condition-catalog';

interface CatalogOptions {
  summaryPath: string;
  outPath: string;
  domain: string;
}

export function generateConditionCatalog(options: CatalogOptions): void {
  const { summaryPath, outPath, domain } = options;

  const summary = readJson(summaryPath) as FixtureSummary;

  const fields: ConditionField[] = Object.entries(summary.fields).map(([fieldPath, fieldSummary]) => ({
    fieldPath,
    sampleValue: fieldSummary.values[0] ?? null,
    possibleValues: fieldSummary.values,
    sources: ['fixtures'],
    isConditionField: fieldSummary.count > 1,
    notes: '',
  }));

  const catalog: ConditionCatalog = { domain, fields };

  writeJson(outPath, catalog);
  console.log(`Generated condition catalog with ${fields.length} field(s) written to ${outPath}`);
}
