import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { readJson } from './read-json';
import type { FixtureSummary } from '../types/fixture-summary';
import type { CoverageSummary } from '../types/coverage-summary';

interface ShowSummaryOptions {
  summaryPath: string;
  fields?: string[];
  outPath?: string;
}

function isCoverageSummary(data: unknown): data is CoverageSummary {
  const first = Object.values((data as CoverageSummary)?.fields ?? {})[0];
  return first != null && 'codeValues' in (first as object);
}

function formatCoverageSummary(summary: CoverageSummary, fields?: string[]): string {
  const allFields = summary?.fields ?? {};
  const fieldPaths = fields && fields.length > 0 ? fields : Object.keys(allFields);
  const parts: string[] = [];

  for (const fieldPath of fieldPaths) {
    const field = allFields[fieldPath];
    if (!field) continue;

    const { covered, total, percent } = field.coverage;
    const missingSet = new Set(field.missingInFixtures.map((v) => JSON.stringify(v)));
    const header = `${fieldPath}: ${percent}% (${covered}/${total})`;
    const lines = [
      header,
      ...field.codeValues.map((v) =>
        missingSet.has(JSON.stringify(v)) ? `  ✗ ${v} (missing)` : `  ✓ ${v}`
      ),
    ];
    parts.push(lines.join('\n'));
  }

  return parts.join('\n\n');
}

export function formatSummary(summary: FixtureSummary, fields?: string[]): string {
  const allFields = summary?.fields ?? {};
  const fieldPaths = fields && fields.length > 0 ? fields : Object.keys(allFields);
  const parts: string[] = [];

  for (const fieldPath of fieldPaths) {
    const field = allFields[fieldPath];
    if (!field) continue;
    const lines = [`${fieldPath}:`, ...field.values.map((v) => `- ${v}`)];
    parts.push(lines.join('\n'));
  }

  return parts.join('\n\n');
}

export function showSummary({ summaryPath, fields, outPath }: ShowSummaryOptions): void {
  const data = readJson(summaryPath);
  const output = isCoverageSummary(data)
    ? formatCoverageSummary(data, fields)
    : formatSummary(data as FixtureSummary, fields);

  if (outPath) {
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, output);
    console.log(`Saved: ${outPath}`);
  } else {
    if (output) console.log(output);
  }
}
