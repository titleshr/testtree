import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { readJson } from './read-json';
import type { FixtureSummary } from '../types/fixture-summary';

interface ShowSummaryOptions {
  summaryPath: string;
  fields?: string[];
  outPath?: string;
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
  const summary = readJson(summaryPath) as FixtureSummary;
  const output = formatSummary(summary, fields);

  if (outPath) {
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, output);
    console.log(`Saved: ${outPath}`);
  } else {
    if (output) console.log(output);
  }
}
