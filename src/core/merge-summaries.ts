import { readJson } from './read-json';
import { writeJson } from './write-json';
import type { FixtureSummary } from '../types/fixture-summary';
import type { CoverageSummary, CoverageField } from '../types/coverage-summary';

interface MergeSummariesOptions {
  codeSummaryPath: string;
  fixtureSummaryPath: string;
  dbSummaryPath?: string;
  outPath: string;
}

function toStringSet(values: unknown[]): Set<string> {
  return new Set(values.map((v) => JSON.stringify(v)));
}

function computeCoverageField(codeValues: unknown[], fixtureValues: unknown[]): CoverageField {
  const codeSet = toStringSet(codeValues);
  const fixtureSet = toStringSet(fixtureValues);

  const missingInFixtures = codeValues.filter((v) => !fixtureSet.has(JSON.stringify(v)));
  const extraInFixtures = fixtureValues.filter((v) => !codeSet.has(JSON.stringify(v)));

  const covered = codeValues.filter((v) => fixtureSet.has(JSON.stringify(v))).length;
  const total = codeValues.length;
  const percent = total > 0 ? Math.round((covered / total) * 10000) / 100 : 0;

  return {
    codeValues,
    fixtureValues,
    missingInFixtures,
    extraInFixtures,
    coverage: { covered, total, percent },
  };
}

export function mergeSummaries(options: MergeSummariesOptions): void {
  const { codeSummaryPath, fixtureSummaryPath, dbSummaryPath, outPath } = options;

  const codeSummary = readJson(codeSummaryPath) as FixtureSummary;
  const fixtureSummary = readJson(fixtureSummaryPath) as FixtureSummary;

  // Clone to avoid mutating the parsed object
  const codeFields: FixtureSummary['fields'] = JSON.parse(JSON.stringify(codeSummary?.fields ?? {}));
  const fixtureFields = fixtureSummary?.fields ?? {};

  // Merge db values into code values so db-discovered values are also covered by fixtures
  if (dbSummaryPath) {
    try {
      const dbSummary = readJson(dbSummaryPath) as FixtureSummary;
      for (const [fieldPath, fieldData] of Object.entries(dbSummary?.fields ?? {})) {
        if (!codeFields[fieldPath]) codeFields[fieldPath] = { count: 0, values: [] };
        const existing = new Set(codeFields[fieldPath].values.map((v) => JSON.stringify(v)));
        for (const v of fieldData.values) {
          if (!existing.has(JSON.stringify(v))) {
            codeFields[fieldPath].values.push(v);
            existing.add(JSON.stringify(v));
          }
        }
      }
    } catch {
      // skip if db summary is unavailable
    }
  }

  const allFieldPaths = new Set([...Object.keys(codeFields), ...Object.keys(fixtureFields)]);

  const result: CoverageSummary = { fields: {} };

  for (const fieldPath of allFieldPaths) {
    const codeValues = codeFields[fieldPath]?.values ?? [];
    const fixtureValues = fixtureFields[fieldPath]?.values ?? [];
    result.fields[fieldPath] = computeCoverageField(codeValues, fixtureValues);
  }

  writeJson(outPath, result);

  const codeCount = Object.keys(codeFields).length;
  const fixtureCount = Object.keys(fixtureFields).length;
  console.log(`Loaded ${codeCount} code field(s)`);
  console.log(`Loaded ${fixtureCount} fixture field(s)`);
  console.log(`Coverage summary generated`);
  console.log(`Output: ${outPath}`);
}
