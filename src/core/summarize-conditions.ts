import { readJson } from './read-json';
import { writeJson } from './write-json';
import type { CodeScanResult, CodeCondition } from '../types/code-condition';
import type { FixtureSummary } from '../types/fixture-summary';

interface SummarizeConditionsOptions {
  conditionsPath: string;
  outPath: string;
}

function isValidCondition(c: unknown): c is CodeCondition {
  if (!c || typeof c !== 'object') return false;
  const obj = c as Record<string, unknown>;
  return typeof obj['fieldPath'] === 'string' && obj['fieldPath'].length > 0 &&
         typeof obj['value'] === 'string';
}

export function summarizeConditions(options: SummarizeConditionsOptions): void {
  const { conditionsPath, outPath } = options;

  const raw = readJson(conditionsPath) as CodeScanResult;
  const conditions = Array.isArray(raw?.conditions) ? raw.conditions : [];

  const fieldValues: Record<string, Set<string>> = {};

  for (const condition of conditions) {
    if (!isValidCondition(condition)) continue;
    if (!fieldValues[condition.fieldPath]) {
      fieldValues[condition.fieldPath] = new Set();
    }
    fieldValues[condition.fieldPath].add(condition.value);
  }

  const summary: FixtureSummary = { fields: {} };

  for (const [fieldPath, valueSet] of Object.entries(fieldValues)) {
    const values = Array.from(valueSet);
    summary.fields[fieldPath] = {
      count: values.length,
      values,
    };
  }

  writeJson(outPath, summary);

  const fieldCount = Object.keys(summary.fields).length;
  console.log(`Summarized ${conditions.length} condition(s) into ${fieldCount} field(s) written to ${outPath}`);
}
