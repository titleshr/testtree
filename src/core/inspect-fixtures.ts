import { readdirSync } from 'fs';
import { join } from 'path';
import { readJson } from './read-json';
import { writeJson } from './write-json';
import { flattenObject } from './flatten-object';
import type { FixtureSummary } from '../types/fixture-summary';

interface InspectOptions {
  fixturesDir: string;
  outPath: string;
}

export function inspectFixtures(options: InspectOptions): void {
  const { fixturesDir, outPath } = options;

  const files = readdirSync(fixturesDir).filter((f) => f.endsWith('.json'));

  if (files.length === 0) {
    console.log('No fixture files found.');
    return;
  }

  const fieldValues: Record<string, Set<unknown>> = {};

  for (const file of files) {
    const data = readJson(join(fixturesDir, file));
    const flat = flattenObject(data);

    for (const [path, value] of Object.entries(flat)) {
      if (!fieldValues[path]) {
        fieldValues[path] = new Set();
      }
      fieldValues[path].add(value);
    }
  }

  const summary: FixtureSummary = { fields: {} };

  for (const [path, valueSet] of Object.entries(fieldValues)) {
    const values = Array.from(valueSet);
    summary.fields[path] = {
      count: values.length,
      values,
    };
  }

  writeJson(outPath, summary);

  const fieldCount = Object.keys(summary.fields).length;
  console.log(`Inspected ${files.length} fixture(s). Found ${fieldCount} field(s). Summary written to ${outPath}`);
}
